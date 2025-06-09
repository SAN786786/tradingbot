import { NextResponse } from "next/server"
import crypto from "crypto"

const API_KEY = "c8e9dc105bcbcde7399922f139d0cc5b9cb564bb3e6dd192b625e66fd03fc655"
const SECRET_KEY = "0d457650166ec1819917f9047612a0add4e454324204b3289d9182a1485a681b"
const BASE_URL = "https://testnet.binancefuture.com"

function createSignature(queryString: string): string {
  return crypto.createHmac("sha256", SECRET_KEY).update(queryString).digest("hex")
}

// Helper function to properly encode parameters
function encodeParams(params: Record<string, string | number>): string {
  return Object.entries(params)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&")
}

export async function POST(request: Request) {
  try {
    const { leverage = 10 } = await request.json()

    console.log(`⚡ Setting leverage to ${leverage}x for BTCUSDT...`)

    const timestamp = Date.now()
    const params = {
      symbol: "BTCUSDT",
      leverage: leverage,
      timestamp: timestamp,
    }

    const queryString = encodeParams(params)
    const signature = createSignature(queryString)
    const fullUrl = `${BASE_URL}/fapi/v1/leverage`
    const requestBody = `${queryString}&signature=${signature}`

    console.log(`🌐 Making request to: ${fullUrl}`)
    console.log(`📝 Request body: ${requestBody}`)

    // Create a controller for timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 second timeout

    try {
      const response = await fetch(fullUrl, {
        method: "POST",
        headers: {
          "X-MBX-APIKEY": API_KEY,
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "Mozilla/5.0 (compatible; TradingBot/1.0)",
          Accept: "application/json",
        },
        body: requestBody,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      console.log(`📡 Response status: ${response.status}`)

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`💥 Binance API error: ${response.status} - ${errorText}`)

        try {
          const errorJson = JSON.parse(errorText)
          return NextResponse.json(
            { error: `Binance API Error: ${errorJson.code} - ${errorJson.msg}` },
            { status: response.status },
          )
        } catch {
          return NextResponse.json(
            { error: `Leverage setting failed: ${response.status} - ${errorText}` },
            { status: response.status },
          )
        }
      }

      const data = await response.json()
      console.log("✅ Leverage set successfully:", data)

      return NextResponse.json({
        success: true,
        symbol: data.symbol,
        leverage: data.leverage,
        maxNotionalValue: data.maxNotionalValue,
      })
    } catch (fetchError) {
      clearTimeout(timeoutId)

      // Handle fetch-specific errors
      if (fetchError.name === "AbortError") {
        console.error("⏱️ Request timeout after 15 seconds")
        return NextResponse.json({ error: "Request timeout - Binance API took too long to respond" }, { status: 408 })
      }

      console.error("💥 Fetch error:", fetchError)
      throw new Error(`Fetch error: ${fetchError.message}`)
    }
  } catch (error) {
    console.error("💥 Leverage setting error:", error)

    return NextResponse.json(
      {
        error: error.message,
        errorType: error.name,
        errorStack: error.stack,
        timestamp: Date.now(),
      },
      { status: 500 },
    )
  }
}
