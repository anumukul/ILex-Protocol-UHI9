// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

interface ILendingPool {
    function supply(address asset, uint256 amount) external;
    function withdraw(address asset, uint256 amount) external returns (uint256);
    function balanceOf(address user, address asset) external view returns (uint256);
    function getApy(address asset) external view returns (uint256 apyBps);
}
