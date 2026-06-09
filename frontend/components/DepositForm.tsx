"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { useDeposit } from "@/hooks/useDeposit";

const DEFAULT_TICK_LOWER = -120;
const DEFAULT_TICK_UPPER = 120;
const DEFAULT_AMOUNT = "0.01";
const DEFAULT_IL_THRESHOLD = 200;
const DEFAULT_REENTRY_TOLERANCE = 100;

export default function DepositForm() {
  const { address, isConnected } = useAccount();
  const { deposit, isPending } = useDeposit();
  const [amount, setAmount] = useState(DEFAULT_AMOUNT);
  const [ilThreshold, setIlThreshold] = useState(DEFAULT_IL_THRESHOLD);
  const [reentryTol, setReentryTol] = useState(DEFAULT_REENTRY_TOLERANCE);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!address) return;

    const amountWei = BigInt(Math.floor(parseFloat(amount) * 1e18));

    deposit({
      token0: process.env.NEXT_PUBLIC_POOL_TOKEN0_ADDR as `0x${string}`,
      token1: process.env.NEXT_PUBLIC_POOL_TOKEN1_ADDR as `0x${string}`,
      fee: 3000,
      tickSpacing: 60,
      tickLower: DEFAULT_TICK_LOWER,
      tickUpper: DEFAULT_TICK_UPPER,
      amount0Desired: amountWei,
      amount1Desired: amountWei,
      ilThresholdBps: BigInt(ilThreshold),
      reentryToleranceBps: BigInt(reentryTol),
    });
  }

  if (!isConnected) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/5 p-6 text-center text-sm text-gray-400">
        Connect your wallet to create a position.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-white/10 bg-white/5 p-6">
      <h2 className="text-sm font-semibold text-white">Create Position</h2>

      <div>
        <label className="mb-1 block text-xs text-gray-400">Amount (ETH)</label>
        <input
          type="number"
          step="0.001"
          min="0.001"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs text-gray-400">IL Threshold (bps)</label>
          <input
            type="number"
            min={50}
            max={5000}
            value={ilThreshold}
            onChange={(e) => setIlThreshold(Number(e.target.value))}
            className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-400">Reentry Tol (bps)</label>
          <input
            type="number"
            min={10}
            max={1000}
            value={reentryTol}
            onChange={(e) => setReentryTol(Number(e.target.value))}
            className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      <div className="text-xs text-gray-500">
        Pool: Token0/Token1 · 0.30% · ±120 tick range
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Confirming..." : "Deposit"}
      </button>
    </form>
  );
}
