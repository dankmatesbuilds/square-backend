export default async function handler(req, res) {
  try {
    const squareToken = process.env.SQUARE_ACCESS_TOKEN
    const locationId = process.env.SQUARE_LOCATION_ID
    const squareEnv = (process.env.SQUARE_ENV || "sandbox").toLowerCase()
    const framerKey = process.env.FRAMER_API_KEY

    const baseUrl =
      squareEnv === "production"
        ? "https://connect.squareup.com"
        : "https://connect.squareupsandbox.com"

    // 1. Get inventory from Square
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

    // 2. Loop through inventory items
    for (const item of counts) {
      const variationId = item.catalog_object_id
      const quantity = parseInt(item.quantity || "0")

      let status = "in_stock"
      let available = true

      if (quantity === 0) {
        status = "out_of_stock"
        available = false
      } else if (quantity <= 5) {
        status = "low_stock"
      }

      // 3. Update Framer CMS
      await fetch("https://api.framer.com/v1/cms/items/update", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${framerKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          field: "squareVariationId",
          value: variationId,
          data: {
            inventoryCount: quantity,
            inventoryStatus: status,
            availableForPurchase: available,
            lastSyncedAt: new Date().toISOString(),
          },
        }),
      })
    }

    return res.status(200).json({
      success: true,
      syncedItems: counts.length,
    })

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    })
  }
}
