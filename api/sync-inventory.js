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

    console.log("SQUARE COUNTS:", JSON.stringify(counts, null, 2))

    for (const item of items) {
      console.log("ITEM SLUG:", item.slug)
      console.log("FULL FIELD DATA:", JSON.stringify(item.fieldData, null, 2))

      const variationId =
        item.fieldData?.squareVariationId?.value ||
        item.fieldData?.squareVariationId ||
        item.fieldData?.["squareVariationId"]?.value ||
        item.fieldData?.["squareVariationId"]

      console.log("READ VARIATION ID:", variationId)

      const match = counts.find(
        (c) => c.catalog_object_id === variationId
      )

      console.log("MATCH FOUND:", JSON.stringify(match, null, 2))
    }

    return res.status(200).json({
      success: true,
      totalSquareItems: counts.length,
      checkedItems: items.length,
    })
  } catch (error) {
    console.error("SYNC ERROR:", error)
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
