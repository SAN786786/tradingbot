"use client"

import { useState, useEffect } from "react"
import type { BinanceTradingBot, BinanceAccount } from "@/lib/trading-bot"

interface TradingBotDashboardProps {
  bot: BinanceTradingBot
  onTradeExecuted?: () => void
}

export function TradingBotDashboard({ bot, onTradeExecuted }: TradingBotDashboardProps) {
  const [account, setAccount] = useState<BinanceAccount | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [botStatus, setBotStatus] = useState(bot.getStatus())

  useEffect(() => {
    const fetchAccount = async () => {
      try {
        setIsLoading(true)
        const accountData = await bot.getAccount()
        setAccount(accountData)
        setBotStatus(bot.getStatus())
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch account")
      } finally {
        setIsLoading(false)
      }
    }

    fetchAccount()
    const interval = setInterval(fetchAccount, 5000) // Update every 5 seconds

    return () => clearInterval(interval)
  }, [bot])

  if (isLoading && !account) {
    return (
      <div className="bg-slate-800/50 rounded-lg p-4 backdrop-blur-sm border border-slate-700">
        <div className="animate-pulse">
          <div className="h-4 bg-slate-700 rounded w-1/4 mb-4"></div>
          <div className="space-y-2">
            <div className="h-3 bg-slate-700 rounded"></div>
            <div className="h-3 bg-slate-700 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-slate-800/50 rounded-lg p-4 backdrop-blur-sm border border-red-500/50">
        <h3 className="text-lg font-semibold text-red-400 mb-2">🚨 Bot Error</h3>
        <p className="text-red-300 text-sm">{error}</p>
      </div>
    )
  }

  const totalPnL = account?.unrealizedPnl ?? 0
  const totalBalance = account?.totalBalance ?? 0
  const availableBalance = account?.availableBalance ?? 0
  const positions = account?.positions ?? []

  return (
    <div className="space-y-4">
      {/* Bot Status */}
      <div className="bg-slate-800/50 rounded-lg p-4 backdrop-blur-sm border border-slate-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">🤖 Trading Bot</h3>
          <div
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              botStatus.isActive ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
            }`}
          >
            {botStatus.isActive ? "🟢 ACTIVE" : "🔴 INACTIVE"}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Leverage:</span>
            <span className="ml-2 font-medium">⚡ {botStatus.leverage}x</span>
          </div>
          <div>
            <span className="text-gray-400">Position Size:</span>
            <span className="ml-2 font-medium">💵 ${botStatus.positionSize}</span>
          </div>
        </div>
      </div>

      {/* Account Balance */}
      <div className="bg-slate-800/50 rounded-lg p-4 backdrop-blur-sm border border-slate-700">
        <h3 className="text-lg font-semibold mb-3">💰 Account Balance</h3>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Total Balance:</span>
            <span className="text-xl font-bold">${(totalBalance || 0).toFixed(2)}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-400">Available:</span>
            <span className="font-medium">${(availableBalance || 0).toFixed(2)}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-400">Unrealized P&L:</span>
            <span className={`font-bold ${(totalPnL || 0) >= 0 ? "text-green-400" : "text-red-400"}`}>
              {(totalPnL || 0) >= 0 ? "+" : ""}${(totalPnL || 0).toFixed(2)}
            </span>
          </div>

          {totalPnL !== 0 && totalBalance > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-gray-400">P&L %:</span>
              <span className={`font-bold ${(totalPnL || 0) >= 0 ? "text-green-400" : "text-red-400"}`}>
                {(totalPnL || 0) >= 0 ? "+" : ""}
                {(((totalPnL || 0) / (totalBalance || 1)) * 100).toFixed(2)}%
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Current Positions */}
      <div className="bg-slate-800/50 rounded-lg p-4 backdrop-blur-sm border border-slate-700">
        <h3 className="text-lg font-semibold mb-3">📊 Current Positions</h3>

        {positions.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-gray-400">No open positions</p>
          </div>
        ) : (
          <div className="space-y-3">
            {positions.map((position, index) => (
              <div key={index} className="border border-slate-600 rounded-lg p-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">{position?.symbol || "Unknown"}</span>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      position?.side === "LONG" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                    }`}
                  >
                    {position?.side || "Unknown"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-400">Size:</span>
                    <span className="ml-2">{Math.abs(position?.size || 0).toFixed(3)} BTC</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Entry:</span>
                    <span className="ml-2">${(position?.entryPrice || 0).toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">P&L:</span>
                    <span
                      className={`ml-2 font-medium ${(position?.unrealizedPnl || 0) >= 0 ? "text-green-400" : "text-red-400"}`}
                    >
                      {(position?.unrealizedPnl || 0) >= 0 ? "+" : ""}${(position?.unrealizedPnl || 0).toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">%:</span>
                    <span
                      className={`ml-2 font-medium ${(position?.percentage || 0) >= 0 ? "text-green-400" : "text-red-400"}`}
                    >
                      {(position?.percentage || 0) >= 0 ? "+" : ""}
                      {(position?.percentage || 0).toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Trading Stats */}
      <div className="bg-slate-800/50 rounded-lg p-4 backdrop-blur-sm border border-slate-700">
        <h3 className="text-lg font-semibold mb-3">📈 Trading Performance</h3>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">{totalPnL >= 0 ? "📈" : "📉"}</div>
            <div className="text-gray-400">Status</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{positions.length}</div>
            <div className="text-gray-400">Open Positions</div>
          </div>
        </div>
      </div>
    </div>
  )
}
