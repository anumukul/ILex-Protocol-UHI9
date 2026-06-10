const Q96 = 2n ** 96n;

export function calculateILBps(
  entrySqrtPriceX96: bigint,
  currentSqrtPriceX96: bigint
): number {
  if (entrySqrtPriceX96 === 0n) return 0;

  const rQ96 = (currentSqrtPriceX96 * Q96) / entrySqrtPriceX96;
  const numerator = 2n * rQ96;
  const rSquaredQ96 = (rQ96 * rQ96) / Q96;
  const denominator = Q96 + rSquaredQ96;
  const resultQ96 = (numerator * Q96) / denominator;

  const diffQ96 = resultQ96 > Q96 ? resultQ96 - Q96 : Q96 - resultQ96;
  return Number((diffQ96 * 10000n) / Q96);
}

export function sqrtPriceX96ToFloat(sqrtPriceX96: bigint): number {
  const sq = Number(sqrtPriceX96) / Number(Q96);
  return sq * sq;
}

export function priceDeviationBps(
  currentSqrtPriceX96: bigint,
  entrySqrtPriceX96: bigint
): number {
  if (entrySqrtPriceX96 === 0n) return 0;
  const current = Number(currentSqrtPriceX96) / Number(Q96);
  const entry = Number(entrySqrtPriceX96) / Number(Q96);
  const deviation = Math.abs(current - entry) / entry;
  return Math.round(deviation * 10000);
}

export function formatIL(ilBps: number): string {
  return (ilBps / 100).toFixed(2) + "%";
}

export function formatSqrtPrice(sqrtPriceX96: bigint): string {
  return sqrtPriceX96ToFloat(sqrtPriceX96).toFixed(6);
}

export function formatTimestamp(ts: bigint): string {
  const diff = Date.now() / 1000 - Number(ts);
  const mins = Math.floor(diff / 60);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
