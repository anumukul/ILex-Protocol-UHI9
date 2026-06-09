"use client";

import { useAccount } from "wagmi";
import { usePosition } from "@/hooks/usePosition";
import { useManualExit } from "@/hooks/useDeposit";
import { cn } from "@/lib/utils";
import {
  PositionStatus,
  STATUS_LABELS,
  STATUS_COLORS,
} from "@/lib/contracts";

function formatBps(bps: bigint | undefined) {
  if (!bps) return "—";
  return `${(Number(bps) / 100).toFixed(2)}%`;
}

function formatEth(wei: bigint | undefined) {
  if (!wei) return "0";
  return (Number(wei) / 1e18).toFixed(4);
}

export default function PositionDashboard() {
  const { address, isConnected } = useAccount();
  const { position, currentIL, parkedFunds, yieldAccrued, isLoading } =
    usePosition(address);
  const { exit, isPending: isExiting } = useManualExit();

  if (!isConnected) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/5 p-6 text-center text-sm text-gray-400">
        Connect your wallet to view your position.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/5 p-6 text-center text-sm text-gray-400">
        Loading...
      </div>
    );
  }

  if (!position || position.status === PositionStatus.NONE) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/5 p-6 text-center text-sm text-gray-400">
        No position found. Create one above.
      </div>
    );
  }

  const isParked =
    position.status === PositionStatus.EXITED ||
    position.status === PositionStatus.EXITING;

  return (
    <div className="space-y-4 rounded-lg border border-white/10 bg-white/5 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">Your Position</h2>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-xs font-medium text-white",
            STATUS_COLORS[position.status as PositionStatus] ||
              "bg-gray-500",
          )}
        >
          {STATUS_LABELS[position.status as PositionStatus] || "Unknown"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <div className="text-xs text-gray-500">Current IL</div>
          <div
            className={cn(
              "font-mono font-medium",
              currentIL && currentIL > 0n
                ? "text-red-400"
                : "text-emerald-400",
            )}
          >
            {formatBps(currentIL)}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Threshold</div>
          <div className="font-mono text-white">
            {formatBps(position.ilThresholdBps)}
          </div>
        </div>
      </div>

      {isParked && parkedFunds && (
        <div className="space-y-1 border-t border-white/10 pt-3">
          <div className="text-xs font-medium text-gray-400">Parked Funds</div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-xs text-gray-500">Token0</div>
              <div className="font-mono text-white">
                {formatEth(parkedFunds.token0Deposited)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Token1</div>
              <div className="font-mono text-white">
                {formatEth(parkedFunds.token1Deposited)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Yield</div>
              <div className="font-mono text-emerald-400">
                {formatEth(yieldAccrued)}
              </div>
            </div>
          </div>
        </div>
      )}

      {position.status === PositionStatus.ACTIVE && (
        <button
          onClick={() => exit()}
          disabled={isExiting}
          className="w-full rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isExiting ? "Confirming..." : "Manual Exit"}
        </button>
      )}
    </div>
  );
}
