import type { TradingSignal } from "./trading-strategy"

export interface SignalOutcome {
  id: string
  signal: TradingSignal
  outcome: "success" | "loss" | "pending"
  hitTarget?: "tp1" | "tp2" | "tp3" | "sl"
  entryTime: number
  exitTime?: number
  profit?: number
  profitPercent?: number
}

export class SignalTracker {
  private static instance: SignalTracker
  private outcomes: Map<string, SignalOutcome> = new Map()
  private signalHistory: SignalOutcome[] = []

  private constructor() {}

  public static getInstance(): SignalTracker {
    if (!SignalTracker.instance) {
      SignalTracker.instance = new SignalTracker()
    }
    return SignalTracker.instance
  }

  public trackSignal(signal: TradingSignal): string {
    const id = `signal-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`

    const outcome: SignalOutcome = {
      id,
      signal,
      outcome: "pending",
      entryTime: Date.now(),
    }

    this.outcomes.set(id, outcome)
    this.signalHistory.push(outcome)

    return id
  }

  public updateSignalOutcome(currentPrice: number): void {
    // Check all pending signals
    this.outcomes.forEach((outcome, id) => {
      if (outcome.outcome !== "pending") return

      const signal = outcome.signal
      const entryPrice = signal.entry

      // For buy signals
      if (signal.type === "buy") {
        // Check if stop loss hit
        if (currentPrice <= signal.sl) {
          this.resolveSignal(id, "loss", "sl", currentPrice)
          return
        }

        // Check if take profit targets hit
        if (signal.tp3 && currentPrice >= signal.tp3) {
          this.resolveSignal(id, "success", "tp3", currentPrice)
        } else if (currentPrice >= signal.tp2) {
          this.resolveSignal(id, "success", "tp2", currentPrice)
        } else if (currentPrice >= signal.tp1) {
          this.resolveSignal(id, "success", "tp1", currentPrice)
        }
      }
      // For sell signals
      else if (signal.type === "sell") {
        // Check if stop loss hit
        if (currentPrice >= signal.sl) {
          this.resolveSignal(id, "loss", "sl", currentPrice)
          return
        }

        // Check if take profit targets hit
        if (signal.tp3 && currentPrice <= signal.tp3) {
          this.resolveSignal(id, "success", "tp3", currentPrice)
        } else if (currentPrice <= signal.tp2) {
          this.resolveSignal(id, "success", "tp2", currentPrice)
        } else if (currentPrice <= signal.tp1) {
          this.resolveSignal(id, "success", "tp1", currentPrice)
        }
      }
    })
  }

  private resolveSignal(
    id: string,
    outcome: "success" | "loss",
    hitTarget: "tp1" | "tp2" | "tp3" | "sl",
    exitPrice: number,
  ): void {
    const signalOutcome = this.outcomes.get(id)
    if (!signalOutcome) return

    const signal = signalOutcome.signal
    const entryPrice = signal.entry

    // Calculate profit/loss
    let profitPercent = 0
    if (signal.type === "buy") {
      profitPercent = ((exitPrice - entryPrice) / entryPrice) * 100
    } else {
      profitPercent = ((entryPrice - exitPrice) / entryPrice) * 100
    }

    // Update outcome
    signalOutcome.outcome = outcome
    signalOutcome.hitTarget = hitTarget
    signalOutcome.exitTime = Date.now()
    signalOutcome.profit = exitPrice - entryPrice
    signalOutcome.profitPercent = profitPercent

    // Update in both maps
    this.outcomes.set(id, signalOutcome)

    // Update in history array
    const index = this.signalHistory.findIndex((s) => s.id === id)
    if (index !== -1) {
      this.signalHistory[index] = signalOutcome
    }
  }

  public getOutcomes(): SignalOutcome[] {
    return Array.from(this.outcomes.values())
  }

  public getHistory(): SignalOutcome[] {
    return this.signalHistory
  }

  public getRecentHistory(count = 10): SignalOutcome[] {
    return this.signalHistory.slice(-count)
  }

  public getPerformanceMetrics() {
    const completedSignals = this.signalHistory.filter((s) => s.outcome !== "pending")
    const successfulSignals = completedSignals.filter((s) => s.outcome === "success")
    const totalSignals = completedSignals.length

    const winRate = totalSignals > 0 ? (successfulSignals.length / totalSignals) * 100 : 0

    const profits = completedSignals.map((s) => s.profitPercent || 0)
    const totalProfit = profits.reduce((sum, profit) => sum + profit, 0)
    const avgProfit = totalSignals > 0 ? totalProfit / totalSignals : 0

    const successProfits = successfulSignals.map((s) => s.profitPercent || 0)
    const avgWin =
      successfulSignals.length > 0 ? successProfits.reduce((sum, p) => sum + p, 0) / successfulSignals.length : 0

    const lossProfits = completedSignals.filter((s) => s.outcome === "loss").map((s) => s.profitPercent || 0)
    const avgLoss = lossProfits.length > 0 ? lossProfits.reduce((sum, p) => sum + p, 0) / lossProfits.length : 0

    return {
      totalSignals,
      successfulSignals: successfulSignals.length,
      failedSignals: totalSignals - successfulSignals.length,
      winRate,
      totalProfit,
      avgProfit,
      avgWin,
      avgLoss,
      profitFactor: Math.abs(avgLoss) > 0 ? avgWin / Math.abs(avgLoss) : 0,
    }
  }
}
