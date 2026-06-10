// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {SwapHelper} from "../src/SwapHelper.sol";

contract DeploySwapHelper is Script {
    function run() external {
        address poolManager = vm.envAddress("POOL_MANAGER_ADDR");
        uint256 deployerPrivateKey = vm.envUint("UNICHAIN_SEPOLIA_PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);
        SwapHelper helper = new SwapHelper(IPoolManager(poolManager));
        vm.stopBroadcast();

        console.log("SwapHelper deployed at:", address(helper));
    }
}
