"use client";

interface Props {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label: string;
  suffix: string;
}

export default function ThresholdSlider({
  value, onChange, min = 50, max = 5000, step = 50,
  label, suffix,
}: Props) {
  return (
    <div>
      <label className="mb-1 block text-xs text-gray-400">
        {label}: {(value / 100).toFixed(2)}% {suffix}
      </label>
      <input
        type="range" min={min} max={max} step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-emerald-500"
      />
      <div className="text-xs text-gray-500">
        {label} {(value / 100).toFixed(2)}% {suffix}
      </div>
    </div>
  );
}
