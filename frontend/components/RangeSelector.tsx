"use client";

export const TICK_PRESETS = [
  { label: "±1%", lower: -10, upper: 10 },
  { label: "±2%", lower: -20, upper: 20 },
  { label: "±5%", lower: -60, upper: 60 },
  { label: "±10%", lower: -120, upper: 120 },
];

interface Props {
  presetIndex: number;
  onChange: (index: number) => void;
}

export default function RangeSelector({ presetIndex, onChange }: Props) {
  return (
    <div>
      <label className="mb-1 block text-xs text-gray-400">Tick Range</label>
      <div className="grid grid-cols-4 gap-2">
        {TICK_PRESETS.map((p, i) => (
          <button
            key={p.label}
            type="button"
            onClick={() => onChange(i)}
            className={`rounded-md border px-2 py-1.5 text-xs transition-colors ${
              presetIndex === i
                ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                : "border-white/10 text-gray-400 hover:border-white/30"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
