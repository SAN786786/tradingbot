export interface BinanceAccount {
  totalBalance: number
  availableBalance: number
  unrealizedPnl: number
  positions: BinancePosition[]
  timestamp: number
}

export interface BinancePosition {
  symbol: string
  size: number
  entryPrice: number
  unrealizedPnl: number
  percentage: number
  side: "LONG" | "SHORT"
}

export interface TradeOrder {
  side: "BUY" | "SELL"
  quantity: string
  price?: string
  type: "MARKET" | "LIMIT" | "STOP_MARKET"
  stopPrice?: string
}

export interface TradeResult {
  success: boolean
  orderId?: string
  symbol?: string
  side?: string
  quantity?: string
  price?: string
  status?: string
  timestamp?: number
  error?: string
  details?: string
}

export class BinanceTradingBot {
  private leverage = 10
  private positionSize = 100 // $100 per trade
  private isActive = false
  private currentPosition: BinancePosition | null = null
  private retryCount = 0
  private maxRetries = 3
  private retryDelay = 2000 // 2 seconds
  private activeStopLoss: string | null = null
  private activeTakeProfits: string[] = []
  private partialProfitTaken = false

  // Binance BTCUSDT precision requirements
  private readonly QUANTITY_PRECISION = 3 // 3 decimal places for BTC quantity
  private readonly PRICE_PRECISION = 2 // 2 decimal places for USDT price
  private readonly MIN_QUANTITY = 0.001 // Minimum 0.001 BTC

  async initialize(): Promise<void> {
    try {
      console.log("🤖 Initializing ADVANCED Binance Trading Bot...")
      this.retryCount = 0

      // Test connection first
      await this.testConnection()

      // Set leverage to 10x
      await this.setLeverage(this.leverage)

      // Get account info
      const account = await this.getAccount()
      console.log("✅ ADVANCED Bot initialized successfully!")
      console.log(`💰 Available Balance: $${account.availableBalance}`)
      console.log(`⚡ Leverage: ${this.leverage}x`)
      console.log(`💵 Position Size: $${this.positionSize}`)
      console.log(`🎯 AUTO EXIT: Stop Loss + Take Profit Management`)

      this.isActive = true
    } catch (error) {
      console.error("💥 Bot initialization failed:", error)
      throw error
    }
  }

