// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Test.sol";
import {ILMath} from "../src/libraries/ILMath.sol";

contract ILMathTest is Test {
    uint160 constant ONE_TO_ONE = 79228162514264337593543950336;
    uint160 constant TWO_TO_ONE = 112045541949572368408149852814;
    uint160 constant ONE_TO_TWO = 56022770974786143748341800795;

    function test_CalculateIL_ZeroAtEntryPrice() public pure {
        uint256 il = ILMath.calculateIL(ONE_TO_ONE, ONE_TO_ONE);
        assertEq(il, 0);
    }

    function test_CalculateIL_KnownValue_2x() public pure {
        uint256 il = ILMath.calculateIL(ONE_TO_ONE, TWO_TO_ONE);
        assertApproxEqAbs(il, 572, 10);
    }

    function test_CalculateIL_Symmetric() public pure {
        uint256 il2x = ILMath.calculateIL(ONE_TO_ONE, TWO_TO_ONE);
        uint256 ilHalf = ILMath.calculateIL(ONE_TO_ONE, ONE_TO_TWO);
        assertApproxEqAbs(il2x, ilHalf, 1);
    }

    function test_CalculateIL_EntryPriceZero() public pure {
        uint256 il = ILMath.calculateIL(0, ONE_TO_ONE);
        assertEq(il, 0);
    }

    function test_CalculateIL_NoLossAtSamePrice() public pure {
        uint160 entry = ONE_TO_ONE;
        uint160 current = ONE_TO_ONE;
        assertEq(ILMath.calculateIL(entry, current), 0);
    }

    function test_PriceDeviation_ZeroAtSamePrice() public pure {
        uint256 dev = ILMath.priceDeviation(ONE_TO_ONE, ONE_TO_ONE);
        assertEq(dev, 0);
    }

    function test_PriceDeviation_KnownValue_2x() public pure {
        uint256 dev = ILMath.priceDeviation(TWO_TO_ONE, ONE_TO_ONE);
        assertApproxEqAbs(dev, 4142, 10);
    }

    function test_PriceDeviation_Symmetric() public pure {
        uint256 devUp = ILMath.priceDeviation(TWO_TO_ONE, ONE_TO_ONE);
        uint256 devDown = ILMath.priceDeviation(ONE_TO_TWO, ONE_TO_ONE);
        assertTrue(devUp != devDown);
    }

    function test_PriceDeviation_EntryPriceZero() public pure {
        uint256 dev = ILMath.priceDeviation(ONE_TO_ONE, 0);
        assertEq(dev, type(uint256).max);
    }

    function test_SqrtPriceX96ToPrice_OneToOne() public pure {
        uint256 price = ILMath.sqrtPriceX96ToPrice(ONE_TO_ONE);
        assertApproxEqAbs(price, 1e18, 1e14);
    }

    function test_SqrtPriceX96ToPrice_TwoToOne() public pure {
        uint256 price = ILMath.sqrtPriceX96ToPrice(TWO_TO_ONE);
        assertApproxEqAbs(price, 2e18, 1e15);
    }

    function test_SqrtPriceX96ToPrice_OneToTwo() public pure {
        uint256 price = ILMath.sqrtPriceX96ToPrice(ONE_TO_TWO);
        assertApproxEqAbs(price, 0.5e18, 1e15);
    }

    function test_ExpectedILFromRatio_OneToOne() public pure {
        uint256 il = ILMath.expectedILFromRatio(10000);
        assertEq(il, 0);
    }

    function test_ExpectedILFromRatio_TwoX() public pure {
        uint256 il = ILMath.expectedILFromRatio(20000);
        assertApproxEqAbs(il, 572, 10);
    }

    function test_ExpectedILFromRatio_FourX() public pure {
        uint256 il = ILMath.expectedILFromRatio(40000);
        assertTrue(il > 0);
    }

    function test_ExpectedILFromRatio_MatchCalculateIL() public pure {
        uint256 ilFromRatio = ILMath.expectedILFromRatio(20000);
        uint256 ilFromCalc = ILMath.calculateIL(ONE_TO_ONE, TWO_TO_ONE);
        assertApproxEqAbs(ilFromRatio, ilFromCalc, 10);
    }

    function test_CalculateIL_MonotonicIncreasing() public pure {
        uint256 prevIL = 0;
        for (uint160 i = 1e10; i < 1e16; i *= 2) {
            uint160 price = ONE_TO_ONE + i;
            if (price == ONE_TO_ONE) continue;
            uint256 il = ILMath.calculateIL(ONE_TO_ONE, price);
            assertGe(il, prevIL);
            prevIL = il;
        }
    }
}
