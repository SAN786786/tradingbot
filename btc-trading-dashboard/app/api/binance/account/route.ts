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

export async function GET() {
  try {
    console.log("🔍 Fetching Binance Testnet account info...")

    const timestamp = Date.now()
    const params = { timestamp }
    const queryString = encodeParams(params)
    const signature = createSignature(queryString)

    const fullUrl = `${BASE_URL}/fapi/v2/account?${queryString}&signature=${signature}`
    console.log(`🌐 Making request to: ${fullUrl}`)

    // Create a controller for timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 second timeout

    try {
      const response = await fetch(fullUrl, {
        headers: {
          "X-MBX-APIKEY": API_KEY,
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0 (compatible; TradingBot/1.0)",
          Accept: "application/json",
        },
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
            { error: `Account fetch failed: ${response.status} - ${errorText}` },
            { status: response.status },
          )
        }
      }

      const data = await response.json()
      console.log("✅ Account data received")

      // Extract key information
      const totalWalletBalance = Number.parseFloat(data.totalWalletBalance || "0")
      const availableBalance = Number.parseFloat(data.availableBalance || "0")
      const totalUnrealizedProfit = Number.parseFloat(data.totalUnrealizedProfit || "0")

      const positions =
        data.positions
          ?.filter((pos: any) => Number.parseFloat(pos.positionAmt) !== 0)
          ?.map((pos: any) => ({
            symbol: pos.symbol,
            size: Number.parseFloat(pos.positionAmt),
            entryPrice: Number.parseFloat(pos.entryPrice),
            unrealizedPnl: Number.parseFloat(pos.unrealizedProfit),
            percentage: Number.parseFloat(pos.percentage || "0"),
            side: Number.parseFloat(pos.positionAmt) > 0 ? "LONG" : "SHORT",
          })) || []

      return NextResponse.json({
        totalBalance: totalWalletBalance,
        availableBalance,
        unrealizedPnl: totalUnrealizedProfit,
        positions,
        timestamp: Date.now(),
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
    console.error("💥 Account fetch error:", error)

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
