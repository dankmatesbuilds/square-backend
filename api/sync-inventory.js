import { connect } from "framer-api"

export default async function handler(req, res) {
  let framer

  try {
    const projectUrl = process.env.FRAMER_PROJECT_URL
    const apiKey = process.env.FRAMER_API_KEY

    framer = await connect(projectUrl, apiKey)

    const collections = await framer.getCollections()

    return res.status(200).json({
      ok: true,
      collections: collections.map(c => ({
        id: c.id,
        name: c.name
      }))
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
