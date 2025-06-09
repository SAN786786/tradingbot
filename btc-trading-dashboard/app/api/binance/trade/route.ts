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
    console.log("🔍 Trade API route called")

    const body = await request.json()
    const { side, quantity, price, type = "MARKET", stopPrice, timeInForce = "GTC" } = body

    console.log(`📊 Trade request:`, { side, quantity, price, type, stopPrice })

    // Validate inputs
    if (!quantity || isNaN(Number(quantity))) {
      return NextResponse.json({ success: false, error: "Invalid quantity" }, { status: 400 })
    }

    if (Number(quantity) < 0.001) {
      return NextResponse.json({ success: false, error: "Quantity below minimum (0.001 BTC)" }, { status: 400 })
    }

    // Build parameters object for proper encoding
    const params: Record<string, string | number> = {
      symbol: "BTCUSDT",
      side: side,
      type: type,
      quantity: quantity,
      timestamp: Date.now(),
    }

    if (type === "LIMIT" && price) {
      params.price = price
      params.timeInForce = timeInForce
    }

    if (type === "STOP_MARKET" && stopPrice) {
      params.stopPrice = stopPrice
    }

    // Create properly encoded query string
    const queryString = encodeParams(params)
    const signature = createSignature(queryString)

    // Full URL and request body
    const fullUrl = `${BASE_URL}/fapi/v1/order`
    const requestBody = `${queryString}&signature=${signature}`

    console.log(`🌐 Making request to: ${fullUrl}`)
    console.log(`📝 Request body: ${requestBody}`)

    // Create a controller for timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 second timeout

    try {
      // Make the request with proper headers and timeout
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
      console.log(`📡 Response headers:`, Object.fromEntries(response.headers.entries()))

      // Handle non-OK responses
      if (!response.ok) {
        const errorText = await response.text()
        console.error(`💥 Binance API error: ${response.status} - ${errorText}`)

        try {
          const errorJson = JSON.parse(errorText)
          return NextResponse.json(
            { success: false, error: `Binance API Error: ${errorJson.code} - ${errorJson.msg}` },
            { status: response.status },
          )
        } catch {
          return NextResponse.json(
            { success: false, error: `Trade execution failed: ${response.status} - ${errorText}` },
            { status: response.status },
          )
        }
      }

      // Parse successful response
      const data = await response.json()
      console.log("✅ Trade executed successfully:", data)

      return NextResponse.json({
        success: true,
        orderId: data.orderId,
        symbol: data.symbol,
        side: data.side,
        quantity: data.origQty,
        price: data.price || data.avgPrice,
        status: data.status,
        timestamp: data.transactTime,
      })
    } catch (fetchError) {
      clearTimeout(timeoutId)

      // Handle fetch-specific errors
      if (fetchError.name === "AbortError") {
        console.error("⏱️ Request timeout after 15 seconds")
        return NextResponse.json(
          { success: false, error: "Request timeout - Binance API took too long to respond" },
          { status: 408 },
        )
      }

      console.error("💥 Fetch error:", fetchError)
      throw new Error(`Fetch error: ${fetchError.message}`)
    }
  } catch (error) {
    console.error("💥 Trade execution error:", error)

    // Provide detailed error information
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        errorType: error.name,
        errorStack: error.stack,
        timestamp: Date.now(),
      },
      { status: 500 },
    )
  }
}
