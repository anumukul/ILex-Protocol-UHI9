# ILex Protocol

**Automated Impermanent Loss Protection + Yield Parking for Uniswap v4 LPs, powered by Reactive Network.**

LPs deposit into ILex, set an IL tolerance (e.g. 5%), and walk away. A Reactive Smart Contract monitors the pool 24/7. When IL hits the limit, it auto-exits the position and parks funds in a lending pool to earn yield. When price recovers, it re-enters — all on-chain, no bots, no manual monitoring.

## Live Sites

- **Live Demo** — [i-lex-protocol-hook-p.vercel.app](https://i-lex-protocol-hook-p.vercel.app/)
- **Documentation** — [documentation-i-lex-protocol-hook.vercel.app](https://documentation-i-lex-protocol-hook.vercel.app/)
- **Pitch Deck** — [anumukul.github.io/Pitch-Deck-ILex-Protocol-UHI9](https://anumukul.github.io/Pitch-Deck-ILex-Protocol-UHI9/)




---

## How It Works

```
LP deposits → Hook adds liquidity to v4 pool → RSC registers position
                                              ↓
                              Swap happens → RSC checks IL for all LPs
                                              ↓
                         IL ≥ threshold? → RSC fires exit callback
                                              ↓
                         Hook exits position → funds parked in lending pool → yield accrues
                                              ↓
                         Price recovers? → RSC fires reentry callback
                                              ↓
                         Hook withdraws from lending pool → re-adds liquidity → cycle repeats
```

## Architecture

```
Unichain Sepolia (Chain 1301)          Reactive Network Lasna (Chain 5318007)
┌─────────────────────────────┐       ┌─────────────────────────────┐
│  ILexHook.sol               │       │  ILexReactive.sol           │
│  ─────────────────          │       │  ─────────────────          │
│  deposit()                  │◀──────│  react() monitors events    │
│  triggerExit()              │──────▶│  fires Callback on breach   │
│  triggerReentry()           │──────▶│  fires Callback on recovery │
│  manualExit()               │       │                             │
│  afterSwap() → PriceUpdate  │──────▶│  subscribes to all events   │
│                             │       │                             │
│  PoolManager ←→ liquidity   │       │  LP state tracked in VM     │
│  LendingPool ←→ parked funds│       │  (entryPrice, threshold,    │
└─────────────────────────────┘       │   status, cooldown)         │
                                      └─────────────────────────────┘
```

---

## Smart Contracts

| Contract | File | Purpose |
|---|---|---|
| **ILexHook** | `contracts/src/ILexHook.sol` | Uniswap v4 hook — manages LP positions, add/remove liquidity, park funds in lending pool, emit events for RSC |
| **ILexReactive** | `contracts/src/ILexReactive.sol` | Reactive Smart Contract — subscribes to hook events, monitors IL, fires exit/reentry callbacks |
| **ILMath** | `contracts/src/libraries/ILMath.sol` | Pure math — IL calculation, price deviation, sqrtPriceX96 conversion |
| **SwapHelper** | `contracts/src/SwapHelper.sol` | Helper contract for executing swaps via PoolManager |
| **MockLendingPool** | `contracts/src/mocks/MockLendingPool.sol` | Simulates 3% APY lending pool for testnet/testing |
| **MockERC20** | `contracts/src/mocks/MockERC20.sol` | Test ERC20 token |

---

## Reactive Network Integration

### Why

Reactive Network provides **on-chain, event-driven automation** without off-chain bots, keepers, or relayers. The RSC runs inside a ReactVM on the Lasna testnet, subscribed to ILexHook events on Unichain Sepolia. Every swap triggers a `PriceUpdate` event; the RSC evaluates IL for every tracked LP and fires cross-chain callbacks when thresholds are breached or price recovers.

There is no alternative to the RSC — no cron job, no keeper network, no manual trigger. Reactive Network is the core automation layer that makes this product work.

### How

1. `ILexReactive` subscribes to five event topics from `ILexHook` at deploy time (via `subscribe()` calls in the constructor and `subscribeAll()`).
2. When a subscribed event is emitted, the Reactive Network delivers it to the RSC's `react()` function inside the ReactVM.
3. The RSC decodes the event, updates its LP state, evaluates IL conditions, and optionally emits a `Callback` event.
4. Reactive Network reads the `Callback` event and submits a transaction to the destination chain (Unichain Sepolia) via the **Callback Proxy** contract.
5. The Callback Proxy calls `triggerExit()` or `triggerReentry()` on ILexHook, which performs the actual position management.

### Where

| Component | File | Lines |
|---|---|---|
| **Event subscriptions** | `contracts/src/ILexReactive.sol` | Constructor + `subscribeAll()` — subscribes to `PositionCreated`, `PriceUpdate`, `PositionExited`, `PositionReentered`, `ManualExit` |
| **Event handling logic** | `contracts/src/ILexReactive.sol` | `react()` (dispatching), `_handlePositionCreated()` (LP registration), `_handlePriceUpdate()` (IL check + callback emission), `_handlePositionExited()`, `_handlePositionReentered()`, `_handleManualExit()` |
| **Callback emission** | `contracts/src/ILexReactive.sol` | `_handlePriceUpdate()` — emits `Callback(destinationChainId, hookAddress, gasLimit, payload)` |
| **Callback receiver** | `contracts/src/ILexHook.sol` | `triggerExit()` (onlyCallbackProxy + onlyAuthorizedRvm), `triggerReentry()` (onlyCallbackProxy + onlyAuthorizedRvm) |
| **Callback validation** | `contracts/src/ILexHook.sol` | `callbackProxy` (immutable, set in constructor), `authorizedRvmId` (set via `setAuthorizedRvmId()` post-deploy) |
| **Event emission** | `contracts/src/ILexHook.sol` | `afterSwap()` → `PriceUpdate` event; `deposit()` → `PositionCreated`; `triggerExit()` → `PositionExited`; `triggerReentry()` → `PositionReentered`; `manualExit()` → `ManualExit` |
| **Deploy script** | `contracts/script/DeployReactive.s.sol` | Deploys ILexReactive to Lasna with `originChainId=1301`, `destinationChainId=1301`, and the hook address |

---

## Tests

All tests pass, covering unit, integration, and fuzz testing.

```bash
cd contracts
forge test -vv
```

| Test File | Tests | Coverage |
|---|---|---|
| `test/ILexHook.t.sol` | 21 | Deposit, triggerExit, triggerReentry, manualExit, permissions, edge cases |
| `test/ILexReactive.t.sol` | 8 | Event handling, IL threshold checks, callbacks, cooldown, LP tracking |
| `test/ILexIntegration.t.sol` | 8 | Full deposit→exit→yield→reentry cycle, multi-LP, yield math, reentrancy |
| `test/ILMath.t.sol` | 17 | IL calculation, price deviation, sqrtPrice conversion, fuzz testing |

---

## Tech Stack

**Smart Contracts:** Solidity 0.8.26, Foundry, Uniswap v4-core/v4-periphery, Reactive Network (reactive-lib, reactive-test-lib), OpenZeppelin

**Frontend:** Next.js 14 (App Router), TypeScript, wagmi v2, RainbowKit, viem, TailwindCSS, recharts

**Networks:** Unichain Sepolia (Chain 1301) — hooks + lending pool; Reactive Lasna (Chain 5318007) — RSC deployment

---

## Quick Start

```bash
# Install dependencies
cd contracts && forge install

# Run tests
forge test -vv

# Deploy hook to Unichain Sepolia
forge script script/DeployHook.s.sol \
  --rpc-url $UNICHAIN_SEPOLIA_RPC \
  --private-key $UNICHAIN_SEPOLIA_PRIVATE_KEY \
  --broadcast

# Deploy RSC to Lasna
forge script script/DeployReactive.s.sol \
  --rpc-url $REACTIVE_RPC \
  --private-key $REACTIVE_PRIVATE_KEY \
  --broadcast

# Link RSC to hook
cast send $ILEX_HOOK_ADDR \
  "setAuthorizedRvmId(address)" $ILEX_REACTIVE_ADDR \
  --rpc-url $UNICHAIN_SEPOLIA_RPC \
  --private-key $UNICHAIN_SEPOLIA_PRIVATE_KEY

# Start frontend
cd ../frontend && npm install && npm run dev
```

---

## Repository Structure

```
contracts/
├── src/
│   ├── ILexHook.sol             # Uniswap v4 hook
│   ├── ILexReactive.sol         # RSC on Reactive Network
│   ├── SwapHelper.sol           # Swap execution helper
│   ├── libraries/ILMath.sol     # IL math library
│   ├── interfaces/              # IILexHook, ILendingPool
│   └── mocks/                   # MockLendingPool, MockERC20
├── script/                      # Deploy scripts
├── test/                        # Foundry tests
└── foundry.toml

frontend/
├── app/                         # Next.js pages (landing, deposit, dashboard, positions)
├── components/                  # UI components
├── hooks/                       # wagmi hooks (usePosition, useDeposit, etc.)
└── lib/                         # Contract config, wagmi setup, IL math
```

---



## Partner Integrations

### Reactive Network

**File:** `contracts/src/ILexReactive.sol`

The RSC is deployed on Reactive Lasna and subscribes to ILexHook events on Unichain Sepolia. It monitors IL for all registered LPs on every swap and fires automated callbacks — `triggerExit()` when IL exceeds the LP's threshold, `triggerReentry()` when price recovers within tolerance. No bots, no keepers, no manual intervention. Reactive Network is the core automation layer.

### Uniswap v4

**File:** `contracts/src/ILexHook.sol`

The hook uses the `afterSwap` permission flag and manages LP positions directly via PoolManager. Liquidity is added/removed through `poolManager.unlock()` callbacks. The hook emits `PriceUpdate` events after every swap for the RSC to consume.

### MockLendingPool

**File:** `contracts/src/mocks/MockLendingPool.sol`

Exited LP funds are parked in the lending pool to earn simulated 3% APY while the position is inactive. Production deployment replaces this with Aave V3 (same `ILendingPool` interface).
