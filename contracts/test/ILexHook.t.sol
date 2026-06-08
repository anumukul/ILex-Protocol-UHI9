// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Test.sol";
import {Deployers} from "@uniswap/v4-core/test/utils/Deployers.sol";
import {PoolManager} from "@uniswap/v4-core/src/PoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {TickMath} from "@uniswap/v4-core/src/libraries/TickMath.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {HookMiner} from "@uniswap/v4-periphery/test/shared/HookMiner.sol";
import {ILexHook} from "../src/ILexHook.sol";
import {MockLendingPool} from "../src/mocks/MockLendingPool.sol";
import {MockERC20} from "../src/mocks/MockERC20.sol";
import {ILMath} from "../src/libraries/ILMath.sol";
import {ILendingPool} from "../src/interfaces/ILendingPool.sol";

contract ILexHookTest is Test, Deployers {
    ILexHook hook;
    MockLendingPool lendingPool;
    MockERC20 token0;
    MockERC20 token1;
    PoolKey poolKey;

    address LP1 = makeAddr("LP1");
    address LP2 = makeAddr("LP2");
    address CALLBACK_PROXY = makeAddr("callbackProxy");
    address OWNER = makeAddr("owner");
    address RVM_ID = makeAddr("rvmId");

    uint160 constant INITIAL_SQRT_PRICE = 79228162514264337593543950336;

    function setUp() public {
        deployFreshManagerAndRouters();

        MockERC20 tokenA = new MockERC20("Alpha", "ALPHA");
        MockERC20 tokenB = new MockERC20("Beta", "BETA");
        if (address(tokenA) < address(tokenB)) {
            token0 = tokenA;
            token1 = tokenB;
        } else {
            token0 = tokenB;
            token1 = tokenA;
        }

        lendingPool = new MockLendingPool();

        uint160 hookFlags = uint160(Hooks.AFTER_SWAP_FLAG);
        bytes memory constructorArgs = abi.encode(
            manager,
            address(lendingPool),
            CALLBACK_PROXY,
            OWNER
        );
        (address hookAddr, bytes32 salt) = HookMiner.find(
            address(this),
            hookFlags,
            type(ILexHook).creationCode,
            constructorArgs
        );

        hook = new ILexHook{salt: salt}(
            manager,
            ILendingPool(address(lendingPool)),
            CALLBACK_PROXY,
            OWNER
        );
        assertEq(address(hook), hookAddr, "Hook address mismatch");

        poolKey = PoolKey({
            currency0: Currency.wrap(address(token0)),
            currency1: Currency.wrap(address(token1)),
            fee: 3000,
            tickSpacing: 60,
            hooks: IHooks(address(hook))
        });
        manager.initialize(poolKey, INITIAL_SQRT_PRICE);

        vm.prank(OWNER);
        hook.setAuthorizedRvmId(RVM_ID);

        token0.mint(LP1, 100_000e18);
        token1.mint(LP1, 100_000e18);
        token0.mint(LP2, 100_000e18);
        token1.mint(LP2, 100_000e18);

        vm.startPrank(LP1);
        token0.approve(address(hook), type(uint256).max);
        token1.approve(address(hook), type(uint256).max);
        vm.stopPrank();

        vm.startPrank(LP2);
        token0.approve(address(hook), type(uint256).max);
        token1.approve(address(hook), type(uint256).max);
        vm.stopPrank();
    }

    function test_Deposit_CreatesPosition() public {
        vm.startPrank(LP1);
        hook.deposit(poolKey, -60, 60, 1000e18, 1000e18, 500, 200);
        vm.stopPrank();

        ILexHook.LPPosition memory pos = hook.getPosition(LP1);
        assertEq(uint8(pos.status), uint8(ILexHook.PositionStatus.ACTIVE));
        assertEq(pos.ilThresholdBps, 500);
        assertEq(pos.reentryToleranceBps, 200);
        assertEq(pos.entrySqrtPriceX96, INITIAL_SQRT_PRICE);
        assertGt(pos.liquidity, 0);
    }

    function test_Deposit_RevertsIfPositionExists() public {
        vm.startPrank(LP1);
        hook.deposit(poolKey, -60, 60, 1000e18, 1000e18, 500, 200);
        vm.expectRevert(ILexHook.PositionAlreadyExists.selector);
        hook.deposit(poolKey, -60, 60, 500e18, 500e18, 300, 100);
        vm.stopPrank();
    }

    function test_Deposit_RevertsIfThresholdBelowMin() public {
        vm.startPrank(LP1);
        vm.expectRevert(ILexHook.InvalidThreshold.selector);
        hook.deposit(poolKey, -60, 60, 1000e18, 1000e18, 10, 200);
        vm.stopPrank();
    }

    function test_Deposit_RevertsIfThresholdAboveMax() public {
        vm.startPrank(LP1);
        vm.expectRevert(ILexHook.InvalidThreshold.selector);
        hook.deposit(poolKey, -60, 60, 1000e18, 1000e18, 6000, 200);
        vm.stopPrank();
    }

    function test_Deposit_RevertsIfReentryAboveMax() public {
        vm.startPrank(LP1);
        vm.expectRevert(ILexHook.InvalidReentryTolerance.selector);
        hook.deposit(poolKey, -60, 60, 1000e18, 1000e18, 500, 2000);
        vm.stopPrank();
    }

    function test_Deposit_RevertsIfZeroAmount() public {
        vm.startPrank(LP1);
        vm.expectRevert(ILexHook.ZeroAmount.selector);
        hook.deposit(poolKey, -60, 60, 0, 0, 500, 200);
        vm.stopPrank();
    }

    function test_SetRvmIdCanOnlyBeCalledOnce() public {
        vm.prank(OWNER);
        vm.expectRevert(ILexHook.RvmIdAlreadySet.selector);
        hook.setAuthorizedRvmId(makeAddr("newRvm"));
    }

    function test_SetRvmIdOnlyOwner() public {
        vm.prank(LP1);
        vm.expectRevert();
        hook.setAuthorizedRvmId(makeAddr("attacker"));
    }

    function test_GetCurrentIL_ZeroAtEntry() public {
        vm.prank(LP1);
        hook.deposit(poolKey, -60, 60, 1000e18, 1000e18, 500, 200);
        uint256 il = hook.getCurrentIL(LP1);
        assertEq(il, 0);
    }

    function test_GetPositionStatus() public {
        assertEq(uint8(hook.getPositionStatus(LP1)), uint8(ILexHook.PositionStatus.NONE));

        vm.prank(LP1);
        hook.deposit(poolKey, -60, 60, 1000e18, 1000e18, 500, 200);

        assertEq(uint8(hook.getPositionStatus(LP1)), uint8(ILexHook.PositionStatus.ACTIVE));
    }

    function test_GetParkedFunds_EmptyBeforeExit() public {
        vm.prank(LP1);
        hook.deposit(poolKey, -60, 60, 1000e18, 1000e18, 500, 200);

        ILexHook.ParkedFunds memory funds = hook.getParkedFunds(LP1);
        assertEq(funds.token0Deposited, 0);
        assertEq(funds.token1Deposited, 0);
    }

    function test_EstimateYieldAccrued_NoPosition() public {
        vm.prank(LP1);
        hook.deposit(poolKey, -60, 60, 1000e18, 1000e18, 500, 200);

        (uint256 y0, uint256 y1) = hook.estimateYieldAccrued(LP1);
        assertEq(y0, 0);
        assertEq(y1, 0);
    }

    function test_TriggerExit_MovesFromPoolToLendingPool() public {
        vm.prank(LP1);
        hook.deposit(poolKey, -60, 60, 1000e18, 1000e18, 500, 200);

        uint256 lendingPoolToken0Before = token0.balanceOf(address(lendingPool));

        vm.prank(CALLBACK_PROXY);
        hook.triggerExit(RVM_ID, LP1);

        ILexHook.LPPosition memory pos = hook.getPosition(LP1);
        assertEq(uint8(pos.status), uint8(ILexHook.PositionStatus.EXITED));
        assertEq(pos.liquidity, 0);

        assertGt(token0.balanceOf(address(lendingPool)), lendingPoolToken0Before);

        ILexHook.ParkedFunds memory parked = hook.getParkedFunds(LP1);
        assertGt(parked.token0Deposited, 0);
    }

    function test_TriggerExit_RevertsIfNotCallbackProxy() public {
        vm.prank(LP1);
        hook.deposit(poolKey, -60, 60, 1000e18, 1000e18, 500, 200);

        vm.prank(makeAddr("attacker"));
        vm.expectRevert(ILexHook.NotCallbackProxy.selector);
        hook.triggerExit(RVM_ID, LP1);
    }

    function test_TriggerExit_RevertsIfWrongRvmId() public {
        vm.prank(LP1);
        hook.deposit(poolKey, -60, 60, 1000e18, 1000e18, 500, 200);

        vm.prank(CALLBACK_PROXY);
        vm.expectRevert(ILexHook.NotAuthorizedRvm.selector);
        hook.triggerExit(makeAddr("fakeRvm"), LP1);
    }

    function test_TriggerExit_RevertsIfAlreadyExited() public {
        vm.prank(LP1);
        hook.deposit(poolKey, -60, 60, 1000e18, 1000e18, 500, 200);

        vm.startPrank(CALLBACK_PROXY);
        hook.triggerExit(RVM_ID, LP1);
        vm.expectRevert(ILexHook.ExitAlreadyTriggered.selector);
        hook.triggerExit(RVM_ID, LP1);
        vm.stopPrank();
    }

    function test_TriggerReentry_ReturnsToPool() public {
        vm.prank(LP1);
        hook.deposit(poolKey, -60, 60, 1000e18, 1000e18, 500, 200);

        vm.prank(CALLBACK_PROXY);
        hook.triggerExit(RVM_ID, LP1);

        vm.warp(block.timestamp + 30 days);

        ILexHook.ParkedFunds memory p = hook.getParkedFunds(LP1);
        token0.mint(address(lendingPool), p.token0Deposited * 300 * 30 days / (365 days * 10000) + 1);
        token1.mint(address(lendingPool), p.token1Deposited * 300 * 30 days / (365 days * 10000) + 1);

        vm.prank(CALLBACK_PROXY);
        hook.triggerReentry(RVM_ID, LP1);

        ILexHook.LPPosition memory pos = hook.getPosition(LP1);
        assertEq(uint8(pos.status), uint8(ILexHook.PositionStatus.ACTIVE));
        assertGt(pos.liquidity, 0);

        ILexHook.ParkedFunds memory parked = hook.getParkedFunds(LP1);
        assertEq(parked.token0Deposited, 0);
        assertEq(parked.token1Deposited, 0);
    }

    function test_YieldAccruesDuringParking() public {
        vm.prank(LP1);
        hook.deposit(poolKey, -60, 60, 1000e18, 1000e18, 500, 200);

        vm.prank(CALLBACK_PROXY);
        hook.triggerExit(RVM_ID, LP1);

        (uint256 yield0Before,) = hook.estimateYieldAccrued(LP1);

        vm.warp(block.timestamp + 30 days);

        (uint256 yield0After,) = hook.estimateYieldAccrued(LP1);
        assertGt(yield0After, yield0Before);
    }

    function test_ManualExit_ActivePosition() public {
        vm.startPrank(LP1);
        hook.deposit(poolKey, -60, 60, 1000e18, 1000e18, 500, 200);

        uint256 token0Before = token0.balanceOf(LP1);
        uint256 token1Before = token1.balanceOf(LP1);
        hook.manualExit();
        vm.stopPrank();

        assertGt(token0.balanceOf(LP1), token0Before);
        assertGt(token1.balanceOf(LP1), token1Before);

        ILexHook.LPPosition memory pos = hook.getPosition(LP1);
        assertEq(uint8(pos.status), uint8(ILexHook.PositionStatus.NONE));
    }

    function test_ManualExit_ParkedPosition() public {
        vm.prank(LP1);
        hook.deposit(poolKey, -60, 60, 1000e18, 1000e18, 500, 200);

        vm.prank(CALLBACK_PROXY);
        hook.triggerExit(RVM_ID, LP1);

        vm.warp(block.timestamp + 30 days);

        ILexHook.ParkedFunds memory p = hook.getParkedFunds(LP1);
        token0.mint(address(lendingPool), p.token0Deposited * 300 * 30 days / (365 days * 10000) + 1);
        token1.mint(address(lendingPool), p.token1Deposited * 300 * 30 days / (365 days * 10000) + 1);

        uint256 token0Before = token0.balanceOf(LP1);
        uint256 token1Before = token1.balanceOf(LP1);
        vm.prank(LP1);
        hook.manualExit();

        assertGt(token0.balanceOf(LP1), token0Before);
        assertGt(token1.balanceOf(LP1), token1Before);

        ILexHook.LPPosition memory pos = hook.getPosition(LP1);
        assertEq(uint8(pos.status), uint8(ILexHook.PositionStatus.NONE));
    }

    function test_MultipleLP_IndependentPositions() public {
        vm.prank(LP1);
        hook.deposit(poolKey, -60, 60, 500e18, 500e18, 500, 200);

        vm.prank(LP2);
        hook.deposit(poolKey, -120, 120, 500e18, 500e18, 300, 100);

        assertEq(uint8(hook.getPositionStatus(LP1)), uint8(ILexHook.PositionStatus.ACTIVE));
        assertEq(uint8(hook.getPositionStatus(LP2)), uint8(ILexHook.PositionStatus.ACTIVE));

        ILexHook.LPPosition memory pos1 = hook.getPosition(LP1);
        assertEq(pos1.tickLower, -60);
        assertEq(pos1.tickUpper, 60);
        assertEq(pos1.ilThresholdBps, 500);

        ILexHook.LPPosition memory pos2 = hook.getPosition(LP2);
        assertEq(pos2.tickLower, -120);
        assertEq(pos2.tickUpper, 120);
        assertEq(pos2.ilThresholdBps, 300);
    }
}
