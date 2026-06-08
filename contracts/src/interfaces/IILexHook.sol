// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";

interface IILexHook {
    function deposit(
        PoolKey calldata key,
        int24 tickLower,
        int24 tickUpper,
        uint256 amount0Desired,
        uint256 amount1Desired,
        uint256 ilThresholdBps,
        uint256 reentryToleranceBps
    ) external returns (uint128 liquidity);

    function triggerExit(address rvm_id, address lp) external;
    function triggerReentry(address rvm_id, address lp) external;
    function manualExit() external;
    function setAuthorizedRvmId(address rvmId) external;
    function getPosition(address lp) external view returns (LPPosition memory);
    function getCurrentIL(address lp) external view returns (uint256 ilBps);
    function estimateYieldAccrued(address lp) external view returns (uint256 yield0, uint256 yield1);
}

struct LPPosition {
    PoolKey poolKey;
    int24 tickLower;
    int24 tickUpper;
    uint128 liquidity;
    uint160 entrySqrtPriceX96;
    uint256 ilThresholdBps;
    uint256 reentryToleranceBps;
    uint256 status;
    uint256 depositTimestamp;
}
