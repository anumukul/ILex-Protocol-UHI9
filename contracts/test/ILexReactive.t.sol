// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "reactive-test-lib/base/ReactiveTest.sol";
import {ILexReactive} from "../src/ILexReactive.sol";
import {MockHookEvents} from "../src/mocks/MockHookEvents.sol";

contract ILexReactiveTest is ReactiveTest {
    ILexReactive rc;
    MockHookEvents hook;

    uint256 constant UNICHAIN_SEPOLIA = 1301;

    uint256 constant POSITION_CREATED_TOPIC =
        uint256(keccak256("PositionCreated(address,uint160,uint256,uint256,int24,int24,uint256,uint256)"));
    uint256 constant PRICE_UPDATE_TOPIC =
        uint256(keccak256("PriceUpdate(bytes32,uint160,int24)"));
    uint256 constant POSITION_EXITED_TOPIC =
        uint256(keccak256("PositionExited(address,uint160,uint256,uint256,uint256,uint256)"));
    uint256 constant POSITION_REENTERED_TOPIC =
        uint256(keccak256("PositionReentered(address,uint160,uint256,uint256,uint256)"));
    uint256 constant MANUAL_EXIT_TOPIC =
        uint256(keccak256("ManualExit(address,uint256,uint256,uint8)"));

    address LP1 = makeAddr("LP1");
    address LP2 = makeAddr("LP2");

    uint160 constant ENTRY_PRICE = 79228162514264337593543950336;
    uint160 constant HIGH_IL_PRICE = 56022770974786143748341800795;
    uint160 constant RECOVERY_PRICE = 79228162514264337593543950336;

    function setUp() public override {
        super.setUp();

        hook = new MockHookEvents();

        rc = new ILexReactive(
            address(sys),
            UNICHAIN_SEPOLIA,
            UNICHAIN_SEPOLIA,
            address(hook)
        );

        enableVmMode(address(rc));
    }

    function _emitPositionCreated(
        address lp,
        uint160 entrySqrtPrice,
        uint256 ilThresholdBps,
        uint256 reentryBps
    ) internal returns (CallbackResult[] memory) {
        return triggerAndReact(
            address(hook),
            abi.encodeWithSignature(
                "emitPositionCreated(address,uint160,uint256,uint256,int24,int24,uint256,uint256)",
                lp, entrySqrtPrice, ilThresholdBps, reentryBps, -60, 60, 1000e18, 1000e18
            ),
            UNICHAIN_SEPOLIA
        );
    }

    function test_React_RegistersLPOnPositionCreated() public {
        _emitPositionCreated(LP1, ENTRY_PRICE, 500, 200);

        (uint160 entry, uint256 threshold, , ILexReactive.LPStatus status,) = rc.lpStates(LP1);
        assertEq(entry, ENTRY_PRICE);
        assertEq(threshold, 500);
        assertEq(uint8(status), uint8(ILexReactive.LPStatus.ACTIVE));
    }

    function test_React_FiresExitCallbackOnThresholdBreach() public {
        _emitPositionCreated(LP1, ENTRY_PRICE, 500, 200);

        CallbackResult[] memory results = triggerAndReact(
            address(hook),
            abi.encodeWithSignature(
                "emitPriceUpdate(bytes32,uint160,int24)",
                bytes32(0), HIGH_IL_PRICE, int24(-200)
            ),
            UNICHAIN_SEPOLIA
        );

        assertCallbackCount(results, 1);
        assertCallbackEmitted(results, address(hook));
        assertCallbackSuccess(results, 0);
    }

    function test_React_NoCallbackBelowThreshold() public {
        _emitPositionCreated(LP1, ENTRY_PRICE, 500, 200);

        uint160 smallMove = uint160(ENTRY_PRICE * 101 / 100);

        CallbackResult[] memory results = triggerAndReact(
            address(hook),
            abi.encodeWithSignature(
                "emitPriceUpdate(bytes32,uint160,int24)",
                bytes32(0), smallMove, int24(0)
            ),
            UNICHAIN_SEPOLIA
        );

        assertNoCallbacks(results);
    }

    function test_React_NoDuplicateExitCallback() public {
        _emitPositionCreated(LP1, ENTRY_PRICE, 500, 200);

        triggerAndReact(
            address(hook),
            abi.encodeWithSignature("emitPriceUpdate(bytes32,uint160,int24)", bytes32(0), HIGH_IL_PRICE, int24(-200)),
            UNICHAIN_SEPOLIA
        );

        CallbackResult[] memory results = triggerAndReact(
            address(hook),
            abi.encodeWithSignature("emitPriceUpdate(bytes32,uint160,int24)", bytes32(0), HIGH_IL_PRICE, int24(-200)),
            UNICHAIN_SEPOLIA
        );

        assertNoCallbacks(results);
    }

    function test_React_FiresReentryCallbackOnRecovery() public {
        _emitPositionCreated(LP1, ENTRY_PRICE, 500, 200);

        triggerAndReact(
            address(hook),
            abi.encodeWithSignature("emitPriceUpdate(bytes32,uint160,int24)", bytes32(0), HIGH_IL_PRICE, int24(-200)),
            UNICHAIN_SEPOLIA
        );

        triggerAndReact(
            address(hook),
            abi.encodeWithSignature(
                "emitPositionExited(address,uint160,uint256,uint256,uint256,uint256)",
                LP1, HIGH_IL_PRICE, 600, 900e18, 900e18, block.timestamp
            ),
            UNICHAIN_SEPOLIA
        );

        vm.roll(block.number + 101);

        CallbackResult[] memory results = triggerAndReact(
            address(hook),
            abi.encodeWithSignature("emitPriceUpdate(bytes32,uint160,int24)", bytes32(0), RECOVERY_PRICE, int24(0)),
            UNICHAIN_SEPOLIA
        );

        assertCallbackCount(results, 1);
        assertCallbackEmitted(results, address(hook));
        assertCallbackSuccess(results, 0);
    }

    function test_React_CooldownPreventsImmediateReentry() public {
        _emitPositionCreated(LP1, ENTRY_PRICE, 500, 200);

        triggerAndReact(
            address(hook),
            abi.encodeWithSignature("emitPriceUpdate(bytes32,uint160,int24)", bytes32(0), HIGH_IL_PRICE, int24(-200)),
            UNICHAIN_SEPOLIA
        );

        triggerAndReact(
            address(hook),
            abi.encodeWithSignature("emitPositionExited(address,uint160,uint256,uint256,uint256,uint256)", LP1, HIGH_IL_PRICE, 600, 900e18, 900e18, block.timestamp),
            UNICHAIN_SEPOLIA
        );

        CallbackResult[] memory results = triggerAndReact(
            address(hook),
            abi.encodeWithSignature("emitPriceUpdate(bytes32,uint160,int24)", bytes32(0), RECOVERY_PRICE, int24(0)),
            UNICHAIN_SEPOLIA
        );

        assertNoCallbacks(results);
    }

    function test_React_ManualExitRemovesLPFromTracking() public {
        _emitPositionCreated(LP1, ENTRY_PRICE, 500, 200);

        triggerAndReact(
            address(hook),
            abi.encodeWithSignature("emitManualExit(address,uint256,uint256,uint8)", LP1, 1000e18, 1000e18, 1),
            UNICHAIN_SEPOLIA
        );

        (,,, ILexReactive.LPStatus st,) = rc.lpStates(LP1);
        assertEq(uint8(st), uint8(ILexReactive.LPStatus.NONE));
    }

    function test_React_MultipleLP_IndependentTracking() public {
        _emitPositionCreated(LP1, ENTRY_PRICE, 500, 200);
        _emitPositionCreated(LP2, ENTRY_PRICE, 300, 100);

        uint160 il3to5PctPrice = uint160(ENTRY_PRICE * 75 / 100);

        CallbackResult[] memory results = triggerAndReact(
            address(hook),
            abi.encodeWithSignature("emitPriceUpdate(bytes32,uint160,int24)", bytes32(0), il3to5PctPrice, int24(0)),
            UNICHAIN_SEPOLIA
        );

        assertCallbackCount(results, 1);
    }
}
