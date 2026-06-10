"use client";

import { useYieldAccrued } from "@/hooks/useYieldAccrued";
import { formatTokenAmount } from "@/lib/utils";

interface Props {
  address?: `0x${string}`;
  isParked: boolean;
}

export default function YieldDisplay({ address, isParked }: Props) {
  const { yield0, yield1, formattedApy } = useYieldAccrued(address);

  if (isParked) {
    return (
      <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-3">
        <p className="text-xs text-blue-300">
          Earning {formattedApy || "..."} APY in lending pool
        </p>
      </div>
    );
  }

  if (!yield0 && !yield1) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/5 p-3">
        <p className="text-xs text-gray-400">
          Yield accrued: 0.00 TK0 / 0.00 TK1
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3">
      <p className="text-xs text-emerald-300">
        Yield accrued: {formatTokenAmount(yield0!)} TK0 / {formatTokenAmount(yield1!)} TK1
      </p>
    </div>
  );
}
