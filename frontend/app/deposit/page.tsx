"use client";

import { useState, useMemo, useEffect } from "react";
import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import TokenInput from "@/components/TokenInput";
import RangeSelector, { TICK_PRESETS } from "@/components/RangeSelector";
import ThresholdSlider from "@/components/ThresholdSlider";
import DepositSummary from "@/components/DepositSummary";
import TransactionButton from "@/components/TransactionButton";
import { useDeposit } from "@/hooks/useDeposit";
import { useTokenBalance, useTokenAllowance, useTokenApprove, useTokenMint } from "@/hooks/useToken";
import { hookAddress } from "@/lib/contracts";

const MINT_AMOUNT = 100n * 10n ** 18n;
const token0 = process.env.NEXT_PUBLIC_POOL_TOKEN0_ADDR as `0x${string}`;
const token1 = process.env.NEXT_PUBLIC_POOL_TOKEN1_ADDR as `0x${string}`;

export default function DepositPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { deposit, isPending: isDepositing } = useDeposit();
  const { approve, isPending: isApproving } = useTokenApprove();
  const { mint, isPending: isMinting } = useTokenMint();

  const [step, setStep] = useState(1);
  const [amount0, setAmount0] = useState("0.01");
  const [amount1, setAmount1] = useState("0.01");
  const [tickPreset, setTickPreset] = useState(2);
  const [customLower, setCustomLower] = useState("");
  const [customUpper, setCustomUpper] = useState("");
  const [ilThresholdBps, setIlThresholdBps] = useState(500);
  const [reentryBps, setReentryBps] = useState(200);
  const [tokenApproved0, setTokenApproved0] = useState(false);
  const [tokenApproved1, setTokenApproved1] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const { data: bal0 } = useTokenBalance(token0, address);
  const { data: bal1 } = useTokenBalance(token1, address);
  const { data: allow0 } = useTokenAllowance(token0, address, hookAddress());
  const { data: allow1 } = useTokenAllowance(token1, address, hookAddress());

  const amount0Wei = useMemo(() => {
    try { return BigInt(Math.floor(parseFloat(amount0 || "0") * 1e18)); }
    catch { return 0n; }
  }, [amount0]);

  const amount1Wei = useMemo(() => {
    try { return BigInt(Math.floor(parseFloat(amount1 || "0") * 1e18)); }
    catch { return 0n; }
  }, [amount1]);

  const useCustomRange = customLower !== "" && customUpper !== "";
  const tickLower = useCustomRange ? parseInt(customLower) : TICK_PRESETS[tickPreset].lower;
  const tickUpper = useCustomRange ? parseInt(customUpper) : TICK_PRESETS[tickPreset].upper;

  const canMint0 = bal0 !== undefined && bal0 < amount0Wei;
  const canMint1 = bal1 !== undefined && bal1 < amount1Wei;
  const needApprove0 = !tokenApproved0 && allow0 !== undefined && allow0 < amount0Wei;
  const needApprove1 = !tokenApproved1 && allow1 !== undefined && allow1 < amount1Wei;
  const canDeposit = !canMint0 && !canMint1 && !needApprove0 && !needApprove1;
  const amountsValid = parseFloat(amount0 || "0") > 0 && parseFloat(amount1 || "0") > 0;

  useEffect(() => {
    if (isSuccess) {
      const t = setTimeout(() => router.push("/dashboard"), 2000);
      return () => clearTimeout(t);
    }
  }, [isSuccess, router]);

  function handleDeposit() {
    if (!address) return;
    deposit({
      token0, token1, fee: 3000, tickSpacing: 60,
      tickLower, tickUpper,
      amount0Desired: amount0Wei, amount1Desired: amount1Wei,
      ilThresholdBps: BigInt(ilThresholdBps),
      reentryToleranceBps: BigInt(reentryBps),
    });
    setIsSuccess(true);
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-black">
        <Navbar />
        <div className="mx-auto max-w-md px-4 py-24 text-center text-sm text-gray-400">
          Connect your wallet to create a position.
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-black">
        <Navbar />
        <div className="mx-auto max-w-md px-4 py-24 text-center">
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-6">
            <h2 className="text-lg font-semibold text-emerald-400">Position Created!</h2>
            <p className="mt-2 text-sm text-gray-400">
              Redirecting to dashboard...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      <div className="mx-auto max-w-lg px-4 py-8">
        <div className="flex items-center gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                  step === s
                    ? "bg-emerald-600 text-white"
                    : step > s
                    ? "bg-emerald-600/50 text-white"
                    : "border border-white/20 text-gray-500"
                }`}
              >
                {s}
              </div>
              <span className={`text-xs ${step === s ? "text-white" : "text-gray-600"}`}>
                {s === 1 ? "Amounts" : s === 2 ? "Protection" : "Review"}
              </span>
              {s < 3 && <span className="text-gray-700">›</span>}
            </div>
          ))}
        </div>

        <div className="mt-6 space-y-4">
          {step === 1 && (
            <>
              <TokenInput
                label="Token0 Amount"
                value={amount0}
                onChange={setAmount0}
                balance={bal0}
                onMax={() => bal0 && setAmount0((Number(bal0) / 1e18).toFixed(4))}
              />
              <TokenInput
                label="Token1 Amount"
                value={amount1}
                onChange={setAmount1}
                balance={bal1}
                onMax={() => bal1 && setAmount1((Number(bal1) / 1e18).toFixed(4))}
              />
              <RangeSelector presetIndex={tickPreset} onChange={setTickPreset} />
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="mb-1 block text-xs text-gray-400">Custom Lower Tick</label>
                  <input
                    type="number"
                    value={customLower}
                    onChange={(e) => setCustomLower(e.target.value)}
                    placeholder={String(TICK_PRESETS[tickPreset].lower)}
                    className="w-full rounded-md border border-white/10 bg-black/40 px-2 py-1.5 text-xs text-white outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-xs text-gray-400">Custom Upper Tick</label>
                  <input
                    type="number"
                    value={customUpper}
                    onChange={(e) => setCustomUpper(e.target.value)}
                    placeholder={String(TICK_PRESETS[tickPreset].upper)}
                    className="w-full rounded-md border border-white/10 bg-black/40 px-2 py-1.5 text-xs text-white outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
              <TransactionButton
                label="Next"
                onClick={() => setStep(2)}
                disabled={!amountsValid}
              />
            </>
          )}

          {step === 2 && (
            <>
              <ThresholdSlider
                label="IL Threshold"
                suffix="— exit if exceeded"
                value={ilThresholdBps}
                onChange={setIlThresholdBps}
                min={50} max={5000} step={50}
              />
              <ThresholdSlider
                label="Reentry Tolerance"
                suffix="— reenter when price within this range"
                value={reentryBps}
                onChange={setReentryBps}
                min={50} max={1000} step={50}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 rounded-md border border-white/10 px-4 py-2 text-sm text-gray-400 hover:text-white"
                >
                  Back
                </button>
                <div className="flex-1">
                  <TransactionButton label="Next" onClick={() => setStep(3)} />
                </div>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <DepositSummary
                amount0={amount0}
                amount1={amount1}
                tickLower={tickLower}
                tickUpper={tickUpper}
                ilThresholdBps={ilThresholdBps}
                reentryToleranceBps={reentryBps}
              />
              <div className="space-y-2">
                {canMint0 && (
                  <TransactionButton
                    variant="indigo"
                    label={isMinting ? "Minting..." : "Mint 100 Token0"}
                    onClick={() => mint(token0, address!, MINT_AMOUNT)}
                    disabled={isMinting}
                  />
                )}
                {canMint1 && (
                  <TransactionButton
                    variant="indigo"
                    label={isMinting ? "Minting..." : "Mint 100 Token1"}
                    onClick={() => mint(token1, address!, MINT_AMOUNT)}
                    disabled={isMinting}
                  />
                )}
                {needApprove0 && (
                  <TransactionButton
                    variant="amber"
                    label={isApproving ? "Approving..." : "Approve Token0"}
                    onClick={() => { approve(token0, amount0Wei); setTokenApproved0(true); }}
                    disabled={isApproving}
                  />
                )}
                {needApprove1 && (
                  <TransactionButton
                    variant="amber"
                    label={isApproving ? "Approving..." : "Approve Token1"}
                    onClick={() => { approve(token1, amount1Wei); setTokenApproved1(true); }}
                    disabled={isApproving}
                  />
                )}
                <TransactionButton
                  label={isDepositing ? "Confirming..." : "Deposit"}
                  onClick={handleDeposit}
                  disabled={!canDeposit || isDepositing}
                />
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-full rounded-md border border-white/10 px-4 py-2 text-sm text-gray-400 hover:text-white"
                >
                  Back
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
