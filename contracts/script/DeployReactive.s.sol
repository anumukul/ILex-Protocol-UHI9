// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import {ILexReactive} from "../src/ILexReactive.sol";

contract DeployReactive is Script {
    function run() external {
        uint256 reactivePrivateKey = vm.envUint("REACTIVE_PRIVATE_KEY");
        address systemContract = vm.envAddress("SYSTEM_CONTRACT_ADDR");
        address hookAddress = vm.envAddress("ILEX_HOOK_ADDR");
        uint256 originChainId = 1301;
        uint256 destChainId = 1301;

        vm.startBroadcast(reactivePrivateKey);

        ILexReactive reactive = new ILexReactive{value: 0.01 ether}(
            systemContract,
            originChainId,
            destChainId,
            hookAddress
        );

        vm.stopBroadcast();

        console.log("ILexReactive deployed:", address(reactive));
        console.log("Set this as authorized RVM ID in ILexHook");
        console.log("Call: hook.setAuthorizedRvmId(address(reactive))");
    }
}
