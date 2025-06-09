export interface TradingSignal {
  type: "buy" | "sell"
  price: number
  timestamp: number
  entry: number
  tp1: number
  tp2: number
  tp3?: number
  sl: number
  strength: {
    strength: number
    confidence: number
    reasons: string[]
  }
  timeframe: string
}

export class AdvancedTradingStrategy {
  private lastSignalTime = 0
  private signalCooldown = 60000 // Reduced to 1 minute for faster signals
  private minConfidence = 70 // Reduced from 85% to 70% for more signals

  // Calculate Simple Moving Average
  private calculateSMA(data: number[], period: number): number {
    if (data.length < period) return data[data.length - 1] || 0
    const slice = data.slice(-period)
    return slice.reduce((sum, val) => sum + val, 0) / period
  }

  // Calculate Exponential Moving Average
  private calculateEMA(data: number[], period: number): number {
    if (data.length === 0) return 0
    if (data.length === 1) return data[0]

    const multiplier = 2 / (period + 1)
    let ema = data[0]

    for (let i = 1; i < data.length; i++) {
      ema = data[i] * multiplier + ema * (1 - multiplier)
    }
    return ema
  }

  // Calculate RSI with smoothing
  private calculateRSI(prices: number[], period = 14): number {
    if (prices.length < period + 1) return 50

    const gains: number[] = []
    const losses: number[] = []

    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1]
      gains.push(change > 0 ? change : 0)
      losses.push(change < 0 ? Math.abs(change) : 0)
    }

    let avgGain = gains.slice(0, period).reduce((sum, val) => sum + val, 0) / period
    let avgLoss = losses.slice(0, period).reduce((sum, val) => sum + val, 0) / period

    for (let i = period; i < gains.length; i++) {
      avgGain = (avgGain * (period - 1) + gains[i]) / period
      avgLoss = (avgLoss * (period - 1) + losses[i]) / period
    }

    if (avgLoss === 0) return 100
    const rs = avgGain / avgLoss
    return 100 - 100 / (1 + rs)
  }

  // Enhanced MACD with signal line
  private calculateMACD(prices: number[]): { macd: number; signal: number; histogram: number } {
    if (prices.length < 26) return { macd: 0, signal: 0, histogram: 0 }

    const ema12 = this.calculateEMA(prices, 12)
    const ema26 = this.calculateEMA(prices, 26)
    const macd = ema12 - ema26

    // Calculate signal line (9-period EMA of MACD)
    const macdHistory = []
    for (let i = 26; i <= prices.length; i++) {
      const slice = prices.slice(0, i)
      const ema12_temp = this.calculateEMA(slice, 12)
      const ema26_temp = this.calculateEMA(slice, 26)
      macdHistory.push(ema12_temp - ema26_temp)
    }

    const signal = this.calculateEMA(macdHistory, 9)
    const histogram = macd - signal

    return { macd, signal, histogram }
  }

  // AGGRESSIVE signal generation - opens positions much faster
  generateSignals(
    data: { open: number; high: number; low: number; close: number; volume: number; timestamp: number }[],
    timeframe: string,
  ): TradingSignal[] {
    console.log(`🚀 AGGRESSIVE ANALYSIS: ${data.length} candles for FAST signals...`)

    if (data.length < 30) {
      console.log("❌ Need at least 30 candles for aggressive analysis")
      return []
    }

    const now = Date.now()
    if (now - this.lastSignalTime < this.signalCooldown) {
      const remaining = Math.ceil((this.signalCooldown - (now - this.lastSignalTime)) / 1000)
      console.log(`⏳ Signal cooldown: ${remaining}s remaining`)
      return []
    }

    const closes = data.map((d) => d.close)
    const highs = data.map((d) => d.high)
    const lows = data.map((d) => d.low)
    const volumes = data.map((d) => d.volume)

    const currentPrice = closes[closes.length - 1]
    const prevPrice = closes[closes.length - 2]
    const currentVolume = volumes[volumes.length - 1]

    // Calculate key indicators
    const sma10 = this.calculateSMA(closes, 10)
    const sma20 = this.calculateSMA(closes, 20)
    const ema12 = this.calculateEMA(closes, 12)
    const ema26 = this.calculateEMA(closes, 26)
    const rsi = this.calculateRSI(closes)
    const macd = this.calculateMACD(closes)
    const avgVolume = this.calculateSMA(volumes, 10)

    // Price momentum
    const priceChange1 = ((currentPrice - prevPrice) / prevPrice) * 100
    const priceChange3 = ((currentPrice - closes[closes.length - 4]) / closes[closes.length - 4]) * 100

    console.log(`📊 AGGRESSIVE Indicators:`, {
      price: currentPrice.toFixed(2),
      sma10: sma10.toFixed(2),
      sma20: sma20.toFixed(2),
      rsi: rsi.toFixed(1),
      macd: macd.macd.toFixed(2),
      priceChange1: priceChange1.toFixed(2) + "%",
      volume: (currentVolume / avgVolume).toFixed(2) + "x",
    })

    const signals: TradingSignal[] = []

    // AGGRESSIVE BULLISH CONDITIONS (only need 4+ out of 8)
    const aggressiveBullishConditions = {
      // Price momentum
      strongMomentum: priceChange1 > 0.3 || priceChange3 > 0.8, // Reduced thresholds

      // Moving averages
      maAlignment: currentPrice > sma10 && sma10 > sma20, // Simplified

      // RSI not overbought
      rsiGood: rsi > 35 && rsi < 75, // Wider range

      // MACD bullish
      macdBullish: macd.macd > macd.signal || macd.histogram > 0,

      // Volume confirmation
      volumeOk: currentVolume > avgVolume * 0.8, // Lower threshold

      // Price action
      priceAction: currentPrice > prevPrice,

      // EMA alignment
      emaAlignment: ema12 > ema26,

      // Recent strength
      recentStrength: currentPrice > Math.min(...closes.slice(-3)), // Above recent lows
    }

    // AGGRESSIVE BEARISH CONDITIONS (only need 4+ out of 8)
    const aggressiveBearishConditions = {
      // Price momentum
      strongMomentum: priceChange1 < -0.3 || priceChange3 < -0.8,

      // Moving averages
      maAlignment: currentPrice < sma10 && sma10 < sma20,

      // RSI not oversold
      rsiGood: rsi > 25 && rsi < 65,

      // MACD bearish
      macdBearish: macd.macd < macd.signal || macd.histogram < 0,

      // Volume confirmation
      volumeOk: currentVolume > avgVolume * 0.8,

      // Price action
      priceAction: currentPrice < prevPrice,

      // EMA alignment
      emaAlignment: ema12 < ema26,

      // Recent weakness
      recentWeakness: currentPrice < Math.max(...closes.slice(-3)), // Below recent highs
    }

    const bullishScore = Object.values(aggressiveBullishConditions).filter(Boolean).length
    const bearishScore = Object.values(aggressiveBearishConditions).filter(Boolean).length

    console.log(`📈 AGGRESSIVE BULLISH score: ${bullishScore}/8, BEARISH score: ${bearishScore}/8`)

    // Generate AGGRESSIVE BUY signal (need only 4+ out of 8 conditions)
    if (bullishScore >= 4) {
      const reasons = []
      if (aggressiveBullishConditions.strongMomentum) reasons.push("Strong upward momentum")
      if (aggressiveBullishConditions.maAlignment) reasons.push("Price above moving averages")
      if (aggressiveBullishConditions.rsiGood) reasons.push("RSI in good range")
      if (aggressiveBullishConditions.macdBullish) reasons.push("MACD bullish signal")
      if (aggressiveBullishConditions.volumeOk) reasons.push("Volume confirmation")
      if (aggressiveBullishConditions.priceAction) reasons.push("Positive price action")

      const riskPercent = 0.015 // 1.5% risk
      const rewardRatio = 2.5 // 1:2.5 risk/reward

      const confidence = Math.min(90, Math.round((bullishScore / 8) * 100 + 10))

      const signal: TradingSignal = {
        type: "buy",
        price: currentPrice,
        timestamp: now,
        entry: currentPrice,
        tp1: currentPrice * (1 + riskPercent * rewardRatio * 0.4), // 40% of target
        tp2: currentPrice * (1 + riskPercent * rewardRatio * 0.7), // 70% of target
        tp3: currentPrice * (1 + riskPercent * rewardRatio), // Full target
        sl: currentPrice * (1 - riskPercent),
        strength: {
          strength: Math.round((bullishScore / 8) * 100),
          confidence,
          reasons: reasons.slice(0, 4),
        },
        timeframe,
      }

      signals.push(signal)
      this.lastSignalTime = now
      console.log(`🚀 AGGRESSIVE BUY SIGNAL! Score: ${bullishScore}/8, Confidence: ${confidence}%`)
    }

    // Generate AGGRESSIVE SELL signal (need only 4+ out of 8 conditions)
    if (bearishScore >= 4) {
      const reasons = []
      if (aggressiveBearishConditions.strongMomentum) reasons.push("Strong downward momentum")
      if (aggressiveBearishConditions.maAlignment) reasons.push("Price below moving averages")
      if (aggressiveBearishConditions.rsiGood) reasons.push("RSI in good range")
      if (aggressiveBearishConditions.macdBearish) reasons.push("MACD bearish signal")
      if (aggressiveBearishConditions.volumeOk) reasons.push("Volume confirmation")
      if (aggressiveBearishConditions.priceAction) reasons.push("Negative price action")

      const riskPercent = 0.015 // 1.5% risk
      const rewardRatio = 2.5 // 1:2.5 risk/reward

      const confidence = Math.min(90, Math.round((bearishScore / 8) * 100 + 10))

      const signal: TradingSignal = {
        type: "sell",
        price: currentPrice,
        timestamp: now,
        entry: currentPrice,
        tp1: currentPrice * (1 - riskPercent * rewardRatio * 0.4),
        tp2: currentPrice * (1 - riskPercent * rewardRatio * 0.7),
        tp3: currentPrice * (1 - riskPercent * rewardRatio),
        sl: currentPrice * (1 + riskPercent),
        strength: {
          strength: Math.round((bearishScore / 8) * 100),
          confidence,
          reasons: reasons.slice(0, 4),
        },
        timeframe,
      }

      signals.push(signal)
      this.lastSignalTime = now
      console.log(`📉 AGGRESSIVE SELL SIGNAL! Score: ${bearishScore}/8, Confidence: ${confidence}%`)
    }

    if (signals.length === 0) {
      console.log(`⏸️ No signals yet (need 4+ conditions, got B:${bullishScore} S:${bearishScore})`)
    }

    return signals
  }
}
