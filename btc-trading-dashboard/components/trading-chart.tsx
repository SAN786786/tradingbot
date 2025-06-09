"use client"

import { ResponsiveContainer, ComposedChart, XAxis, YAxis, ReferenceLine, Tooltip, CartesianGrid } from "recharts"
import { useState, useMemo } from "react"

interface PriceData {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

interface TradingSignal {
  type: "buy" | "sell"
  price: number
  timestamp: number
  entry: number
  tp1: number
  tp2: number
  sl: number
  strength: {
    strength: number
    confidence: number
    reasons: string[]
  }
}

interface TradingChartProps {
  data: PriceData[]
  signals: TradingSignal[]
  currentPrice: number
}

export function TradingChart({ data, signals, currentPrice }: TradingChartProps) {
  const [hoveredCandle, setHoveredCandle] = useState<number | null>(null)

  console.log("📊 TradingChart render:", {
    dataLength: data.length,
    signalsLength: signals.length,
    currentPrice,
    firstCandle: data[0],
    lastCandle: data[data.length - 1],
  })

  const chartData = useMemo(() => {
    if (!data || data.length === 0) {
      console.log("❌ No chart data available")
      return []
    }

    return data.map((d, index) => ({
      time: new Date(d.timestamp).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
      timestamp: d.timestamp,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
      volume: d.volume,
      index,
    }))
  }, [data])

  const latestSignal = signals.length > 0 ? signals[signals.length - 1] : null

  const priceRange = useMemo(() => {
    if (chartData.length === 0) return { min: 40000, max: 50000 }

    const highs = chartData.map((d) => d.high)
    const lows = chartData.map((d) => d.low)
    const min = Math.min(...lows)
    const max = Math.max(...highs)
    const padding = (max - min) * 0.1 // 10% padding

    return {
      min: min - padding,
      max: max + padding,
    }
  }, [chartData])

  if (!data || data.length === 0) {
    return (
      <div className="bg-slate-800/50 rounded-lg p-4 backdrop-blur-sm border border-slate-700">
        <div className="h-96 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading chart data...</p>
          </div>
        </div>
      </div>
    )
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-slate-900/95 border border-slate-600 rounded-lg p-3 text-xs">
          <p className="text-gray-300 mb-2">{label}</p>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-400">Open:</span>
              <span className="text-white">${data.open?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">High:</span>
              <span className="text-green-400">${data.high?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Low:</span>
              <span className="text-red-400">${data.low?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Close:</span>
              <span className="text-white">${data.close?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Volume:</span>
              <span className="text-blue-400">{data.volume?.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="bg-slate-800/50 rounded-lg p-4 backdrop-blur-sm border border-slate-700 relative">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Bitcoin Price Chart</h3>
        <div className="text-sm text-gray-400">
          {chartData.length} candles | Current: ${currentPrice.toFixed(2)}
        </div>
      </div>

      <div className="h-96 w-full relative">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 20, right: 80, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />

            <XAxis
              dataKey="time"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#9CA3AF", fontSize: 11 }}
              interval="preserveStartEnd"
            />

            <YAxis
              domain={[priceRange.min, priceRange.max]}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#9CA3AF", fontSize: 11 }}
              orientation="right"
              tickFormatter={(value) => `$${value.toFixed(0)}`}
            />

            <Tooltip content={<CustomTooltip />} />

            {/* Current Price Line */}
            <ReferenceLine
              y={currentPrice}
              stroke="#10B981"
              strokeWidth={2}
              strokeDasharray="5 5"
              label={{ value: `Current: $${currentPrice.toFixed(2)}`, position: "topRight" }}
            />

            {/* Trading Levels */}
            {latestSignal && (
              <>
                <ReferenceLine
                  y={latestSignal.entry}
                  stroke="#F59E0B"
                  strokeWidth={2}
                  strokeDasharray="8 4"
                  label={{ value: `Entry: $${latestSignal.entry.toFixed(2)}`, position: "topRight" }}
                />
                <ReferenceLine
                  y={latestSignal.tp1}
                  stroke="#10B981"
                  strokeWidth={1}
                  strokeDasharray="4 4"
                  label={{ value: `TP1: $${latestSignal.tp1.toFixed(2)}`, position: "topRight" }}
                />
                <ReferenceLine
                  y={latestSignal.tp2}
                  stroke="#10B981"
                  strokeWidth={1}
                  strokeDasharray="4 4"
                  label={{ value: `TP2: $${latestSignal.tp2.toFixed(2)}`, position: "topRight" }}
                />
                <ReferenceLine
                  y={latestSignal.sl}
                  stroke="#EF4444"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  label={{ value: `SL: $${latestSignal.sl.toFixed(2)}`, position: "topRight" }}
                />
              </>
            )}
          </ComposedChart>
        </ResponsiveContainer>

        {/* Custom Candlesticks Overlay */}
        <svg className="absolute inset-0 pointer-events-none" width="100%" height="100%" style={{ top: 0, left: 0 }}>
          {chartData.map((candle, index) => {
            if (!candle.open || !candle.high || !candle.low || !candle.close) return null

            // Calculate positions
            const chartWidth = 100 // percentage
            const chartHeight = 100 // percentage
            const candleWidth = Math.max(1, (chartWidth / chartData.length) * 0.8)
            const x = (index / (chartData.length - 1)) * (chartWidth - candleWidth) + candleWidth / 2

            const priceRangeObj = priceRange
            const priceRangeMax = priceRangeObj.max
            const priceRangeMin = priceRangeObj.min
            const getY = (price: number) => ((priceRangeMax - price) / (priceRangeMax - priceRangeMin)) * chartHeight

            const openY = getY(candle.open)
            const closeY = getY(candle.close)
            const highY = getY(candle.high)
            const lowY = getY(candle.low)

            const isGreen = candle.close > candle.open
            const bodyTop = Math.min(openY, closeY)
            const bodyHeight = Math.abs(closeY - openY)

            return (
              <g key={index}>
                {/* Wick */}
                <line
                  x1={`${x}%`}
                  y1={`${highY}%`}
                  x2={`${x}%`}
                  y2={`${lowY}%`}
                  stroke={isGreen ? "#10B981" : "#EF4444"}
                  strokeWidth="1"
                />

                {/* Body */}
                <rect
                  x={`${x - candleWidth / 2}%`}
                  y={`${bodyTop}%`}
                  width={`${candleWidth}%`}
                  height={`${Math.max(0.1, bodyHeight)}%`}
                  fill={isGreen ? "#10B981" : "#EF4444"}
                  stroke={isGreen ? "#10B981" : "#EF4444"}
                  strokeWidth="1"
                  opacity={0.8}
                />
              </g>
            )
          })}
        </svg>
      </div>

      {/* Signal Overlays */}
      {signals.length > 0 && (
        <div className="absolute top-20 left-8 space-y-2">
          {signals.slice(-2).map((signal, index) => (
            <div
              key={index}
              className={`px-3 py-2 rounded-lg text-sm font-medium shadow-lg border ${
                signal.type === "buy"
                  ? "bg-green-500/90 text-white border-green-400"
                  : "bg-red-500/90 text-white border-red-400"
              }`}
            >
              <div className="flex items-center space-x-1">
                <span>
                  {signal.type === "buy" ? "🚀" : "📉"} {signal.type.toUpperCase()}
                </span>
                <span className="text-xs">({signal.strength.strength}%)</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Price Labels */}
      {latestSignal && (
        <div className="absolute top-16 right-8 space-y-1 text-xs">
          <div className="bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded border border-yellow-500/30">
            Entry: ${latestSignal.entry.toFixed(2)}
          </div>
          <div className="bg-green-500/20 text-green-400 px-2 py-1 rounded border border-green-500/30">
            TP1: ${latestSignal.tp1.toFixed(2)}
          </div>
          <div className="bg-green-500/20 text-green-400 px-2 py-1 rounded border border-green-500/30">
            TP2: ${latestSignal.tp2.toFixed(2)}
          </div>
          <div className="bg-red-500/20 text-red-400 px-2 py-1 rounded border border-red-500/30">
            SL: ${latestSignal.sl.toFixed(2)}
          </div>
        </div>
      )}

      {/* Volume Bars */}
      <div className="h-16 w-full mt-4 relative">
        <div className="text-xs text-gray-400 mb-1">Volume</div>
        <div className="flex items-end h-12 space-x-1">
          {chartData.map((candle, index) => {
            if (!candle.volume) return null

            const maxVolume = Math.max(...chartData.map((d) => d.volume || 0))
            const height = maxVolume > 0 ? (candle.volume / maxVolume) * 100 : 0
            const isGreen = candle.close > candle.open

            return (
              <div
                key={index}
                className={`flex-1 ${isGreen ? "bg-green-500/30" : "bg-red-500/30"} rounded-t min-w-0`}
                style={{ height: `${Math.max(2, height)}%` }}
                title={`Volume: ${candle.volume?.toLocaleString()}`}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}
