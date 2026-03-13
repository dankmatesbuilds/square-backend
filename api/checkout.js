import { Client, Environment } from "square"
import { randomUUID } from "node:crypto"

function safeJson(value) {
  return JSON.parse(
    JSON.stringify(value, (_, v) =>
      typeof v === "bigint" ? v.toString() : v
    )
  )
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")

  if (req.method === "OPTIONS") {
    return res.status(200).end()
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." })
  }

  const accessToken = process.env.SQUARE_ACCESS_TOKEN
  const locationId = process.env.SQUARE_LOCATION_ID
  const squareEnv = (process.env.SQUARE_ENV || "sandbox").toLowerCase()

  if (!accessToken) {
    return res.status(500).json({ error: "Missing SQUARE_ACCESS_TOKEN" })
  }

  if (!locationId) {
    return res.status(500).json({ error: "Missing SQUARE_LOCATION_ID" })
  }

  const { sourceId, amount, currency = "USD" } = req.body || {}

  if (!sourceId) {
    return res.status(400).json({ error: "Missing sourceId" })
  }

  if (!amount || typeof amount !== "number") {
    return res.status(400).json({ error: "Missing or invalid amount" })
  }

  try {
    console.log("Creating payment with:", {
      squareEnv,
      locationId,
      amount,
      currency,
      hasSourceId: !!sourceId,
    })

    const client = new Client({
      environment:
        squareEnv === "production"
          ? Environment.Production
          : Environment.Sandbox,
      accessToken,
    })

    const response = await client.paymentsApi.createPayment({
      sourceId,
      idempotencyKey: randomUUID(),
      amountMoney: {
        amount,
        currency,
      },
      locationId,
    })

    return res.status(200).json(safeJson(response.result))
  } catch (error) {
    console.error("Square checkout error:", error)
    return res.status(500).json(
      safeJson({
        error: "Checkout failed",
        detail: error?.errors || error?.message || String(error),
      })
    )
  }
}