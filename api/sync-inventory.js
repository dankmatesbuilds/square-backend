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

    const debug = items.map((item) => {
      const rawField = item.fieldData?.squareVariationId
      const variationId =
        item.fieldData?.squareVariationId?.value ||
        item.fieldData?.squareVariationId ||
        null

      const match = counts.find(
        (c) => c.catalog_object_id === variationId
      )

      return {
        slug: item.slug,
        itemId: item.id,
        rawSquareVariationField: rawField ?? null,
        parsedVariationId: variationId,
        matchedSquareCount: match || null,
      }
    })

    return res.status(200).json({
      success: true,
      counts,
      debug,
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
