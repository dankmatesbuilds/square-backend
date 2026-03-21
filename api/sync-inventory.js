import { connect } from "framer-api"

export default async function handler(req, res) {
  let framer

  try {
    const projectUrl = process.env.FRAMER_PROJECT_URL
    const apiKey = process.env.FRAMER_API_KEY

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

    return res.status(200).json({
      success: true,
      items: items.map((item) => ({
        slug: item.slug,
        title: item.fieldData?.Ju851CRPd?.value || null,
        squareVariationId: item.fieldData?.huet4irMN?.value || null,
      })),
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
