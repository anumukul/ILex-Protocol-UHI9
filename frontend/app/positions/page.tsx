"use client";

import Navbar from "@/components/Navbar";
import ActivityFeed from "@/components/ActivityFeed";
import { useActivityFeed } from "@/hooks/useActivityFeed";
import { formatTimestamp, formatIL } from "@/lib/ilmath";
import { formatTokenAmount, truncateAddress } from "@/lib/utils";

export default function PositionsPage() {
  const { data: activities, error } = useActivityFeed();

  interface ActivityEvent {
    _eventName: string;
    address: string;
    blockTimestamp?: number;
    ilAtExitBps?: bigint;
    token0Parked?: bigint;
    token1Parked?: bigint;
    token0Returned?: bigint;
    token1Returned?: bigint;
    yieldEarned0?: bigint;
    yieldEarned1?: bigint;
  }

  const allEvents = (activities || []).filter(
    (e: ActivityEvent) => e._eventName === "Exited" || e._eventName === "Manual Exit" || e._eventName === "Re-entered"
  );

  function exitRow(e: ActivityEvent, i: number) {
    const label = e._eventName === "Manual Exit" ? "Manual Exit" : e._eventName === "Re-entered" ? "Re-entered" : "Exited";
    const badgeColor = e._eventName === "Manual Exit" ? "bg-amber-500/20 text-amber-300" : e._eventName === "Re-entered" ? "bg-emerald-500/20 text-emerald-300" : "bg-blue-500/20 text-blue-300";
    const ilCell = e._eventName === "Exited" ? formatIL(Number(e.ilAtExitBps || 0)) : "—";
    const token0Cell = e._eventName === "Exited" ? formatTokenAmount(e.token0Parked as bigint) : e._eventName === "Manual Exit" ? formatTokenAmount(e.token0Returned as bigint) : "—";
    const token1Cell = e._eventName === "Exited" ? formatTokenAmount(e.token1Parked as bigint) : e._eventName === "Manual Exit" ? formatTokenAmount(e.token1Returned as bigint) : "—";
    const yieldCell = e._eventName === "Re-entered" ? `${formatTokenAmount(e.yieldEarned0 as bigint)} / ${formatTokenAmount(e.yieldEarned1 as bigint)}` : "—";
    return (
      <tr key={i} className="border-b border-white/5 text-gray-300">
        <td className="py-2 pr-4 font-mono">{truncateAddress(e.address, 6)}</td>
        <td className="py-2 pr-4">
          <span className={`rounded-full px-2 py-0.5 ${badgeColor}`}>
            {label}
          </span>
        </td>
        <td className="py-2 pr-4">{ilCell}</td>
        <td className="py-2 pr-4 font-mono">{token0Cell}</td>
        <td className="py-2 pr-4 font-mono">{token1Cell}</td>
        <td className="py-2 pr-4 font-mono">{yieldCell}</td>
        <td className="py-2 text-gray-600">{e.blockTimestamp ? formatTimestamp(e.blockTimestamp) : ""}</td>
      </tr>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      <div className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-lg font-semibold text-white">Protocol Activity</h1>

        <div className="mt-4 space-y-4">
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <h2 className="text-sm font-medium text-white">Recent Exits & Re-entries</h2>
            {error ? (
              <p className="mt-3 text-xs text-red-400">Error: {error}</p>
            ) : allEvents.length > 0 ? (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-left text-gray-500">
                      <th className="pb-2 pr-4 font-medium">LP</th>
                      <th className="pb-2 pr-4 font-medium">Status</th>
                      <th className="pb-2 pr-4 font-medium">IL at Exit</th>
                      <th className="pb-2 pr-4 font-medium">Token0</th>
                      <th className="pb-2 pr-4 font-medium">Token1</th>
                      <th className="pb-2 pr-4 font-medium" title="Yield Earned (Token0 / Token1)">Yield</th>
                      <th className="pb-2 font-medium">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allEvents.slice(0, 50).map((e: ActivityEvent, i: number) => exitRow(e, i))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-3 text-xs text-gray-500">No events yet</p>
            )}
          </div>

          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <h2 className="text-sm font-medium text-white">Live Feed</h2>
            <ActivityFeed />
          </div>
        </div>
      </div>
    </div>
  );
}
