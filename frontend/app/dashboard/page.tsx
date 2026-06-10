"use client";

import { useAccount } from "wagmi";
import { useState } from "react";
import Navbar from "@/components/Navbar";
import PositionDashboard from "@/components/PositionDashboard";
import ActivityFeed from "@/components/ActivityFeed";
import ILMeter from "@/components/ILMeter";
import PositionCard from "@/components/PositionCard";
import YieldDisplay from "@/components/YieldDisplay";
import ConfirmModal from "@/components/ConfirmModal";
import ILChart from "@/components/ILChart";
import { usePosition } from "@/hooks/usePosition";
import { useManualExit } from "@/hooks/useManualExit";

export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const { position, currentIL, currentSqrtPriceX96 } = usePosition(address);
  const { manualExit, isPending: isExiting } = useManualExit();
  const [showExitModal, setShowExitModal] = useState(false);

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-black">
        <Navbar />
        <div className="mx-auto max-w-md px-4 py-24 text-center text-sm text-gray-400">
          Connect your wallet to view your dashboard.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      <div className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-lg font-semibold text-white">Dashboard</h1>

        <div className="mt-4 space-y-4">
          <ILMeter address={address} />

          {position ? (
            <PositionCard
              position={position}
              currentIL={currentIL}
              currentSqrtPriceX96={currentSqrtPriceX96}
              onManualExit={() => setShowExitModal(true)}
              isExiting={isExiting}
            />
          ) : (
            <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-center">
              <p className="text-sm text-gray-400">No active position</p>
              <a
                href="/deposit"
                className="mt-2 inline-block rounded-md bg-emerald-600 px-4 py-2 text-xs text-white hover:bg-emerald-500"
              >
                Deposit to start
              </a>
            </div>
          )}

          <YieldDisplay
            address={address}
            isParked={position?.status === 3}
          />

          <ILChart address={address} />

          <ConfirmModal
            open={showExitModal}
            title="Exit Position?"
            message="This will remove all liquidity from the pool and return your tokens including any accrued yield. This action cannot be undone."
            confirmLabel="Exit Position"
            onConfirm={() => { manualExit(); setShowExitModal(false); }}
            onCancel={() => setShowExitModal(false)}
            isPending={isExiting}
          />

          <PositionDashboard />
          <ActivityFeed address={address} />
        </div>
      </div>
    </div>
  );
}
