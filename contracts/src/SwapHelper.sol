// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {IUnlockCallback} from "@uniswap/v4-core/src/interfaces/callback/IUnlockCallback.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {BalanceDelta} from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {CurrencySettler} from "@uniswap/v4-core/test/utils/CurrencySettler.sol";

contract SwapHelper is IUnlockCallback {
    using CurrencySettler for Currency;

    IPoolManager public immutable manager;

    constructor(IPoolManager _manager) {
        manager = _manager;
    }

    struct CallbackData {
        address sender;
        PoolKey key;
        IPoolManager.SwapParams params;
        bytes hookData;
    }

    function swap(
        PoolKey calldata key,
        IPoolManager.SwapParams calldata params,
        bytes calldata hookData
    ) external payable returns (BalanceDelta delta) {
        delta = abi.decode(
            manager.unlock(abi.encode(CallbackData(msg.sender, key, params, hookData))),
            (BalanceDelta)
        );
    }

    function unlockCallback(bytes calldata rawData) external returns (bytes memory) {
        require(msg.sender == address(manager), "SwapHelper: not manager");

        CallbackData memory data = abi.decode(rawData, (CallbackData));
        address sender = data.sender;

        BalanceDelta swapDelta = manager.swap(data.key, data.params, data.hookData);

        int128 amount0 = swapDelta.amount0();
        int128 amount1 = swapDelta.amount1();

        if (amount0 < 0) {
            data.key.currency0.settle(manager, sender, uint256(uint128(-amount0)), false);
        } else if (amount0 > 0) {
            data.key.currency0.take(manager, sender, uint256(uint128(amount0)), false);
        }

        if (amount1 < 0) {
            data.key.currency1.settle(manager, sender, uint256(uint128(-amount1)), false);
        } else if (amount1 > 0) {
            data.key.currency1.take(manager, sender, uint256(uint128(amount1)), false);
        }

        return abi.encode(swapDelta);
    }
}
