// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

library ILMath {
    uint256 internal constant Q96 = 2 ** 96;
    uint256 internal constant BPS_DENOMINATOR = 10000;

    function sqrt(uint256 x) internal pure returns (uint256 y) {
        if (x == 0) return 0;
        uint256 z = (x + 1) / 2;
        y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }

    function calculateIL(
        uint160 entrySqrtPriceX96,
        uint160 currentSqrtPriceX96
    ) internal pure returns (uint256 ilBps) {
        if (entrySqrtPriceX96 == 0) return 0;
        if (currentSqrtPriceX96 == entrySqrtPriceX96) return 0;

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

        ilBps = (diffQ96 * BPS_DENOMINATOR) / Q96;
    }

    function priceDeviation(
        uint160 currentSqrtPriceX96,
        uint160 entrySqrtPriceX96
    ) internal pure returns (uint256 deviationBps) {
        if (entrySqrtPriceX96 == 0) return type(uint256).max;

        uint256 rQ96 = (uint256(currentSqrtPriceX96) * Q96) / uint256(entrySqrtPriceX96);

        uint256 diffQ96;
        if (rQ96 > Q96) {
            diffQ96 = rQ96 - Q96;
        } else {
            diffQ96 = Q96 - rQ96;
        }

        deviationBps = (diffQ96 * BPS_DENOMINATOR) / Q96;
    }

    function sqrtPriceX96ToPrice(uint160 sqrtPriceX96) internal pure returns (uint256 price) {
        uint256 sq = uint256(sqrtPriceX96);
        price = (sq * sq) / (Q96 * Q96 / 1e18);
    }

    function expectedILFromRatio(uint256 priceRatioBps) internal pure returns (uint256 ilBps) {
        if (priceRatioBps == BPS_DENOMINATOR) return 0;

        uint256 ratioQ96 = priceRatioBps * Q96 / BPS_DENOMINATOR;
        uint256 sqrtRatioQ48 = sqrt(ratioQ96);
        uint256 rQ96 = sqrtRatioQ48 * uint256(1 << 48);

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

        ilBps = (diffQ96 * BPS_DENOMINATOR) / Q96;
    }
}