  private async testConnection(): Promise<void> {
    try {
      console.log("🔍 Testing Binance connection...")

      const response = await fetch("/api/binance/account", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Connection test failed: ${response.status} - ${errorText}`)
      }

      console.log("✅ Binance connection test successful")
    } catch (error) {
      console.error("💥 Connection test failed:", error)
      throw new Error(`Cannot connect to Binance API: ${error.message}`)
    }
  }

  private formatQuantity(quantity: number): string {
    // Round to 3 decimal places and ensure minimum quantity
    const rounded = Math.max(this.MIN_QUANTITY, Number(quantity.toFixed(this.QUANTITY_PRECISION)))
    return rounded.toFixed(this.QUANTITY_PRECISION)
  }

  private formatPrice(price: number): string {
    // Round to 2 decimal places for USDT
    return price.toFixed(this.PRICE_PRECISION)
  }

  async setLeverage(leverage: number): Promise<void> {
    try {
      console.log(`⚡ Setting leverage to ${leverage}x...`)

      const response = await fetch("/api/binance/leverage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
        },
        body: JSON.stringify({ leverage }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to set leverage: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      console.log(`✅ Leverage set to ${leverage}x`)
    } catch (error) {
      console.error("💥 Leverage setting failed:", error)
      throw error
    }
  }

  async getAccount(): Promise<BinanceAccount> {
    try {
      console.log("📊 Fetching account info...")

      const response = await fetch("/api/binance/account", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to fetch account: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      this.currentPosition = data.positions.find((pos: BinancePosition) => pos.symbol === "BTCUSDT") || null

      console.log("✅ Account info fetched successfully")
      return data
    } catch (error) {
      console.error("💥 Account fetch failed:", error)
      throw error
    }
  }

  async executeTrade(signal: any, currentPrice: number): Promise<TradeResult> {
    try {
      if (!this.isActive) {
        throw new Error("Bot is not active")
      }

      console.log(`🚀 Executing HIGH ACCURACY ${signal.type} trade at $${currentPrice}`)
      console.log(`🎯 Signal Confidence: ${signal.strength.confidence}%`)

      // Calculate quantity based on position size and leverage
      const notionalValue = this.positionSize * this.leverage
      const rawQuantity = notionalValue / currentPrice
      const quantity = this.formatQuantity(rawQuantity)

      console.log(`📊 ADVANCED Trade calculation:`)
      console.log(`   Confidence: ${signal.strength.confidence}%`)
      console.log(`   Notional: $${notionalValue}`)
      console.log(`   Raw quantity: ${rawQuantity}`)
      console.log(`   Formatted quantity: ${quantity}`)

      // Close existing position if opposite signal
      if (this.currentPosition) {
        const shouldClose =
          (this.currentPosition.side === "LONG" && signal.type === "sell") ||
          (this.currentPosition.side === "SHORT" && signal.type === "buy")

        if (shouldClose) {
          console.log("🔄 Closing existing position first...")
          await this.closePosition()
        }
      }

      // Execute new trade
      const side = signal.type === "buy" ? "BUY" : "SELL"
      const tradeOrder: TradeOrder = {
        side,
        quantity,
        type: "MARKET",
      }

      console.log(`📤 Placing ${side} order for ${quantity} BTC...`)
      this.retryCount = 0
      const result = await this.placeOrderWithRetry(tradeOrder)

      if (result.success) {
        console.log(`✅ ${side} order executed: ${quantity} BTC at $${currentPrice}`)

        // Reset profit tracking
        this.partialProfitTaken = false
        this.activeTakeProfits = []

        // Set ADVANCED stop loss and take profit orders
        try {
          await this.setAdvancedExitOrders(signal, quantity)
        } catch (exitError) {
          console.warn("⚠️ Exit orders failed but main trade succeeded:", exitError.message)
        }

        // Update current position
        try {
          await this.getAccount()
        } catch (accountError) {
          console.warn("⚠️ Account update failed but trade succeeded:", accountError.message)
        }
      }

      return result
    } catch (error) {
      console.error("💥 Trade execution failed:", error)
      return { success: false, error: error.message }
    }
  }

  private async setAdvancedExitOrders(signal: any, quantity: string): Promise<void> {
    try {
      console.log("🎯 Setting ADVANCED exit strategy...")

      // Set stop loss
      await this.setStopLoss(signal, quantity)

      // Set multiple take profit levels
      await this.setTakeProfitLevels(signal, quantity)

      console.log("✅ ADVANCED exit strategy activated!")
      console.log(`🛡️ Stop Loss: $${signal.sl.toFixed(2)}`)
      console.log(`🎯 Take Profit 1: $${signal.tp1.toFixed(2)} (33% position)`)
      console.log(`🎯 Take Profit 2: $${signal.tp2.toFixed(2)} (33% position)`)
      console.log(`🎯 Take Profit 3: $${signal.tp3?.toFixed(2)} (34% position)`)
    } catch (error) {
      console.error("💥 Advanced exit orders failed:", error)
      throw error
    }
  }

  private async setTakeProfitLevels(signal: any, quantity: string): Promise<void> {
    try {
      const totalQuantity = Number(quantity)
      const tp1Quantity = this.formatQuantity(totalQuantity * 0.33) // 33% at TP1
      const tp2Quantity = this.formatQuantity(totalQuantity * 0.33) // 33% at TP2
      const tp3Quantity = this.formatQuantity(totalQuantity * 0.34) // 34% at TP3

      const takeProfitSide = signal.type === "buy" ? "SELL" : "BUY"

      // TP1 - Take 33% profit
      const tp1Order: TradeOrder = {
        side: takeProfitSide as "BUY" | "SELL",
        quantity: tp1Quantity,
        type: "LIMIT",
        price: this.formatPrice(signal.tp1),
      }

      // TP2 - Take another 33% profit
      const tp2Order: TradeOrder = {
        side: takeProfitSide as "BUY" | "SELL",
        quantity: tp2Quantity,
        type: "LIMIT",
        price: this.formatPrice(signal.tp2),
      }

      // TP3 - Take final 34% profit (if exists)
      if (signal.tp3) {
        const tp3Order: TradeOrder = {
          side: takeProfitSide as "BUY" | "SELL",
          quantity: tp3Quantity,
          type: "LIMIT",
          price: this.formatPrice(signal.tp3),
        }

        console.log(`🎯 Setting Take Profit 3: ${takeProfitSide} ${tp3Quantity} BTC at $${signal.tp3.toFixed(2)}`)
        const tp3Result = await this.placeOrder(tp3Order)
        if (tp3Result.success) {
          this.activeTakeProfits.push(tp3Result.orderId || "")
        }
      }

      console.log(`🎯 Setting Take Profit 1: ${takeProfitSide} ${tp1Quantity} BTC at $${signal.tp1.toFixed(2)}`)
      const tp1Result = await this.placeOrder(tp1Order)
      if (tp1Result.success) {
        this.activeTakeProfits.push(tp1Result.orderId || "")
      }

      console.log(`🎯 Setting Take Profit 2: ${takeProfitSide} ${tp2Quantity} BTC at $${signal.tp2.toFixed(2)}`)
      const tp2Result = await this.placeOrder(tp2Order)
      if (tp2Result.success) {
        this.activeTakeProfits.push(tp2Result.orderId || "")
      }

      console.log(`✅ Set ${this.activeTakeProfits.length} take profit orders`)
    } catch (error) {
      console.error("💥 Take profit setting failed:", error)
    }
  }

  // Monitor position and manage exits
  async monitorPosition(currentPrice: number): Promise<void> {
    if (!this.currentPosition) return

    try {
      const entryPrice = this.currentPosition.entryPrice
      const isLong = this.currentPosition.side === "LONG"
      const currentPnL = this.currentPosition.unrealizedPnl
      const currentPnLPercent = this.currentPosition.percentage

      // Check if we should take partial profits manually (in case limit orders didn't fill)
      if (!this.partialProfitTaken && Math.abs(currentPnLPercent) > 1.5) {
        console.log(`💰 Position showing ${currentPnLPercent.toFixed(2)}% profit - considering partial exit`)

        if ((isLong && currentPrice > entryPrice * 1.015) || (!isLong && currentPrice < entryPrice * 0.985)) {
          await this.takePartialProfit()
        }
      }

      // Emergency exit if position moves too far against us (beyond stop loss)
      if (Math.abs(currentPnLPercent) > 2 && currentPnL < 0) {
        console.log(`🚨 Emergency exit triggered - P&L: ${currentPnLPercent.toFixed(2)}%`)
        await this.emergencyExit()
      }
    } catch (error) {
      console.error("💥 Position monitoring error:", error)
    }
  }

  private async takePartialProfit(): Promise<void> {
    try {
      if (!this.currentPosition || this.partialProfitTaken) return

      const partialQuantity = this.formatQuantity(Math.abs(this.currentPosition.size) * 0.5) // Take 50% profit
      const side = this.currentPosition.side === "LONG" ? "SELL" : "BUY"

      console.log(`💰 Taking partial profit: ${side} ${partialQuantity} BTC`)

      const partialOrder: TradeOrder = {
        side: side as "BUY" | "SELL",
        quantity: partialQuantity,
        type: "MARKET",
      }

      const result = await this.placeOrder(partialOrder)
      if (result.success) {
        this.partialProfitTaken = true
        console.log(`✅ Partial profit taken: ${partialQuantity} BTC`)
      }
    } catch (error) {
      console.error("💥 Partial profit taking failed:", error)
    }
  }

  private async emergencyExit(): Promise<void> {
    try {
      console.log("🚨 Executing emergency exit...")
      await this.closePosition()
      console.log("✅ Emergency exit completed")
    } catch (error) {
      console.error("💥 Emergency exit failed:", error)
    }
  }

  private async placeOrderWithRetry(order: TradeOrder): Promise<TradeResult> {
    try {
      return await this.placeOrder(order)
    } catch (error) {
      if (this.retryCount < this.maxRetries) {
        this.retryCount++
        console.log(`🔄 Retry attempt ${this.retryCount}/${this.maxRetries} after error: ${error.message}`)

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, this.retryDelay * this.retryCount))

        return this.placeOrderWithRetry(order)
      } else {
        console.error(`💥 Max retries (${this.maxRetries}) reached. Order failed.`)
        throw error
      }
    }
  }

  async placeOrder(order: TradeOrder): Promise<TradeResult> {
    try {
      console.log(`📤 Placing order:`, order)

      const response = await fetch("/api/binance/trade", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "Cache-Control": "no-cache",
        },
        body: JSON.stringify(order),
      })

      console.log(`📡 Response status: ${response.status}`)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const result = await response.json()
      console.log("✅ Order placed successfully:", result)
      return result
    } catch (error) {
      console.error("💥 Order placement failed:", error)

      let errorMessage = error.message
      if (error.name === "AbortError") {
        errorMessage = "Order timeout - Request took too long"
      } else if (error.message.includes("fetch")) {
        errorMessage = "Network error - Cannot reach trading API"
      }

      return { success: false, error: errorMessage }
    }
  }

  async setStopLoss(signal: any, quantity: string): Promise<void> {
    try {
      const stopSide = signal.type === "buy" ? "SELL" : "BUY"
      const stopPrice = this.formatPrice(signal.sl)

      console.log(`🛡️ Setting stop loss: ${stopSide} ${quantity} BTC at $${stopPrice}`)

      const stopOrder: TradeOrder = {
        side: stopSide as "BUY" | "SELL",
        quantity,
        type: "STOP_MARKET",
        stopPrice,
      }

      const result = await this.placeOrder(stopOrder)
      if (result.success) {
        this.activeStopLoss = result.orderId || ""
        console.log(`✅ Stop loss set at $${stopPrice}`)
      } else {
        console.warn(`⚠️ Stop loss failed: ${result.error}`)
      }
    } catch (error) {
      console.error("💥 Stop loss setting failed:", error)
      // Don't throw - stop loss failure shouldn't fail the main trade
    }
  }

  async closePosition(): Promise<void> {
    try {
      if (!this.currentPosition) return

      const side = this.currentPosition.side === "LONG" ? "SELL" : "BUY"
      const quantity = this.formatQuantity(Math.abs(this.currentPosition.size))

      console.log(`🔄 Closing position: ${side} ${quantity} BTC`)

      const closeOrder: TradeOrder = {
        side: side as "BUY" | "SELL",
        quantity,
        type: "MARKET",
      }

      const result = await this.placeOrder(closeOrder)
      if (result.success) {
        console.log(`✅ Position closed: ${this.currentPosition.side} ${quantity} BTC`)
        this.currentPosition = null
        this.activeStopLoss = null
        this.activeTakeProfits = []
        this.partialProfitTaken = false
      } else {
        console.error(`💥 Position close failed: ${result.error}`)
      }
    } catch (error) {
      console.error("💥 Position closing failed:", error)
    }
  }

  getStatus() {
    return {
      isActive: this.isActive,
      leverage: this.leverage,
      positionSize: this.positionSize,
      currentPosition: this.currentPosition,
      activeStopLoss: this.activeStopLoss,
      activeTakeProfits: this.activeTakeProfits.length,
      partialProfitTaken: this.partialProfitTaken,
    }
  }

  stop() {
    this.isActive = false
    console.log("🛑 ADVANCED Trading bot stopped")
  }
}
