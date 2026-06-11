interface ThresholdSliderProps {
  label: string
  value: number
  onChange: (val: number) => void
  min?: number
  max?: number
  step?: number
  suffix?: string
}

export default function ThresholdSlider({
  label,
  value,
  onChange,
  min = 50,
  max = 5000,
  step = 50,
  suffix,
}: ThresholdSliderProps) {
  const display = (value / 100).toFixed(1)

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div>
          <span className="text-xs text-gray-500">{label}</span>
          {suffix && <span className="ml-1 text-xs text-gray-600">{suffix}</span>}
        </div>
        <span className="font-mono text-sm text-white">{display}%</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-purple-600"
      />
      <div className="mt-1 flex justify-between text-[10px] text-gray-600">
        <span>{(min / 100).toFixed(1)}%</span>
        <span>{(max / 100).toFixed(1)}%</span>
      </div>
    </div>
  )
}
