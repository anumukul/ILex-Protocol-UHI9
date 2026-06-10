"use client";

interface Props {
  label: string;
  value: string;
  onChange: (v: string) => void;
  balance?: bigint;
  onMax?: () => void;
  disabled?: boolean;
}

export default function TokenInput({ label, value, onChange, balance, onMax, disabled }: Props) {
  return (
    <div>
      <label className="mb-1 block text-xs text-gray-400">{label}</label>
      <div className="flex gap-2">
        <input
          type="number" step="0.001" min="0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500 disabled:opacity-50"
        />
        {onMax && (
          <button
            type="button"
            onClick={onMax}
            className="rounded-md border border-white/10 px-2 text-xs text-gray-400 hover:text-white"
          >
            Max
          </button>
        )}
      </div>
      <div className="mt-1 text-xs text-gray-500">
        Balance: {balance !== undefined ? (Number(balance) / 1e18).toFixed(4) : "..."}
      </div>
    </div>
  );
}
