import type { TradingSignal } from "@/lib/trading-strategy"
import type { SignalOutcome } from "@/lib/signal-tracker"

interface TradingSignalsProps {
  signals: TradingSignal[]
  signalHistory: SignalOutcome[]
}

export function TradingSignals({ signals, signalHistory }: TradingSignalsProps) {
  if (signals.length === 0) {
    return (
      <div className="bg-slate-800/50 rounded-lg p-4 backdrop-blur-sm border border-slate-700">
        <h3 className="text-lg font-semibold mb-4">Trading Signals</h3>
        <div className="text-center py-8">
          <div className="animate-pulse">
            <div className="w-12 h-12 bg-blue-500/20 rounded-full mx-auto mb-4 flex items-center justify-center">
              <div className="w-6 h-6 bg-blue-500 rounded-full animate-ping"></div>
            </div>
            <p className="text-gray-400">Analyzing market conditions...</p>
            <p className="text-sm text-gray-500 mt-2">Advanced strategy scanning for opportunities</p>
          </div>
        </div>
      </div>
    )
  }

  const latestSignal = signals[signals.length - 1]

  return (
    <div className="bg-slate-800/50 rounded-lg p-4 backdrop-blur-sm border border-slate-700">
      <h3 className="text-lg font-semibold mb-4">Trading Signals</h3>

      <div className="space-y-4">
        {/* Latest Signal */}
        <div className="border border-slate-600 rounded-lg p-3">
          <div className="flex items-center justify-between mb-3">
            <div
              className={`px-3 py-1 rounded text-sm font-medium ${
                latestSignal.type === "buy" ? "bg-green-500 text-white" : "bg-red-500 text-white"
              }`}
            >
              {latestSignal.type.toUpperCase()}
            </div>
            <div className="text-right text-xs">
              <div className="text-gray-400">Strength: {latestSignal.strength.strength}%</div>
              <div className="text-gray-400">Confidence: {latestSignal.strength.confidence}%</div>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Entry:</span>
              <span className="text-yellow-400 font-medium">${latestSignal.entry.toFixed(2)}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-400">TP1:</span>
              <span className="text-green-400 font-medium">${latestSignal.tp1.toFixed(2)}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-400">TP2:</span>
              <span className="text-green-400 font-medium">${latestSignal.tp2.toFixed(2)}</span>
            </div>

            {latestSignal.tp3 && (
              <div className="flex justify-between">
                <span className="text-gray-400">TP3:</span>
                <span className="text-green-400 font-medium">${latestSignal.tp3.toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between">
              <span className="text-gray-400">Stop Loss:</span>
              <span className="text-red-400 font-medium">${latestSignal.sl.toFixed(2)}</span>
            </div>
          </div>

          {/* Signal Reasons */}
          <div className="mt-3 pt-3 border-t border-slate-600">
            <div className="text-xs text-gray-400 mb-2">Signal Reasons:</div>
            <div className="space-y-1">
              {latestSignal.strength.reasons.map((reason, index) => (
                <div key={index} className="text-xs text-green-400 flex items-center">
                  <span className="w-1 h-1 bg-green-400 rounded-full mr-2"></span>
                  {reason}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Signal History */}
        {signalHistory.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-400 mb-2">Recent Signals</h4>
            <div className="space-y-2">
              {signalHistory
                .slice(-5)
                .reverse()
                .map((outcome, index) => (
                  <div key={index} className="flex items-center justify-between text-xs bg-slate-700/30 rounded p-2">
                    <div className="flex items-center space-x-2">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          outcome.signal.type === "buy" ? "bg-green-500" : "bg-red-500"
                        }`}
                      ></div>
                      <span className="capitalize">{outcome.signal.type}</span>
                      <span className="text-gray-400">${outcome.signal.entry.toFixed(0)}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-400">{outcome.signal.strength.strength}%</span>
                      {outcome.outcome !== "pending" ? (
                        <span
                          className={`px-2 py-0.5 rounded text-xs ${
                            outcome.outcome === "success"
                              ? "bg-green-500/20 text-green-400 border border-green-500/30"
                              : "bg-red-500/20 text-red-400 border border-red-500/30"
                          }`}
                        >
                          {outcome.outcome === "success" ? "SUCCESS" : "LOSS"}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                          PENDING
                        </span>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
