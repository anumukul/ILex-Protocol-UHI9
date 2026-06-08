// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {AbstractReactive} from "reactive-lib/abstract-base/AbstractReactive.sol";
import {IReactive} from "reactive-lib/interfaces/IReactive.sol";
import {ISystemContract} from "reactive-lib/interfaces/ISystemContract.sol";

contract ILexReactive is AbstractReactive {
    uint256 public immutable originChainId;
    uint256 public immutable destinationChainId;
    address public immutable hookAddress;

    uint64 private constant CALLBACK_GAS_LIMIT = 500_000;
    uint256 private constant COOLDOWN_BLOCKS = 100;

    uint256 private constant POSITION_CREATED_TOPIC =
        uint256(keccak256("PositionCreated(address,uint160,uint256,uint256,int24,int24,uint256,uint256)"));

    uint256 private constant POSITION_EXITED_TOPIC =
        uint256(keccak256("PositionExited(address,uint160,uint256,uint256,uint256,uint256)"));

    uint256 private constant POSITION_REENTERED_TOPIC =
        uint256(keccak256("PositionReentered(address,uint160,uint256,uint256,uint256)"));

    uint256 private constant MANUAL_EXIT_TOPIC =
        uint256(keccak256("ManualExit(address,uint256,uint256,uint8)"));

    uint256 private constant PRICE_UPDATE_TOPIC =
        uint256(keccak256("PriceUpdate(bytes32,uint160,int24)"));

    enum LPStatus { NONE, ACTIVE, EXITING, EXITED, REENTERING }

    struct LPState {
        uint160 entrySqrtPriceX96;
        uint256 ilThresholdBps;
        uint256 reentryToleranceBps;
        LPStatus status;
        uint256 lastReentryBlock;
    }

    address[] public trackedLPs;
    mapping(address => LPState) public lpStates;
    mapping(address => uint256) public lpIndex;

    constructor(
        address _service,
        uint256 _originChainId,
        uint256 _destinationChainId,
        address _hookAddress
    ) payable {
        service = ISystemContract(payable(_service));
        originChainId = _originChainId;
        destinationChainId = _destinationChainId;
        hookAddress = _hookAddress;

        if (!vm) {
            service.subscribe(originChainId, _hookAddress, POSITION_CREATED_TOPIC, REACTIVE_IGNORE, REACTIVE_IGNORE, REACTIVE_IGNORE);
            service.subscribe(originChainId, _hookAddress, POSITION_EXITED_TOPIC, REACTIVE_IGNORE, REACTIVE_IGNORE, REACTIVE_IGNORE);
            service.subscribe(originChainId, _hookAddress, POSITION_REENTERED_TOPIC, REACTIVE_IGNORE, REACTIVE_IGNORE, REACTIVE_IGNORE);
            service.subscribe(originChainId, _hookAddress, MANUAL_EXIT_TOPIC, REACTIVE_IGNORE, REACTIVE_IGNORE, REACTIVE_IGNORE);
            service.subscribe(originChainId, _hookAddress, PRICE_UPDATE_TOPIC, REACTIVE_IGNORE, REACTIVE_IGNORE, REACTIVE_IGNORE);
        }
    }

    function react(LogRecord calldata log) external vmOnly {
        if (log.topic_0 == POSITION_CREATED_TOPIC) {
            _handlePositionCreated(log);
        } else if (log.topic_0 == PRICE_UPDATE_TOPIC) {
            _handlePriceUpdate(log);
        } else if (log.topic_0 == POSITION_EXITED_TOPIC) {
            _handlePositionExited(log);
        } else if (log.topic_0 == POSITION_REENTERED_TOPIC) {
            _handlePositionReentered(log);
        } else if (log.topic_0 == MANUAL_EXIT_TOPIC) {
            _handleManualExit(log);
        }
    }

    function _handlePositionCreated(LogRecord calldata log) internal {
        address lp = address(uint160(log.topic_1));

        (uint160 entrySqrtPriceX96, uint256 ilThresholdBps, uint256 reentryToleranceBps,,,,)
            = abi.decode(log.data, (uint160, uint256, uint256, int24, int24, uint256, uint256));

        if (lpStates[lp].status == LPStatus.NONE) {
            trackedLPs.push(lp);
            lpIndex[lp] = trackedLPs.length - 1;
        }

        lpStates[lp] = LPState({
            entrySqrtPriceX96: entrySqrtPriceX96,
            ilThresholdBps: ilThresholdBps,
            reentryToleranceBps: reentryToleranceBps,
            status: LPStatus.ACTIVE,
            lastReentryBlock: 0
        });
    }

    function _handlePriceUpdate(LogRecord calldata log) internal {
        (uint160 currentSqrtPriceX96,) = abi.decode(log.data, (uint160, int24));

        uint256 len = trackedLPs.length;
        for (uint256 i = 0; i < len; i++) {
            address lp = trackedLPs[i];
            LPState storage state = lpStates[lp];

            if (state.status == LPStatus.ACTIVE) {
                uint256 ilBps = _calculateIL(state.entrySqrtPriceX96, currentSqrtPriceX96);

                if (ilBps >= state.ilThresholdBps) {
                    bytes memory payload = abi.encodeWithSignature(
                        "triggerExit(address,address)",
                        address(0),
                        lp
                    );
                    emit Callback(destinationChainId, hookAddress, CALLBACK_GAS_LIMIT, payload);
                    state.status = LPStatus.EXITING;
                }

            } else if (state.status == LPStatus.EXITED) {
                uint256 deviationBps = _priceDeviation(currentSqrtPriceX96, state.entrySqrtPriceX96);

                if (deviationBps <= state.reentryToleranceBps
                    && log.block_number > state.lastReentryBlock + COOLDOWN_BLOCKS)
                {
                    bytes memory payload = abi.encodeWithSignature(
                        "triggerReentry(address,address)",
                        address(0),
                        lp
                    );
                    emit Callback(destinationChainId, hookAddress, CALLBACK_GAS_LIMIT, payload);
                    state.status = LPStatus.REENTERING;
                }
            }
        }
    }

    function _handlePositionExited(LogRecord calldata log) internal {
        address lp = address(uint160(log.topic_1));
        lpStates[lp].status = LPStatus.EXITED;
    }

    function _handlePositionReentered(LogRecord calldata log) internal {
        address lp = address(uint160(log.topic_1));
        (uint160 newEntrySqrtPriceX96,,,) = abi.decode(log.data, (uint160, uint256, uint256, uint256));
        lpStates[lp].status = LPStatus.ACTIVE;
        lpStates[lp].entrySqrtPriceX96 = newEntrySqrtPriceX96;
        lpStates[lp].lastReentryBlock = log.block_number;
    }

    function _handleManualExit(LogRecord calldata log) internal {
        address lp = address(uint160(log.topic_1));
        uint256 idx = lpIndex[lp];
        uint256 lastIdx = trackedLPs.length - 1;
        if (idx != lastIdx) {
            address lastLP = trackedLPs[lastIdx];
            trackedLPs[idx] = lastLP;
            lpIndex[lastLP] = idx;
        }
        trackedLPs.pop();
        delete lpIndex[lp];
        delete lpStates[lp];
    }

    function _calculateIL(uint160 entrySqrtPriceX96, uint160 currentSqrtPriceX96)
        internal pure returns (uint256 ilBps)
    {
        if (entrySqrtPriceX96 == 0) return 0;

        uint256 Q96 = 2**96;
        uint256 rQ96 = (uint256(currentSqrtPriceX96) * Q96) / uint256(entrySqrtPriceX96);

        uint256 numerator = 2 * rQ96;
        uint256 rSquaredQ96 = (rQ96 * rQ96) / Q96;
        uint256 denominator = Q96 + rSquaredQ96;

        uint256 resultQ96 = (numerator * Q96) / denominator;

        uint256 diffQ96;
        if (resultQ96 > Q96) {
            diffQ96 = resultQ96 - Q96;
        } else {
            diffQ96 = Q96 - resultQ96;
        }

        ilBps = (diffQ96 * 10000) / Q96;
    }

    function _priceDeviation(uint160 currentSqrtPriceX96, uint160 entrySqrtPriceX96)
        internal pure returns (uint256 deviationBps)
    {
        if (entrySqrtPriceX96 == 0) return type(uint256).max;

        uint256 Q96 = 2**96;
        uint256 rQ96 = (uint256(currentSqrtPriceX96) * Q96) / uint256(entrySqrtPriceX96);

        uint256 diffQ96;
        if (rQ96 > Q96) {
            diffQ96 = rQ96 - Q96;
        } else {
            diffQ96 = Q96 - rQ96;
        }

        deviationBps = (diffQ96 * 10000) / Q96;
    }
}
