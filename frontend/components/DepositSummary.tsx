"use client";

import { TICK_PRESETS } from "./RangeSelector";

interface Props {
  amount0: string;
  amount1: string;
  tickPreset?: number;
  tickLower?: number;
  tickUpper?: number;
  ilThresholdBps: number;
  reentryToleranceBps: number;
}

export default function DepositSummary({
  amount0, amount1, tickPreset, tickLower: customLower, tickUpper: customUpper,
  ilThresholdBps, reentryToleranceBps,
}: Props) {
  let lower: number, upper: number;
  if (customLower !== undefined && customUpper !== undefined) {
    lower = customLower;
    upper = customUpper;
  } else {
    const preset = TICK_PRESETS[tickPreset ?? 2] || TICK_PRESETS[2];
    lower = preset.lower;
    upper = preset.upper;
  }

  const amount0Num = parseFloat(amount0 || "0");
  const amount1Num = parseFloat(amount1 || "0");

  return (
    <div className="rounded-md border border-white/10 bg-white/5 p-3 text-xs text-gray-400">
      <div className="flex justify-between">
        <span>Range</span>
        <span className="text-white">{lower} / {upper} ticks</span>
      </div>
      <div className="mt-1 flex justify-between">
        <span>Auto-exit at</span>
        <span className="text-white">{(ilThresholdBps / 100).toFixed(2)}% IL</span>
      </div>
      <div className="mt-1 flex justify-between">
        <span>Reenter within</span>
        <span className="text-white">{(reentryToleranceBps / 100).toFixed(2)}% of entry</span>
      </div>
      <div className="mt-1 flex justify-between">
        <span>Est. liquidity</span>
        <span className="text-white">{(amount0Num + amount1Num).toFixed(4)} (combined)</span>
      </div>
      <div className="mt-1 flex justify-between">
        <span>While parked</span>
        <span className="text-emerald-400">Earn ~3% APY in lending pool</span>
      </div>
    </div>
  );
}
