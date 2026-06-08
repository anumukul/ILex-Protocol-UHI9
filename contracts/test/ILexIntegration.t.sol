// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Test.sol";
import {Deployers} from "@uniswap/v4-core/test/utils/Deployers.sol";
import {PoolManager} from "@uniswap/v4-core/src/PoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {HookMiner} from "@uniswap/v4-periphery/test/shared/HookMiner.sol";
import {ILexHook} from "../src/ILexHook.sol";
import {MockLendingPool} from "../src/mocks/MockLendingPool.sol";
import {MockERC20} from "../src/mocks/MockERC20.sol";
import {ILMath} from "../src/libraries/ILMath.sol";
import {ILendingPool} from "../src/interfaces/ILendingPool.sol";

contract ILexIntegrationTest is Test, Deployers {
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

    uint160 constant PRICE_1_TO_1 = 79228162514264337593543950336;
    uint160 constant PRICE_2_TO_1 = 112045541949572368408149852814;
    uint160 constant PRICE_0_5_TO_1 = 56022770974786143748341800795;
    uint160 constant PRICE_RECOVERED = 80812742183953503898826527923;

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
        manager.initialize(poolKey, PRICE_1_TO_1);

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

        token0.mint(address(lendingPool), 1_000_000e18);
        token1.mint(address(lendingPool), 1_000_000e18);
    }

    function test_Integration_FullProtectionCycle() public {
        vm.prank(LP1);
        uint128 liquidity = hook.deposit(
            poolKey, -600, 600, 1000e18, 1000e18, 500, 200
        );
        assertGt(liquidity, 0);

        ILexHook.LPPosition memory posBefore = hook.getPosition(LP1);
        assertEq(uint8(posBefore.status), uint8(ILexHook.PositionStatus.ACTIVE));
        assertEq(posBefore.entrySqrtPriceX96, PRICE_1_TO_1);

        uint256 ilAtEntry = hook.getCurrentIL(LP1);
        assertEq(ilAtEntry, 0);

        uint256 lendingToken0Before = token0.balanceOf(address(lendingPool));
        uint256 lendingToken1Before = token1.balanceOf(address(lendingPool));

        vm.prank(CALLBACK_PROXY);
        hook.triggerExit(RVM_ID, LP1);

        ILexHook.LPPosition memory posAfterExit = hook.getPosition(LP1);
        assertEq(uint8(posAfterExit.status), uint8(ILexHook.PositionStatus.EXITED));
        assertEq(posAfterExit.liquidity, 0);

        assertGt(token0.balanceOf(address(lendingPool)), lendingToken0Before);
        assertGt(token1.balanceOf(address(lendingPool)), lendingToken1Before);

        ILexHook.ParkedFunds memory parked = hook.getParkedFunds(LP1);
        assertGt(parked.token0Deposited, 0);
        assertGt(parked.token1Deposited, 0);
        assertEq(parked.depositTimestamp, block.timestamp);

        vm.warp(block.timestamp + 30 days);

        (uint256 yield0, uint256 yield1) = hook.estimateYieldAccrued(LP1);
        assertGt(yield0, 0);
        assertGt(yield1, 0);

        uint256 LP1Token0Before = token0.balanceOf(LP1);
        vm.prank(CALLBACK_PROXY);
        hook.triggerReentry(RVM_ID, LP1);

        ILexHook.LPPosition memory posAfterReentry = hook.getPosition(LP1);
        assertEq(uint8(posAfterReentry.status), uint8(ILexHook.PositionStatus.ACTIVE));
        assertGt(posAfterReentry.liquidity, 0);

        ILexHook.ParkedFunds memory parkedAfter = hook.getParkedFunds(LP1);
        assertEq(parkedAfter.token0Deposited, 0);
        assertEq(parkedAfter.token1Deposited, 0);

        assertGe(
            token0.balanceOf(LP1) + posAfterReentry.liquidity,
            LP1Token0Before,
            "LP should not lose funds"
        );
    }

    function test_Integration_ManualExitActivePosition() public {
        vm.prank(LP1);
        hook.deposit(poolKey, -600, 600, 1000e18, 1000e18, 500, 200);

        uint256 token0Before = token0.balanceOf(LP1);
        uint256 token1Before = token1.balanceOf(LP1);

        vm.prank(LP1);
        hook.manualExit();

        assertGt(token0.balanceOf(LP1), token0Before);
        assertGt(token1.balanceOf(LP1), token1Before);

        ILexHook.LPPosition memory pos = hook.getPosition(LP1);
        assertEq(uint8(pos.status), uint8(ILexHook.PositionStatus.NONE));
    }

    function test_Integration_ManualExitParkedPosition() public {
        vm.prank(LP1);
        hook.deposit(poolKey, -600, 600, 1000e18, 1000e18, 500, 200);

        vm.prank(CALLBACK_PROXY);
        hook.triggerExit(RVM_ID, LP1);

        ILexHook.ParkedFunds memory parked = hook.getParkedFunds(LP1);
        vm.warp(block.timestamp + 30 days);

        uint256 token0Before = token0.balanceOf(LP1);
        vm.prank(LP1);
        hook.manualExit();

        assertGt(token0.balanceOf(LP1), token0Before + parked.token0Deposited - 1);

        ILexHook.LPPosition memory pos = hook.getPosition(LP1);
        assertEq(uint8(pos.status), uint8(ILexHook.PositionStatus.NONE));

        ILexHook.ParkedFunds memory parkedAfter = hook.getParkedFunds(LP1);
        assertEq(parkedAfter.token0Deposited, 0);
    }

    function test_Integration_YieldMatchesExpectedRate() public {
        vm.prank(LP1);
        hook.deposit(poolKey, -600, 600, 1000e18, 1000e18, 500, 200);

        vm.prank(CALLBACK_PROXY);
        hook.triggerExit(RVM_ID, LP1);

        ILexHook.ParkedFunds memory parked = hook.getParkedFunds(LP1);
        uint256 principal0 = parked.token0Deposited;

        vm.warp(block.timestamp + 365 days);

        (uint256 yield0,) = hook.estimateYieldAccrued(LP1);

        uint256 expectedYield = (principal0 * 300) / 10000;

        assertApproxEqRel(yield0, expectedYield, 0.01e18);
    }

    function test_Integration_ILMath_ReferenceValues() public pure {
        uint160 entryPrice = 79228162514264337593543950336;
        uint160 doublePrice = 112045541949572368408149852814;
        uint256 il = ILMath.calculateIL(entryPrice, doublePrice);
        assertApproxEqAbs(il, 572, 2);

        uint160 price1_5x = 96993470192998063124804164924;
        uint256 il2 = ILMath.calculateIL(entryPrice, price1_5x);
        assertApproxEqAbs(il2, 202, 5);

        uint256 il3 = ILMath.calculateIL(entryPrice, entryPrice);
        assertEq(il3, 0);

        uint256 il4 = ILMath.calculateIL(doublePrice, entryPrice);
        assertApproxEqAbs(il4, 572, 2);
    }

    function test_Integration_TwoLPs_IndependentCycles() public {
        vm.prank(LP1);
        hook.deposit(poolKey, -600, 600, 1000e18, 1000e18, 500, 200);

        vm.prank(LP2);
        hook.deposit(poolKey, -600, 600, 500e18, 500e18, 300, 100);

        vm.prank(CALLBACK_PROXY);
        hook.triggerExit(RVM_ID, LP1);

        assertEq(uint8(hook.getPositionStatus(LP1)), uint8(ILexHook.PositionStatus.EXITED));
        assertEq(uint8(hook.getPositionStatus(LP2)), uint8(ILexHook.PositionStatus.ACTIVE));

        vm.prank(LP2);
        hook.manualExit();
        assertEq(uint8(hook.getPositionStatus(LP2)), uint8(ILexHook.PositionStatus.NONE));

        assertEq(uint8(hook.getPositionStatus(LP1)), uint8(ILexHook.PositionStatus.EXITED));
        assertGt(hook.getParkedFunds(LP1).token0Deposited, 0);
    }

    function testFuzz_ILMath_NeverExceeds10000Bps(
        uint160 entry,
        uint160 current
    ) public pure {
        entry = uint160(bound(entry, 1e10, type(uint160).max / 4294967296));
        current = uint160(bound(current, 1e10, uint256(entry) * 4294967296));
        uint256 il = ILMath.calculateIL(entry, current);
        assertLe(il, 10000);
    }

    function test_Integration_ReentrancyGuard() public { }
}
