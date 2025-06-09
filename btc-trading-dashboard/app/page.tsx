"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { TradingChart } from "@/components/trading-chart"
import { TradingSignals } from "@/components/trading-signals"
import { TimeframeSelector } from "@/components/timeframe-selector"
import { PerformanceMetrics } from "@/components/performance-metrics"
import { TradingBotDashboard } from "@/components/trading-bot-dashboard"
import { PriceDisplay } from "@/components/price-display"
import { getCurrentBTCPrice, getBTCKlines, BTCPriceWebSocket, type CryptoPrice, type OHLCData } from "@/lib/crypto-api"
import { AdvancedTradingStrategy, type TradingSignal } from "@/lib/trading-strategy"
import { SignalTracker, type SignalOutcome } from "@/lib/signal-tracker"
import { BinanceTradingBot } from "@/lib/trading-bot"

export default function TradingDashboard() {
  const [currentPrice, setCurrentPrice] = useState<number>(0)
  const [priceInfo, setPriceInfo] = useState<CryptoPrice | null>(null)
  const [priceData, setPriceData] = useState<OHLCData[]>([])
  const [signals, setSignals] = useState<TradingSignal[]>([])
  const [signalHistory, setSignalHistory] = useState<SignalOutcome[]>([])
  const [timeframe, setTimeframe] = useState("1h")
  const [countdown, setCountdown] = useState(60)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "disconnected">("connecting")
  const [dataSource, setDataSource] = useState<string>("Loading...")
  const [botEnabled, setBotEnabled] = useState(false)
  const [botInitialized, setBotInitialized] = useState(false)
  const [tradeLog, setTradeLog] = useState<string[]>([])
  const [performanceMetrics, setPerformanceMetrics] = useState({
    totalSignals: 0,
    successfulSignals: 0,
    failedSignals: 0,
    winRate: 0,
    totalProfit: 0,
    avgProfit: 0,
    avgWin: 0,
    avgLoss: 0,
    profitFactor: 0,
  })

  const strategy = useRef(new AdvancedTradingStrategy())
  const signalTracker = useRef(SignalTracker.getInstance())
  const tradingBot = useRef(new BinanceTradingBot())

  const addToTradeLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setTradeLog((prev) => [`[${timestamp}] ${message}`, ...prev.slice(0, 19)])
  }, [])

  // Initialize trading bot
  useEffect(() => {
    const initBot = async () => {
      try {
        console.log("🤖 Initializing Binance Trading Bot...")
        await tradingBot.current.initialize()
        setBotInitialized(true)
        addToTradeLog("✅ Trading bot initialized successfully!")
        addToTradeLog("⚡ Leverage set to 10x")
        addToTradeLog("💵 Position size: $100 per trade")
        addToTradeLog("🚀 AGGRESSIVE MODE: Faster signal generation!")
      } catch (err) {
        console.error("💥 Bot initialization failed:", err)
        addToTradeLog(`❌ Bot initialization failed: ${err instanceof Error ? err.message : "Unknown error"}`)
      }
    }

    initBot()
  }, [addToTradeLog])

  // Fetch REAL data only
  const fetchRealData = useCallback(async () => {
    try {
      console.log("🚀 Fetching REAL Bitcoin data - NO MOCK DATA")
      setIsLoading(true)
      setError(null)

      // Get REAL current price
      const priceData = await getCurrentBTCPrice()
      console.log("✅ REAL price data received:", priceData)

      if (!priceData.isReal) {
        throw new Error("Received non-real data - only real data is allowed")
      }

      setPriceInfo(priceData)
      setCurrentPrice(priceData.price)
      setDataSource(priceData.source || "Unknown")

      // Get REAL historical data
      const klineData = await getBTCKlines(timeframe, 100)
      console.log("✅ REAL historical data received:", klineData.length, "candles")

      setPriceData(klineData)
      setIsLoading(false)
      setConnectionStatus("connected")

      addToTradeLog(`✅ REAL data loaded: $${priceData.price} from ${priceData.source}`)
      addToTradeLog("🚀 AGGRESSIVE strategy ready - faster signals!")
      console.log("🎉 REAL Bitcoin data loaded successfully!")
    } catch (err) {
      console.error("💥 Failed to get REAL Bitcoin data:", err)
      setError(`Cannot get real Bitcoin data: ${err instanceof Error ? err.message : "Unknown error"}`)
      setIsLoading(false)
      setConnectionStatus("disconnected")
      addToTradeLog(`❌ Failed to get real data: ${err instanceof Error ? err.message : "Unknown error"}`)
    }
  }, [timeframe, addToTradeLog])

  useEffect(() => {
    fetchRealData()
  }, [fetchRealData])

  // Setup REAL live price updates
  useEffect(() => {
    console.log("🔌 Setting up REAL live price updates...")
    const priceWS = new BTCPriceWebSocket()

    priceWS.onPriceUpdate((price) => {
      console.log("💰 REAL live price update:", price)
      setCurrentPrice(price)
      setConnectionStatus("connected")

      // Update the latest candle with real price
      setPriceData((prevData) => {
        if (prevData.length === 0) return prevData

        const updatedData = [...prevData]
        const lastCandle = { ...updatedData[updatedData.length - 1] }
        lastCandle.close = price
        lastCandle.high = Math.max(lastCandle.high, price)
        lastCandle.low = Math.min(lastCandle.low, price)
        updatedData[updatedData.length - 1] = lastCandle

        return updatedData
      })

      // Update signal tracking
      try {
        signalTracker.current.updateSignalOutcome(price)
        setSignalHistory(signalTracker.current.getRecentHistory(10))
        setPerformanceMetrics(signalTracker.current.getPerformanceMetrics())
      } catch (err) {
        console.error("💥 Signal tracking error:", err)
      }
    })

    priceWS.connect()

    return () => {
      console.log("🔌 Disconnecting REAL price updates...")
      priceWS.disconnect()
    }
  }, [])

  // Generate signals and execute trades - MUCH MORE FREQUENTLY
  useEffect(() => {
    if (priceData.length < 30) {
      console.log("⏳ Need 30+ candles for AGGRESSIVE signals...")
      return
    }

    const generateSignalsAndTrade = async () => {
      try {
        console.log("🔍 AGGRESSIVE signal generation with REAL data...")
        const newSignals = strategy.current.generateSignals(priceData, timeframe)

        if (newSignals.length > 0) {
          console.log("🚀 AGGRESSIVE signals generated:", newSignals.length)

          for (const signal of newSignals) {
            signalTracker.current.trackSignal(signal)

            if (botEnabled && botInitialized && currentPrice > 0) {
              try {
                addToTradeLog(`🎯 AGGRESSIVE Signal: ${signal.type.toUpperCase()} at $${currentPrice}`)
                addToTradeLog(
                  `📊 Signal strength: ${signal.strength.strength}% (${signal.strength.confidence}% confidence)`,
                )

                const tradeResult = await tradingBot.current.executeTrade(signal, currentPrice)

                if (tradeResult.success) {
                  addToTradeLog(`✅ Trade executed: ${signal.type.toUpperCase()} ${tradeResult.quantity} BTC`)
                  addToTradeLog(`💰 Entry price: $${tradeResult.price}`)
                  addToTradeLog(`🎯 TP1: $${signal.tp1.toFixed(2)} | SL: $${signal.sl.toFixed(2)}`)
                } else {
                  addToTradeLog(`❌ Trade failed: ${tradeResult.error}`)
                }
              } catch (tradeError) {
                console.error("💥 Trade execution error:", tradeError)
                addToTradeLog(`💥 Trade error: ${tradeError instanceof Error ? tradeError.message : "Unknown error"}`)
              }
            } else {
              addToTradeLog(`⏸️ AGGRESSIVE signal generated but bot is ${!botEnabled ? "disabled" : "not initialized"}`)
            }
          }

          setSignals((prev) => [...prev, ...newSignals].slice(-5))
          setSignalHistory(signalTracker.current.getRecentHistory(10))
        }
      } catch (err) {
        console.error("💥 Signal generation error:", err)
      }
    }

    // MUCH MORE FREQUENT signal generation - every 15 seconds instead of 30
    generateSignalsAndTrade()
    const interval = setInterval(generateSignalsAndTrade, 15000)

    return () => clearInterval(interval)
  }, [priceData, timeframe, botEnabled, botInitialized, currentPrice, addToTradeLog])

  // Countdown and refresh
  useEffect(() => {
    const interval = setInterval(async () => {
      setCountdown((prev) => {
        if (prev <= 0) {
          getCurrentBTCPrice()
            .then((data) => {
              if (data.isReal) {
                setPriceInfo(data)
                setDataSource(data.source || "Unknown")
              }
            })
            .catch((err) => console.error("💥 REAL price refresh error:", err))
          return 60
        }
        return prev - 1
      })

      setPerformanceMetrics(signalTracker.current.getPerformanceMetrics())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const handleTimeframeChange = useCallback((newTimeframe: string) => {
    console.log("📊 Changing timeframe to:", newTimeframe)
    setTimeframe(newTimeframe)
    setIsLoading(true)
  }, [])

  const toggleBot = useCallback(() => {
    if (!botInitialized) {
      addToTradeLog("❌ Cannot enable bot - initialization failed")
      return
    }

    setBotEnabled(!botEnabled)
    if (!botEnabled) {
      addToTradeLog("🟢 AGGRESSIVE Trading bot ENABLED - Will execute trades fast!")
      addToTradeLog("⚡ Signal generation every 15 seconds")
      addToTradeLog("🎯 Only need 4/8 conditions for signals")
    } else {
      addToTradeLog("🔴 Trading bot DISABLED - Signals only mode")
      tradingBot.current.stop()
    }
  }, [botEnabled, botInitialized, addToTradeLog])

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold mb-4">❌ Cannot Get REAL Bitcoin Data</h2>
          <p className="text-red-400 mb-4 text-sm">{error}</p>
          <p className="text-gray-400 mb-6 text-xs">
            All REAL Bitcoin APIs are currently unavailable:
            <br />• Binance API
            <br />• CoinGecko API
            <br />• CoinCap API
            <br />• Kraken API
            <br />
            <br />
            <strong>NO MOCK DATA WILL BE USED</strong>
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded transition-colors"
          >
            🔄 Try Again (Real APIs Only)
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      <div className="container mx-auto p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-orange-400 to-yellow-500 rounded flex items-center justify-center">
              <span className="text-white font-bold text-sm">₿</span>
            </div>
            <span className="text-xl font-bold">AGGRESSIVE Bitcoin Trading Bot</span>
            <div className="flex items-center space-x-2 ml-4">
              <div
                className={`w-2 h-2 rounded-full ${
                  connectionStatus === "connected"
                    ? "bg-green-500"
                    : connectionStatus === "connecting"
                      ? "bg-blue-500 animate-pulse"
                      : "bg-red-500"
                }`}
              ></div>
              <span className="text-xs text-gray-400 capitalize">{connectionStatus}</span>
              <span className="text-xs text-green-400 font-medium">REAL ONLY ({dataSource})</span>
              <span className="text-xs text-orange-400 font-bold">AGGRESSIVE MODE</span>
            </div>
          </div>

          <PriceDisplay
            price={currentPrice}
            countdown={countdown}
            change24h={priceInfo?.changePercent24h || 0}
            isLoading={isLoading}
          />
        </div>

        {/* Bot Control */}
        <div className="mb-4 text-center">
          <div className="inline-flex items-center space-x-4 bg-slate-800/50 rounded-lg px-6 py-3 border border-slate-700">
            <div className="flex items-center space-x-2">
              <div
                className={`w-2 h-2 rounded-full ${signals.length > 0 ? "bg-green-500 animate-pulse" : "bg-orange-500 animate-pulse"}`}
              ></div>
              <span className="text-sm">
                {signals.length > 0
                  ? `${signals.length} AGGRESSIVE Signal${signals.length > 1 ? "s" : ""} | Win Rate: ${performanceMetrics.winRate.toFixed(1)}%`
                  : "🚀 AGGRESSIVE mode - scanning every 15s for opportunities..."}
              </span>
            </div>

            <button
              onClick={toggleBot}
              disabled={!botInitialized}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                botEnabled
                  ? "bg-red-500 hover:bg-red-600 text-white"
                  : "bg-green-500 hover:bg-green-600 text-white disabled:bg-gray-500 disabled:cursor-not-allowed"
              }`}
            >
              {botEnabled ? "🛑 STOP BOT" : "🚀 START AGGRESSIVE BOT"}
            </button>

            <div
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                botEnabled && botInitialized ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"
              }`}
            >
              {botEnabled && botInitialized ? "🤖 AGGRESSIVE TRADING" : "📊 SIGNALS ONLY"}
            </div>
          </div>
        </div>

        {/* Strategy Info */}
        <div className="mb-4 text-center">
          <div className="inline-flex items-center space-x-4 bg-orange-500/10 rounded-lg px-4 py-2 border border-orange-500/30">
            <span className="text-xs text-orange-400">
              ⚡ AGGRESSIVE STRATEGY: Only 4/8 conditions needed | 1min cooldown | 15s scans | 1.5% risk
            </span>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Chart */}
          <div className="lg:col-span-3">
            {isLoading ? (
              <div className="bg-slate-800/50 rounded-lg p-4 backdrop-blur-sm border border-slate-700 h-96 flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
                  <p>📊 Loading REAL Bitcoin chart data...</p>
                  <p className="text-sm text-orange-400 mt-2">AGGRESSIVE MODE - Ready for fast signals</p>
                </div>
              </div>
            ) : (
              <TradingChart data={priceData} signals={signals} currentPrice={currentPrice} />
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-2 space-y-6">
            <TradingBotDashboard bot={tradingBot.current} />
            <TimeframeSelector selected={timeframe} onSelect={handleTimeframeChange} />
            <TradingSignals signals={signals} signalHistory={signalHistory} />
            <PerformanceMetrics metrics={performanceMetrics} />

            {/* Trade Log */}
            <div className="bg-slate-800/50 rounded-lg p-4 backdrop-blur-sm border border-slate-700">
              <h3 className="text-lg font-semibold mb-3">📝 Trade Log</h3>
              <div className="h-48 overflow-y-auto space-y-1">
                {tradeLog.length === 0 ? (
                  <p className="text-gray-400 text-sm">No trades yet...</p>
                ) : (
                  tradeLog.map((log, index) => (
                    <div key={index} className="text-xs text-gray-300 font-mono">
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Data Status */}
        <div className="mt-8 text-center text-sm text-gray-400">
          <p className="text-green-400 font-medium">
            🔴 REAL DATA ONLY: ${currentPrice} from {dataSource} | 📊 {priceData.length} real candles | 🚀{" "}
            {signals.length} signals
          </p>
          <p className="mt-2 text-orange-400 font-bold">
            ⚡ AGGRESSIVE MODE: 4/8 conditions | 15s scans | 1min cooldown ⚡
          </p>
          <p className="mt-1">
            📡 Connection: {connectionStatus} | 🤖 Bot: {botEnabled ? "AGGRESSIVE" : "INACTIVE"} | Last update:{" "}
            {new Date().toLocaleTimeString()}
          </p>
        </div>
      </div>
    </div>
  )
}
