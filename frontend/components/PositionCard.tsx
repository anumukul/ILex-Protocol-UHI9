"use client";

import { PositionStatus } from "@/lib/contracts";
import StatusBadge from "./StatusBadge";
import { formatSqrtPrice, formatIL, formatTimestamp } from "@/lib/ilmath";

interface RawPosition {
  poolKey?: {
    currency0: `0x${string}`;
    currency1: `0x${string}`;
    fee: number;
    tickSpacing: number;
    hooks: `0x${string}`;
  };
  tickLower: number;
  tickUpper: number;
  liquidity: bigint;
  entrySqrtPriceX96: bigint;
  ilThresholdBps: bigint;
  reentryToleranceBps: bigint;
  status: number;
  depositTimestamp: bigint;
}

interface Props {
  position: RawPosition;
  currentIL?: bigint;
  currentSqrtPriceX96?: bigint;
  onManualExit?: () => void;
  isExiting?: boolean;
}

export default function PositionCard({ position, currentIL, currentSqrtPriceX96, onManualExit, isExiting }: Props) {
  const ilBps = Number(currentIL || 0n);
  const threshold = Number(position.ilThresholdBps || 500n);
  const pct = threshold > 0 ? Math.min((ilBps / threshold) * 100, 100) : 0;
  const ilColor = pct < 50 ? "text-emerald-400" : pct < 80 ? "text-amber-400" : "text-red-400";

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between">
        <StatusBadge status={position.status as PositionStatus} />
        <span className="text-xs text-gray-500" title="Time since deposit">
          {position.depositTimestamp ? formatTimestamp(position.depositTimestamp) : ""}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
        <div>
          <span className="text-gray-500">Entry Price</span>
          <p className="font-mono text-white">
            {position.entrySqrtPriceX96 ? formatSqrtPrice(position.entrySqrtPriceX96) : "..."}
          </p>
        </div>
        <div>
          <span className="text-gray-500">Current Price</span>
          <p className="font-mono text-white">
            {currentSqrtPriceX96 ? formatSqrtPrice(currentSqrtPriceX96) : "..."}
          </p>
        </div>
        <div>
          <span className="text-gray-500">Current IL</span>
          <p className={`font-mono ${ilColor}`}>
            {formatIL(ilBps)} / {formatIL(threshold)}
          </p>
        </div>
        <div>
          <span className="text-gray-500">IL Threshold</span>
          <p className="font-mono text-white">{formatIL(threshold)}</p>
        </div>
        <div>
          <span className="text-gray-500">Reentry Tolerance</span>
          <p className="font-mono text-white">
            {formatIL(Number(position.reentryToleranceBps || 0n))}
          </p>
        </div>
      </div>

      {position.status === PositionStatus.ACTIVE && onManualExit && (
        <button
          type="button"
          disabled={isExiting}
          onClick={onManualExit}
          className="mt-3 w-full rounded-md border border-red-500/50 px-3 py-1.5 text-xs text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-50"
        >
          {isExiting ? "Exiting..." : "Manual Exit"}
        </button>
      )}
    </div>
  );
}
