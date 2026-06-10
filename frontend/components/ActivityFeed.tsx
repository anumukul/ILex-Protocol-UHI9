"use client";

import { useActivityFeed, type ActivityEvent } from "@/hooks/useActivityFeed";
import { formatTimestamp, formatIL } from "@/lib/ilmath";
import { formatTokenAmount } from "@/lib/utils";

interface Props {
  address?: `0x${string}`;
}

function describeEvent(e: ActivityEvent): string {
  switch (e._eventName) {
    case "Deposited":
      return `Protection activated — deposited ${formatTokenAmount(e.token0Amount as bigint)} TK0 + ${formatTokenAmount(e.token1Amount as bigint)} TK1`;
    case "Exited":
      return `Auto-exit triggered at ${formatIL(Number(e.ilAtExitBps))} IL — funds parked in lending pool`;
    case "Re-entered":
      return `Re-entered pool — earned ${formatTokenAmount(e.yieldEarned0 as bigint)} TK0 + ${formatTokenAmount(e.yieldEarned1 as bigint)} TK1 yield while parked`;
    case "Manual Exit":
      return `Manual exit — returned ${formatTokenAmount(e.token0Returned as bigint)} TK0 + ${formatTokenAmount(e.token1Returned as bigint)} TK1`;
    default:
      return e._eventName || "Event";
  }
}

export default function ActivityFeed({ address }: Props) {
  const { data: events, isLoading, error } = useActivityFeed(address);

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <h3 className="text-sm font-medium text-white">
        {address ? "Your Activity" : "Global Activity"}
      </h3>
      {isLoading ? (
        <p className="mt-3 text-xs text-gray-500">Loading...</p>
      ) : error ? (
        <p className="mt-3 text-xs text-red-400">Error: {error}</p>
      ) : events && events.length > 0 ? (
        <ul className="mt-3 space-y-3">
          {events.map((e: ActivityEvent, i: number) => (
            <li key={i} className="flex items-start gap-2 text-xs">
              <span
                className={`mt-0.5 inline-block h-2 w-2 shrink-0 rounded-full ${
                  e._eventName === "Exited"
                    ? "bg-red-400"
                    : e._eventName === "Deposited"
                    ? "bg-emerald-400"
                    : "bg-blue-400"
                }`}
              />
              <div className="flex-1">
                <p className="text-gray-300">{describeEvent(e)}</p>
                <p className="mt-0.5 text-gray-600">
                  {e.blockTimestamp ? formatTimestamp(e.blockTimestamp) : ""}
                </p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-xs text-gray-500">No activity yet</p>
      )}
    </div>
  );
}
