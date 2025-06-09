interface PerformanceMetricsProps {
  metrics: {
    totalSignals: number
    successfulSignals: number
    failedSignals: number
    winRate: number
    totalProfit: number
    avgProfit: number
    avgWin: number
    avgLoss: number
    profitFactor: number
  }
}

export function PerformanceMetrics({ metrics }: PerformanceMetricsProps) {
  const isPositive = metrics.totalProfit >= 0

  return (
    <div className="bg-slate-800/50 rounded-lg p-4 backdrop-blur-sm border border-slate-700">
      <h3 className="text-lg font-semibold mb-4">Signal Performance</h3>

      {metrics.totalSignals === 0 ? (
        <div className="text-center py-4">
          <p className="text-gray-400">No completed signals yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Win Rate */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Win Rate</span>
              <span className="font-medium">{metrics.winRate.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full"
                style={{ width: `${Math.min(100, Math.max(0, metrics.winRate))}%` }}
              ></div>
            </div>
          </div>

          {/* Total Profit */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-400">Total Profit</span>
            <span className={`font-medium ${isPositive ? "text-green-400" : "text-red-400"}`}>
              {isPositive ? "+" : ""}
              {metrics.totalProfit.toFixed(2)}%
            </span>
          </div>

          {/* Signal Stats */}
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="bg-slate-700/50 rounded p-2">
              <div className="text-2xl font-bold text-green-400">{metrics.successfulSignals}</div>
              <div className="text-xs text-gray-400">Wins</div>
            </div>
            <div className="bg-slate-700/50 rounded p-2">
              <div className="text-2xl font-bold text-red-400">{metrics.failedSignals}</div>
              <div className="text-xs text-gray-400">Losses</div>
            </div>
          </div>

          {/* Detailed Stats */}
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Avg. Win</span>
              <span className="text-green-400">+{metrics.avgWin.toFixed(2)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Avg. Loss</span>
              <span className="text-red-400">{metrics.avgLoss.toFixed(2)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Profit Factor</span>
              <span className={metrics.profitFactor >= 1 ? "text-green-400" : "text-red-400"}>
                {metrics.profitFactor.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
