export interface CryptoPrice {
  symbol: string
  price: number
  change24h: number
  changePercent24h: number
  high24h: number
  low24h: number
  volume24h: number
  source?: string
  isReal?: boolean
  timestamp?: number
}

export interface OHLCData {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export async function getCurrentBTCPrice(): Promise<CryptoPrice> {
  console.log("💰 Fetching REAL Bitcoin price - NO MOCK DATA ALLOWED")

  const response = await fetch("/api/btc-price", {
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "Cache-Control": "no-cache",
    },
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
    throw new Error(`Real Bitcoin API failed: ${errorData.error || response.statusText}`)
  }

  const data = await response.json()

  if (data.error) {
    throw new Error(`Real Bitcoin API error: ${data.error}`)
  }

  if (!data.price || !data.isReal) {
    throw new Error("Only real Bitcoin data is allowed - no mock data")
  }

  console.log(`✅ REAL Bitcoin price: $${data.price} from ${data.source}`)
  return data
}

export async function getBTCKlines(interval = "1h", limit = 100): Promise<OHLCData[]> {
  console.log("📊 Fetching REAL Bitcoin historical data - NO MOCK DATA ALLOWED")

  const response = await fetch(`/api/btc-klines?interval=${interval}&limit=${limit}`, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "Cache-Control": "no-cache",
    },
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
    throw new Error(`Real Bitcoin historical API failed: ${errorData.error || response.statusText}`)
  }

  const data = await response.json()

  if (data.error) {
    throw new Error(`Real Bitcoin historical API error: ${data.error}`)
  }

  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("No real historical data available - refusing to use mock data")
  }

  console.log(`✅ REAL historical data: ${data.length} candles`)
  return data
}

export class BTCPriceWebSocket {
  private ws: WebSocket | null = null
  private callbacks: ((price: number) => void)[] = []
  private reconnectAttempts = 0
  private maxReconnectAttempts = 3

  connect() {
    console.log("🔌 Connecting to REAL Bitcoin WebSocket - NO MOCK DATA")

    try {
      // Only use REAL Binance WebSocket
      this.ws = new WebSocket("wss://stream.binance.com:9443/ws/btcusdt@ticker")

      this.ws.onopen = () => {
        console.log("✅ REAL WebSocket connected to Binance!")
        this.reconnectAttempts = 0
      }

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          const price = Number.parseFloat(data.c)

          if (price && price > 20000 && price < 150000 && !isNaN(price)) {
            console.log(`💰 REAL Live WebSocket price: $${price}`)
            this.callbacks.forEach((callback) => callback(price))
          }
        } catch (error) {
          console.error("💥 WebSocket message error:", error)
        }
      }

      this.ws.onerror = (error) => {
        console.error("💥 REAL WebSocket error:", error)
      }

      this.ws.onclose = () => {
        console.log("🔌 REAL WebSocket closed")
        this.handleReconnect()
      }

      // Connection timeout
      setTimeout(() => {
        if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
          console.log("⏰ REAL WebSocket connection timeout")
          this.ws.close()
        }
      }, 10000)
    } catch (error) {
      console.error("💥 REAL WebSocket connection failed:", error)
    }
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      console.log(`🔄 Reconnecting to REAL WebSocket... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)

      setTimeout(() => {
        this.connect()
      }, 3000 * this.reconnectAttempts)
    } else {
      console.log("💥 Max REAL WebSocket reconnection attempts reached")
    }
  }

  onPriceUpdate(callback: (price: number) => void) {
    this.callbacks.push(callback)
  }

  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.callbacks = []
    console.log("🔌 Disconnected from REAL price feeds")
  }

  getConnectionState(): string {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return "connected"
    return "disconnected"
  }
}
