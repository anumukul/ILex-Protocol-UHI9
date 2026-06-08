// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {ILexHook} from "../src/ILexHook.sol";
import {MockLendingPool} from "../src/mocks/MockLendingPool.sol";
import {MockERC20} from "../src/mocks/MockERC20.sol";
import {ILendingPool} from "../src/interfaces/ILendingPool.sol";

contract DeployHook is Script {
    address constant CREATE2_DEPLOYER = 0x4e59b44847b379578588920cA78FbF26c0B4956C;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("UNICHAIN_SEPOLIA_PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        address poolManager = vm.envAddress("POOL_MANAGER_ADDR");
        address callbackProxy = vm.envAddress("CALLBACK_PROXY_ADDR");

        vm.startBroadcast(deployerPrivateKey);

        MockERC20 token0 = new MockERC20("Test Token0", "TK0");
        MockERC20 token1 = new MockERC20("Test Token1", "TK1");

        if (address(token0) > address(token1)) {
            (token0, token1) = (token1, token0);
        }

        MockLendingPool lendingPool = new MockLendingPool();

        uint160 hookFlags = uint160(Hooks.AFTER_SWAP_FLAG);
        bytes memory constructorArgs = abi.encode(
            IPoolManager(poolManager),
            ILendingPool(address(lendingPool)),
            callbackProxy,
            deployer
        );
        bytes memory initCode = abi.encodePacked(type(ILexHook).creationCode, constructorArgs);
        bytes32 initCodeHash = keccak256(initCode);

        bytes32 salt;
        address hookAddress;
        for (uint256 i = 0; i < 10_000_000; i++) {
            salt = keccak256(abi.encode(deployer, i));
            hookAddress = address(uint160(uint256(keccak256(abi.encodePacked(
                bytes1(0xff),
                CREATE2_DEPLOYER,
                salt,
                initCodeHash
            )))));
            if (uint160(hookAddress) & hookFlags == hookFlags) {
                break;
            }
            if (i == 9_999_999) {
                revert("No valid salt found");
            }
        }

        ILexHook hook = new ILexHook{salt: salt}(
            IPoolManager(poolManager),
            ILendingPool(address(lendingPool)),
            callbackProxy,
            deployer
        );

        require(address(hook) == hookAddress, "Hook address mismatch");

        PoolKey memory poolKey = PoolKey({
            currency0: Currency.wrap(address(token0)),
            currency1: Currency.wrap(address(token1)),
            fee: 3000,
            tickSpacing: 60,
            hooks: IHooks(address(hook))
        });

        uint160 startPrice = 79228162514264337593543950336;
        IPoolManager(poolManager).initialize(poolKey, startPrice);

        token0.mint(deployer, 100_000 * 1e18);
        token1.mint(deployer, 100_000 * 1e18);

        vm.stopBroadcast();

        console.log("Token0:", address(token0));
        console.log("Token1:", address(token1));
        console.log("MockLendingPool:", address(lendingPool));
        console.log("ILexHook:", address(hook));
        console.log("Pool initialized at 1:1 price");
    }
}
