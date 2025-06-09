interface PriceDisplayProps {
  price: number
  countdown: number
  change24h?: number
  isLoading?: boolean
}

export function PriceDisplay({ price, countdown, change24h = 0, isLoading = false }: PriceDisplayProps) {
  const isPositive = change24h >= 0

  console.log("💰 PriceDisplay render:", { price, change24h, isLoading })

  if (isLoading || price === 0) {
    return (
      <div className="text-right">
        <div className="text-3xl font-bold animate-pulse">Loading...</div>
        <div className="text-gray-400 text-sm">Fetching live data</div>
      </div>
    )
  }

  return (
    <div className="text-right">
      <div className="text-3xl font-bold text-white">
        $
        {price.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </div>
      <div className="flex items-center justify-end space-x-2 text-sm">
        <span className={isPositive ? "text-green-400" : "text-red-400"}>
          {isPositive ? "+" : ""}
          {change24h.toFixed(2)}%
        </span>
        <span className="text-gray-400">
          {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, "0")}
        </span>
      </div>
    </div>
  )
}
