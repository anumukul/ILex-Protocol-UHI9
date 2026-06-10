export default function Footer() {
  return (
    <footer className="border-t border-white/10 px-4 py-6 text-center text-xs text-gray-600">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-center gap-4">
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition-colors"
          >
            GitHub
          </a>
          <span className="text-white/20">·</span>
          <a
            href="https://reactive.network"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition-colors"
          >
            Reactive Network
          </a>
          <span className="text-white/20">·</span>
          <a
            href="https://docs.uniswap.org/contracts/v4/overview"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition-colors"
          >
            Uniswap v4
          </a>
        </div>
        <p className="mt-2">ILex Protocol — Uniswap v4 Hook on Unichain Sepolia</p>
      </div>
    </footer>
  );
}
