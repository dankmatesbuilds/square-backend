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

    let updatedItems = 0
    const results = []

    for (const item of items) {
      const variationId = item.fieldData?.huet4irMN?.value

      if (!variationId) {
        results.push({
          slug: item.slug,
          status: "skipped",
          reason: "No squareVariationId value",
        })
        continue
      }

      const match = counts.find(
        (c) => c.catalog_object_id === variationId
      )

      if (!match) {
        results.push({
          slug: item.slug,
          status: "skipped",
          reason: "No matching Square inventory record",
          variationId,
        })
        continue
      }

      const quantity = parseInt(match.quantity || "0", 10)

      let inventoryStatus = "in_stock"
      let availableForPurchase = true

      if (quantity === 0) {
        inventoryStatus = "out_of_stock"
        availableForPurchase = false
      } else if (quantity <= 5) {
        inventoryStatus = "low_stock"
      }

  await collection.addItems([
  {
    id: item.id,
    fieldData: {
      yUbHwMGoF: {
        type: "number",
        value: quantity,
      },
      IrXq4lgw1: {
        type: "string",
        value: inventoryStatus,
      },
      UtUDuijUm: {
        type: "boolean",
        value: availableForPurchase,
      },
      HFYkfE7mN: {
        type: "date",
        value: new Date().toISOString(),
      },
    },
  },
])

      updatedItems++

      results.push({
        slug: item.slug,
        status: "updated",
        variationId,
        quantity,
        inventoryStatus,
        availableForPurchase,
      })
    }

    return res.status(200).json({
      success: true,
      totalSquareItems: counts.length,
      updatedItems,
      results,
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
