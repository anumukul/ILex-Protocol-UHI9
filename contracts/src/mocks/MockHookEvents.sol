// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {ILexHook} from "../ILexHook.sol";

contract MockHookEvents {
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

    event PriceUpdate(
        bytes32 indexed poolId,
        uint160 sqrtPriceX96,
        int24 tick
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
        ILexHook.PositionStatus statusAtExit
    );

    function emitPositionCreated(
        address lp,
        uint160 entrySqrtPriceX96,
        uint256 ilThresholdBps,
        uint256 reentryToleranceBps,
        int24 tickLower,
        int24 tickUpper,
        uint256 token0Amount,
        uint256 token1Amount
    ) external {
        emit PositionCreated(lp, entrySqrtPriceX96, ilThresholdBps, reentryToleranceBps, tickLower, tickUpper, token0Amount, token1Amount);
    }

    function emitPriceUpdate(bytes32 poolId, uint160 sqrtPriceX96, int24 tick) external {
        emit PriceUpdate(poolId, sqrtPriceX96, tick);
    }

    function emitPositionExited(address lp, uint160 exitSqrtPriceX96, uint256 ilAtExitBps, uint256 token0Parked, uint256 token1Parked, uint256 timestamp) external {
        emit PositionExited(lp, exitSqrtPriceX96, ilAtExitBps, token0Parked, token1Parked, timestamp);
    }

    function emitPositionReentered(address lp, uint160 reentryPriceX96, uint256 yieldEarned0, uint256 yieldEarned1, uint256 timestamp) external {
        emit PositionReentered(lp, reentryPriceX96, yieldEarned0, yieldEarned1, timestamp);
    }

    function emitManualExit(address lp, uint256 token0Returned, uint256 token1Returned, ILexHook.PositionStatus statusAtExit) external {
        emit ManualExit(lp, token0Returned, token1Returned, statusAtExit);
    }

    function triggerExit(address, address) external pure {}
    function triggerReentry(address, address) external pure {}
}
