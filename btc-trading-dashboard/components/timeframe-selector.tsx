"use client"

interface TimeframeSelectorProps {
  selected: string
  onSelect: (timeframe: string) => void
}

export function TimeframeSelector({ selected, onSelect }: TimeframeSelectorProps) {
  const timeframes = [
    { label: "1m", value: "1m" },
    { label: "5m", value: "5m" },
    { label: "15m", value: "15m" },
    { label: "30m", value: "30m" },
    { label: "1h", value: "1h" },
    { label: "4h", value: "4h" },
    { label: "1D", value: "1d" },
    { label: "AVG", value: "avg" },
  ]

  return (
    <div className="bg-slate-800/50 rounded-lg p-4 backdrop-blur-sm border border-slate-700">
      <div className="flex justify-between items-center mb-3">
        <span className="text-sm font-medium">Trend</span>
        <span className="text-sm font-medium">TF</span>
      </div>

      <div className="space-y-2">
        {timeframes.map((tf) => (
          <button
            key={tf.value}
            onClick={() => onSelect(tf.value)}
            className={`w-full flex justify-between items-center px-3 py-2 rounded text-sm transition-colors ${
              selected === tf.value
                ? "bg-green-500/20 text-green-400 border border-green-500/30"
                : "bg-slate-700/50 text-gray-300 hover:bg-slate-700"
            }`}
          >
            <span className="text-green-400">↗</span>
            <span>{tf.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
