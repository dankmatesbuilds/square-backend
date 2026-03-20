import { connect } from "framer-api"

export default async function handler(req, res) {
  let framer

  try {
    const squareToken = process.env.SQUARE_ACCESS_TOKEN
    const locationId = process.env.SQUARE_LOCATION_ID
    const squareEnv = (process.env.SQUARE_ENV || "sandbox").toLowerCase()

    const projectUrl = process.env.FRAMER_PROJECT_URL
    const apiKey = process.env.FRAMER_API_KEY

    const baseUrl =
      squareEnv === "production"
        ? "https://connect.squareup.com"
        : "https://connect.squareupsandbox.com"

    // 1. Connect to Framer
    framer = await connect(projectUrl, apiKey)

    const collections = await framer.getCollections()
    const collection = collections.find((c) => c.name === "Products")

    if (!collection) {
      return res.status(404).json({
        success: false,
        error: "Products collection not found",
      })
    }

    const items = await collection.getItems()

    // 2. Get Square inventory
    const response = await fetch(
      `${baseUrl}/v2/inventory/counts/batch-retrieve`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${squareToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          location_ids: [locationId],
        }),
      }
    )

    const data = await response.json()
    const counts = data.counts || []

    let updated = 0

    // 3. Loop through Framer items
    for (const item of items) {
      const variationId =
        item.fieldData?.squareVariationId?.value

      if (!variationId) continue

      // Find matching Square inventory
      const match = counts.find(
        (c) => c.catalog_object_id === variationId
      )

      if (!match) continue

      const quantity = parseInt(match.quantity || "0")

      let status = "in_stock"
      let available = true

      if (quantity === 0) {
        status = "out_of_stock"
        available = false
      } else if (quantity <= 5) {
        status = "low_stock"
      }

      // 4. Update Framer item
      await collection.addItems([
        {
          id: item.id,
          fieldData: {
            inventoryCount: quantity,
            inventoryStatus: status,
            availableForPurchase: available,
            lastSyncedAt: new Date().toISOString(),
          },
        },
      ])

      updated++
    }

    return res.status(200).json({
      success: true,
      totalSquareItems: counts.length,
      updatedItems: updated,
    })

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    })
  } finally {
    if (framer) {
      await framer.disconnect()
    }
  }
}
