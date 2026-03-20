import { connect } from "framer-api"

export default async function handler(req, res) {
  let framer

  try {
    const projectUrl = process.env.FRAMER_PROJECT_URL
    const apiKey = process.env.FRAMER_API_KEY

    framer = await connect(projectUrl, apiKey)

    const collections = await framer.getCollections()
    const productsCollection = collections.find((c) => c.id === "rfMZuERik")

    if (!productsCollection) {
      return res.status(404).json({
        ok: false,
        error: "Products collection not found",
      })
    }

    const items = await productsCollection.getItems()

    return res.status(200).json({
      ok: true,
      collection: {
        id: productsCollection.id,
        name: productsCollection.name,
      },
      itemCount: items.length,
      items: items.map((item) => ({
        id: item.id,
        slug: item.slug,
        fieldData: item.fieldData,
      })),
    })
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message,
    })
  } finally {
    if (framer) {
      await framer.disconnect()
    }
  }
}
