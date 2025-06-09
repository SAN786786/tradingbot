import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const interval = url.searchParams.get("interval") || "1h"
  const limit = Number.parseInt(url.searchParams.get("limit") || "100")

  console.log(`📊 Fetching REAL Bitcoin historical data - NO MOCK DATA`)

  // ONLY real APIs for historical data
  const realHistoricalAPIs = [
    {
      name: "Binance",
      url: `https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=${interval}&limit=${limit}`,
      parse: (data: any[]) =>
        data.map((kline) => ({
          timestamp: kline[0],
          open: Number.parseFloat(kline[1]),
          high: Number.parseFloat(kline[2]),
          low: Number.parseFloat(kline[3]),
          close: Number.parseFloat(kline[4]),
          volume: Number.parseFloat(kline[5]),
        })),
    },
    {
      name: "Kraken",
      url: `https://api.kraken.com/0/public/OHLC?pair=XBTUSD&interval=60`,
      parse: (data: any) => {
        const ohlc = data.result.XXBTZUSD || data.result.XBTUSD
        if (!ohlc) throw new Error("No OHLC data from Kraken")

        return ohlc.slice(-limit).map((candle: any[]) => ({
          timestamp: candle[0] * 1000, // Convert to milliseconds
          open: Number.parseFloat(candle[1]),
          high: Number.parseFloat(candle[2]),
          low: Number.parseFloat(candle[3]),
          close: Number.parseFloat(candle[4]),
          volume: Number.parseFloat(candle[6]),
        }))
      },
    },
  ]

  // Try real APIs only
  for (const api of realHistoricalAPIs) {
    try {
      console.log(`🌐 Trying REAL ${api.name} for historical data...`)

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000)

      const response = await fetch(api.url, {
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Cache-Control": "no-cache",
        },
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`${api.name} returned ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      const parsed = api.parse(data)

      if (parsed && parsed.length > 10) {
        // Validate REAL data only
        const validData = parsed.filter(
          (candle: any) =>
            candle.open > 20000 &&
            candle.high > 20000 &&
            candle.low > 20000 &&
            candle.close > 20000 &&
            candle.open < 150000 &&
            candle.high < 150000 &&
            candle.low < 150000 &&
            candle.close < 150000 &&
            candle.high >= Math.max(candle.open, candle.close) &&
            candle.low <= Math.min(candle.open, candle.close),
        )

        if (validData.length > 10) {
          console.log(`✅ REAL ${api.name} historical data SUCCESS: ${validData.length} candles`)
          return NextResponse.json(validData)
        }
      }

      throw new Error(`Invalid data from ${api.name}`)
    } catch (error) {
      console.log(`❌ ${api.name} historical data failed: ${error.message}`)
      continue
    }
  }

  // NO FALLBACK DATA - Return error if all real APIs fail
  console.error("💥 ALL REAL HISTORICAL APIs FAILED - NO MOCK DATA WILL BE USED")
  return NextResponse.json(
    {
      error: "All real Bitcoin historical APIs are unavailable",
      message: "Cannot fetch real Bitcoin historical data. All cryptocurrency APIs failed.",
      apis_tried: realHistoricalAPIs.map((api) => api.name),
      timestamp: Date.now(),
    },
    { status: 503 },
  )
}
