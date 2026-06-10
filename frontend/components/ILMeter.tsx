"use client";

import { usePosition } from "@/hooks/usePosition";
import { formatIL } from "@/lib/ilmath";

interface Props {
  address?: `0x${string}`;
}

export default function ILMeter({ address }: Props) {
  const { position, currentIL } = usePosition(address);

  if (!position?.entrySqrtPriceX96) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/5 p-4">
        <div className="h-4 w-full rounded-full bg-white/10" />
      </div>
    );
  }

  const ilBps = Number(currentIL || 0n);
  const threshold = Number(position.ilThresholdBps || 500n);
  const pct = threshold > 0 ? Math.min((ilBps / threshold) * 100, 100) : 0;
  const color = pct < 50 ? "bg-emerald-500" : pct < 80 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">IL Meter</span>
        <span className="text-xs text-gray-400">
          {formatIL(ilBps)} / {formatIL(threshold)}
        </span>
      </div>
      <div className="relative mt-2 h-4 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
        <div
          className="absolute top-0 h-full w-0.5 bg-white/80"
          style={{ left: "100%" }}
          title="Threshold"
        />
      </div>
      <p className="mt-1 text-xs text-gray-500">
        Auto-exit triggers at {formatIL(threshold)}
      </p>
    </div>
  );
}
