import Navbar from "@/components/Navbar";
import DepositForm from "@/components/DepositForm";
import PositionDashboard from "@/components/PositionDashboard";

export default function Home() {
  return (
    <div className="min-h-screen bg-black">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">
            Impermanent Loss Protection
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            Deposit LP tokens into ILexHook to automatically monitor and
            protect your Uniswap v4 positions against impermanent loss.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <DepositForm />
          <PositionDashboard />
        </div>

        <footer className="mt-12 border-t border-white/10 pt-6 text-center text-xs text-gray-600">
          ILex Protocol — Uniswap v4 Hook on Unichain Sepolia
        </footer>
      </main>
    </div>
  );
}
