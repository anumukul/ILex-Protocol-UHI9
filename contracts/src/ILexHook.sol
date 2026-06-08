// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {IUnlockCallback} from "@uniswap/v4-core/src/interfaces/callback/IUnlockCallback.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {BalanceDelta} from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import {BeforeSwapDelta} from "@uniswap/v4-core/src/types/BeforeSwapDelta.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {StateLibrary} from "@uniswap/v4-core/src/libraries/StateLibrary.sol";
import {TickMath} from "@uniswap/v4-core/src/libraries/TickMath.sol";

import {LiquidityAmounts} from "@uniswap/v4-periphery/src/libraries/LiquidityAmounts.sol";

import {ILMath} from "./libraries/ILMath.sol";
import {ILendingPool} from "./interfaces/ILendingPool.sol";

contract ILexHook is IHooks, IUnlockCallback, ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;
    using PoolIdLibrary for PoolKey;
    using StateLibrary for IPoolManager;

    IPoolManager public immutable poolManager;
    ILendingPool public immutable lendingPool;
    address public immutable callbackProxy;
    address public authorizedRvmId;

    enum PositionStatus { NONE, ACTIVE, EXITING, EXITED, REENTERING }

    struct LPPosition {
        PoolKey poolKey;
        int24 tickLower;
        int24 tickUpper;
        uint128 liquidity;
        uint160 entrySqrtPriceX96;
        uint256 ilThresholdBps;
        uint256 reentryToleranceBps;
        PositionStatus status;
        uint256 depositTimestamp;
    }

    struct ParkedFunds {
        uint256 token0Deposited;
        uint256 token1Deposited;
        uint256 depositTimestamp;
    }

    mapping(address => LPPosition) public positions;
    mapping(address => ParkedFunds) public parkedFunds;

    uint256 public constant MAX_IL_THRESHOLD_BPS = 5000;
    uint256 public constant MIN_IL_THRESHOLD_BPS = 50;
    uint256 public constant MAX_REENTRY_BPS = 1000;
    uint64  public constant CALLBACK_GAS_LIMIT = 500_000;

    event PositionCreated(
        address indexed lp,
        uint160 entrySqrtPriceX96,
        uint256 ilThresholdBps,
        uint256 reentryToleranceBps,
        int24 tickLower,
        int24 tickUpper,
        uint256 token0Amount,
        uint256 token1Amount
    );

    event PositionExited(
        address indexed lp,
        uint160 exitSqrtPriceX96,
        uint256 ilAtExitBps,
        uint256 token0Parked,
        uint256 token1Parked,
        uint256 timestamp
    );

    event PositionReentered(
        address indexed lp,
        uint160 reentryPriceX96,
        uint256 yieldEarned0,
        uint256 yieldEarned1,
        uint256 timestamp
    );

    event ManualExit(
        address indexed lp,
        uint256 token0Returned,
        uint256 token1Returned,
        PositionStatus statusAtExit
    );

    event RvmIdSet(address indexed rvmId);

    event PriceUpdate(
        bytes32 indexed poolId,
        uint160 sqrtPriceX96,
        int24 tick
    );

    error NotCallbackProxy();
    error NotAuthorizedRvm();
    error NoActivePosition();
    error PositionAlreadyExists();
    error InvalidThreshold();
    error InvalidReentryTolerance();
    error RvmIdAlreadySet();
    error PoolNotInitialized();
    error ZeroAmount();
    error ExitAlreadyTriggered();
    error ReentryAlreadyTriggered();
    error NothingToReenter();

    modifier onlyCallbackProxy() {
        if (msg.sender != callbackProxy) revert NotCallbackProxy();
        _;
    }

    modifier onlyAuthorizedRvm(address rvm_id) {
        if (rvm_id != authorizedRvmId) revert NotAuthorizedRvm();
        _;
    }

    modifier hasPosition(address lp) {
        if (positions[lp].status == PositionStatus.NONE) revert NoActivePosition();
        _;
    }

    constructor(
        IPoolManager _poolManager,
        ILendingPool _lendingPool,
        address _callbackProxy,
        address _owner
    ) Ownable(_owner) {
        poolManager = _poolManager;
        lendingPool = _lendingPool;
        callbackProxy = _callbackProxy;
    }

    function setAuthorizedRvmId(address rvmId) external onlyOwner {
        if (authorizedRvmId != address(0)) revert RvmIdAlreadySet();
        authorizedRvmId = rvmId;
        emit RvmIdSet(rvmId);
    }

    function deposit(
        PoolKey calldata key,
        int24 tickLower,
        int24 tickUpper,
        uint256 amount0Desired,
        uint256 amount1Desired,
        uint256 ilThresholdBps,
        uint256 reentryToleranceBps
    ) external nonReentrant returns (uint128 liquidity) {
        if (positions[msg.sender].status != PositionStatus.NONE) revert PositionAlreadyExists();
        if (ilThresholdBps < MIN_IL_THRESHOLD_BPS || ilThresholdBps > MAX_IL_THRESHOLD_BPS) revert InvalidThreshold();
        if (reentryToleranceBps > MAX_REENTRY_BPS) revert InvalidReentryTolerance();
        if (amount0Desired == 0 && amount1Desired == 0) revert ZeroAmount();

        address token0 = Currency.unwrap(key.currency0);
        address token1 = Currency.unwrap(key.currency1);

        IERC20(token0).safeTransferFrom(msg.sender, address(this), amount0Desired);
        IERC20(token1).safeTransferFrom(msg.sender, address(this), amount1Desired);

        (uint160 sqrtPriceX96, , , ) = poolManager.getSlot0(key.toId());
        if (sqrtPriceX96 == 0) revert PoolNotInitialized();

        uint160 sqrtPriceAX96 = TickMath.getSqrtPriceAtTick(tickLower);
        uint160 sqrtPriceBX96 = TickMath.getSqrtPriceAtTick(tickUpper);

        liquidity = LiquidityAmounts.getLiquidityForAmounts(
            sqrtPriceX96, sqrtPriceAX96, sqrtPriceBX96, amount0Desired, amount1Desired
        );

        poolManager.unlock(
            abi.encode(UnlockAction.ADD, key.currency0, key.currency1, key.fee, key.tickSpacing, key.hooks, tickLower, tickUpper, liquidity, msg.sender)
        );

        uint256 amount0Used = amount0Desired - IERC20(token0).balanceOf(address(this));
        uint256 amount1Used = amount1Desired - IERC20(token1).balanceOf(address(this));

        if (amount0Desired > amount0Used) IERC20(token0).safeTransfer(msg.sender, amount0Desired - amount0Used);
        if (amount1Desired > amount1Used) IERC20(token1).safeTransfer(msg.sender, amount1Desired - amount1Used);

        positions[msg.sender] = LPPosition({
            poolKey: key,
            tickLower: tickLower,
            tickUpper: tickUpper,
            liquidity: liquidity,
            entrySqrtPriceX96: sqrtPriceX96,
            ilThresholdBps: ilThresholdBps,
            reentryToleranceBps: reentryToleranceBps,
            status: PositionStatus.ACTIVE,
            depositTimestamp: block.timestamp
        });

        emit PositionCreated(msg.sender, sqrtPriceX96, ilThresholdBps, reentryToleranceBps, tickLower, tickUpper, amount0Used, amount1Used);
    }

    function afterSwap(
        address,
        PoolKey calldata key,
        IPoolManager.SwapParams calldata,
        BalanceDelta,
        bytes calldata
    ) external override returns (bytes4, int128) {
        (uint160 sqrtPriceX96, int24 tick, , ) = poolManager.getSlot0(key.toId());
        emit PriceUpdate(PoolId.unwrap(key.toId()), sqrtPriceX96, tick);
        return (IHooks.afterSwap.selector, 0);
    }

    function triggerExit(address rvm_id, address lp) external nonReentrant onlyCallbackProxy onlyAuthorizedRvm(rvm_id) {
        if (positions[lp].status != PositionStatus.ACTIVE) revert ExitAlreadyTriggered();

        positions[lp].status = PositionStatus.EXITING;

        (uint160 currentSqrtPrice, , , ) = poolManager.getSlot0(positions[lp].poolKey.toId());
        uint256 ilBps = ILMath.calculateIL(positions[lp].entrySqrtPriceX96, currentSqrtPrice);

        (
            uint256 token0Amount,
            uint256 token1Amount
        ) = _removeLiquidity(lp);

        address token0 = Currency.unwrap(positions[lp].poolKey.currency0);
        address token1 = Currency.unwrap(positions[lp].poolKey.currency1);

        IERC20(token0).approve(address(lendingPool), token0Amount);
        IERC20(token1).approve(address(lendingPool), token1Amount);
        lendingPool.supply(token0, token0Amount);
        lendingPool.supply(token1, token1Amount);

        parkedFunds[lp] = ParkedFunds({
            token0Deposited: token0Amount,
            token1Deposited: token1Amount,
            depositTimestamp: block.timestamp
        });

        positions[lp].liquidity = 0;
        positions[lp].status = PositionStatus.EXITED;

        emit PositionExited(lp, currentSqrtPrice, ilBps, token0Amount, token1Amount, block.timestamp);
    }

    function triggerReentry(address rvm_id, address lp) external nonReentrant onlyCallbackProxy onlyAuthorizedRvm(rvm_id) {
        if (positions[lp].status != PositionStatus.EXITED) revert ReentryAlreadyTriggered();
        if (parkedFunds[lp].token0Deposited == 0 && parkedFunds[lp].token1Deposited == 0) revert NothingToReenter();

        positions[lp].status = PositionStatus.REENTERING;

        address token0 = Currency.unwrap(positions[lp].poolKey.currency0);
        address token1 = Currency.unwrap(positions[lp].poolKey.currency1);

        uint256 token0Withdrawn = lendingPool.withdraw(token0, parkedFunds[lp].token0Deposited);
        uint256 token1Withdrawn = lendingPool.withdraw(token1, parkedFunds[lp].token1Deposited);

        uint256 yieldEarned0 = token0Withdrawn - parkedFunds[lp].token0Deposited;
        uint256 yieldEarned1 = token1Withdrawn - parkedFunds[lp].token1Deposited;

        (uint160 currentSqrtPrice, , , ) = poolManager.getSlot0(positions[lp].poolKey.toId());

        uint160 sqrtPriceAX96 = TickMath.getSqrtPriceAtTick(positions[lp].tickLower);
        uint160 sqrtPriceBX96 = TickMath.getSqrtPriceAtTick(positions[lp].tickUpper);

        uint128 newLiquidity = LiquidityAmounts.getLiquidityForAmounts(
            currentSqrtPrice, sqrtPriceAX96, sqrtPriceBX96, token0Withdrawn, token1Withdrawn
        );

        IERC20(token0).approve(address(poolManager), token0Withdrawn);
        IERC20(token1).approve(address(poolManager), token1Withdrawn);

        poolManager.unlock(
            abi.encode(
                UnlockAction.ADD,
                positions[lp].poolKey.currency0,
                positions[lp].poolKey.currency1,
                positions[lp].poolKey.fee,
                positions[lp].poolKey.tickSpacing,
                positions[lp].poolKey.hooks,
                positions[lp].tickLower,
                positions[lp].tickUpper,
                newLiquidity,
                lp
            )
        );

        uint256 token0Remaining = IERC20(token0).balanceOf(address(this));
        uint256 token1Remaining = IERC20(token1).balanceOf(address(this));
        if (token0Remaining > 0) IERC20(token0).safeTransfer(lp, token0Remaining);
        if (token1Remaining > 0) IERC20(token1).safeTransfer(lp, token1Remaining);

        delete parkedFunds[lp];

        positions[lp].status = PositionStatus.ACTIVE;
        positions[lp].entrySqrtPriceX96 = currentSqrtPrice;
        positions[lp].liquidity = newLiquidity;

        emit PositionReentered(lp, currentSqrtPrice, yieldEarned0, yieldEarned1, block.timestamp);
    }

    function manualExit() external nonReentrant hasPosition(msg.sender) {
        address lp = msg.sender;
        PositionStatus currentStatus = positions[lp].status;

        uint256 token0Returned;
        uint256 token1Returned;

        if (currentStatus == PositionStatus.EXITING) {
            revert ExitAlreadyTriggered();
        }

        address token0 = Currency.unwrap(positions[lp].poolKey.currency0);
        address token1 = Currency.unwrap(positions[lp].poolKey.currency1);

        if (currentStatus == PositionStatus.ACTIVE || currentStatus == PositionStatus.REENTERING) {
            (token0Returned, token1Returned) = _removeLiquidity(lp);
            IERC20(token0).safeTransfer(lp, token0Returned);
            IERC20(token1).safeTransfer(lp, token1Returned);
        } else if (currentStatus == PositionStatus.EXITED) {
            token0Returned = lendingPool.withdraw(token0, parkedFunds[lp].token0Deposited);
            token1Returned = lendingPool.withdraw(token1, parkedFunds[lp].token1Deposited);
            IERC20(token0).safeTransfer(lp, token0Returned);
            IERC20(token1).safeTransfer(lp, token1Returned);
        }

        delete positions[lp];
        delete parkedFunds[lp];

        emit ManualExit(lp, token0Returned, token1Returned, currentStatus);
    }

    function getPosition(address lp) external view returns (LPPosition memory) {
        return positions[lp];
    }

    function getParkedFunds(address lp) external view returns (ParkedFunds memory) {
        return parkedFunds[lp];
    }

    function getPositionStatus(address lp) external view returns (PositionStatus) {
        return positions[lp].status;
    }

    function estimateYieldAccrued(address lp) external view returns (uint256 yield0, uint256 yield1) {
        address token0 = Currency.unwrap(positions[lp].poolKey.currency0);
        address token1 = Currency.unwrap(positions[lp].poolKey.currency1);
        uint256 currentBalance0 = lendingPool.balanceOf(address(this), token0);
        uint256 currentBalance1 = lendingPool.balanceOf(address(this), token1);
        yield0 = currentBalance0 - parkedFunds[lp].token0Deposited;
        yield1 = currentBalance1 - parkedFunds[lp].token1Deposited;
    }

    function getCurrentIL(address lp) external view returns (uint256 ilBps) {
        (uint160 sqrtPriceX96, , , ) = poolManager.getSlot0(positions[lp].poolKey.toId());
        return ILMath.calculateIL(positions[lp].entrySqrtPriceX96, sqrtPriceX96);
    }

    function unlockCallback(bytes calldata data) external override returns (bytes memory) {
        require(msg.sender == address(poolManager));

        (
            UnlockAction action,
            Currency currency0,
            Currency currency1,
            uint24 fee,
            int24 tickSpacing,
            IHooks hooks,
            int24 tickLower,
            int24 tickUpper,
            uint128 liquidity,
            address lp
        ) = abi.decode(data, (UnlockAction, Currency, Currency, uint24, int24, IHooks, int24, int24, uint128, address));

        PoolKey memory key = PoolKey({currency0: currency0, currency1: currency1, fee: fee, tickSpacing: tickSpacing, hooks: hooks});

        if (action == UnlockAction.ADD) {
            IPoolManager.ModifyLiquidityParams memory params = IPoolManager.ModifyLiquidityParams({
                tickLower: tickLower,
                tickUpper: tickUpper,
                liquidityDelta: int256(uint256(liquidity)),
                salt: bytes32(uint256(uint160(lp)))
            });

            (BalanceDelta delta, ) = poolManager.modifyLiquidity(key, params, "");

            if (delta.amount0() < 0) {
                uint256 amount = uint256(int256(-delta.amount0()));
                poolManager.sync(key.currency0);
                IERC20(Currency.unwrap(key.currency0)).safeTransfer(address(poolManager), amount);
                poolManager.settle();
            }
            if (delta.amount1() < 0) {
                uint256 amount = uint256(int256(-delta.amount1()));
                poolManager.sync(key.currency1);
                IERC20(Currency.unwrap(key.currency1)).safeTransfer(address(poolManager), amount);
                poolManager.settle();
            }

            return abi.encode(uint256(uint128(liquidity)));
        } else {
            IPoolManager.ModifyLiquidityParams memory params = IPoolManager.ModifyLiquidityParams({
                tickLower: tickLower,
                tickUpper: tickUpper,
                liquidityDelta: -int256(uint256(liquidity)),
                salt: bytes32(uint256(uint160(lp)))
            });

            (BalanceDelta delta, ) = poolManager.modifyLiquidity(key, params, "");

            if (delta.amount0() > 0) {
                poolManager.take(key.currency0, address(this), uint256(int256(delta.amount0())));
            }
            if (delta.amount1() > 0) {
                poolManager.take(key.currency1, address(this), uint256(int256(delta.amount1())));
            }

            return abi.encode(uint256(int256(delta.amount0())), uint256(int256(delta.amount1())));
        }
    }

    function _removeLiquidity(address lp) internal returns (uint256 token0Amount, uint256 token1Amount) {
        LPPosition storage pos = positions[lp];

        bytes memory result = poolManager.unlock(
            abi.encode(
                UnlockAction.REMOVE,
                pos.poolKey.currency0,
                pos.poolKey.currency1,
                pos.poolKey.fee,
                pos.poolKey.tickSpacing,
                pos.poolKey.hooks,
                pos.tickLower,
                pos.tickUpper,
                pos.liquidity,
                lp
            )
        );

        (token0Amount, token1Amount) = abi.decode(result, (uint256, uint256));
    }

    function getHookPermissions() public pure returns (Hooks.Permissions memory) {
        return Hooks.Permissions({
            beforeInitialize: false,
            afterInitialize: false,
            beforeAddLiquidity: false,
            afterAddLiquidity: false,
            beforeRemoveLiquidity: false,
            afterRemoveLiquidity: false,
            beforeSwap: false,
            afterSwap: true,
            beforeDonate: false,
            afterDonate: false,
            beforeSwapReturnDelta: false,
            afterSwapReturnDelta: false,
            afterAddLiquidityReturnDelta: false,
            afterRemoveLiquidityReturnDelta: false
        });
    }

    function beforeInitialize(address, PoolKey calldata, uint160) external pure override returns (bytes4) {
        return IHooks.beforeInitialize.selector;
    }
    function afterInitialize(address, PoolKey calldata, uint160, int24) external pure override returns (bytes4) {
        return IHooks.afterInitialize.selector;
    }
    function beforeAddLiquidity(address, PoolKey calldata, IPoolManager.ModifyLiquidityParams calldata, bytes calldata) external pure override returns (bytes4) {
        return IHooks.beforeAddLiquidity.selector;
    }
    function afterAddLiquidity(address, PoolKey calldata, IPoolManager.ModifyLiquidityParams calldata, BalanceDelta, BalanceDelta, bytes calldata) external pure override returns (bytes4, BalanceDelta) {
        return (IHooks.afterAddLiquidity.selector, BalanceDelta.wrap(0));
    }
    function beforeRemoveLiquidity(address, PoolKey calldata, IPoolManager.ModifyLiquidityParams calldata, bytes calldata) external pure override returns (bytes4) {
        return IHooks.beforeRemoveLiquidity.selector;
    }
    function afterRemoveLiquidity(address, PoolKey calldata, IPoolManager.ModifyLiquidityParams calldata, BalanceDelta, BalanceDelta, bytes calldata) external pure override returns (bytes4, BalanceDelta) {
        return (IHooks.afterRemoveLiquidity.selector, BalanceDelta.wrap(0));
    }
    function beforeSwap(address, PoolKey calldata, IPoolManager.SwapParams calldata, bytes calldata) external pure override returns (bytes4, BeforeSwapDelta, uint24) {
        return (IHooks.beforeSwap.selector, BeforeSwapDelta.wrap(0), 0);
    }
    function beforeDonate(address, PoolKey calldata, uint256, uint256, bytes calldata) external pure override returns (bytes4) {
        return IHooks.beforeDonate.selector;
    }
    function afterDonate(address, PoolKey calldata, uint256, uint256, bytes calldata) external pure override returns (bytes4) {
        return IHooks.afterDonate.selector;
    }
}

enum UnlockAction { ADD, REMOVE }
