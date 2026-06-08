// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ILendingPool} from "../interfaces/ILendingPool.sol";

contract MockLendingPool is ILendingPool {
    using SafeERC20 for IERC20;

    mapping(address => mapping(address => uint256)) private deposits;
    mapping(address => mapping(address => uint256)) private depositTimestamps;

    uint256 public constant MOCK_APY_BPS = 300;
    uint256 public constant SECONDS_PER_YEAR = 365 days;

    function supply(address asset, uint256 amount) external override {
        IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);
        deposits[msg.sender][asset] += amount;
        depositTimestamps[msg.sender][asset] = block.timestamp;
    }

    function withdraw(address asset, uint256 /* amount */) external override returns (uint256) {
        uint256 principal = deposits[msg.sender][asset];
        uint256 timeElapsed = block.timestamp - depositTimestamps[msg.sender][asset];
        uint256 yield_ = (principal * MOCK_APY_BPS * timeElapsed) / (SECONDS_PER_YEAR * 10000);
        uint256 total = principal + yield_;

        deposits[msg.sender][asset] = 0;
        IERC20(asset).safeTransfer(msg.sender, total);
        return total;
    }

    function balanceOf(address user, address asset) external view override returns (uint256) {
        uint256 principal = deposits[user][asset];
        uint256 timeElapsed = block.timestamp - depositTimestamps[user][asset];
        uint256 yield_ = (principal * MOCK_APY_BPS * timeElapsed) / (SECONDS_PER_YEAR * 10000);
        return principal + yield_;
    }

    function getApy(address) external pure override returns (uint256) {
        return MOCK_APY_BPS;
    }
}
