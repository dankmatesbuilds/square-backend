export default async function handler(req, res) {
  try {
    const squareToken = process.env.SQUARE_ACCESS_TOKEN
    const locationId = process.env.SQUARE_LOCATION_ID

    const response = await fetch(
      "https://connect.squareup.com/v2/inventory/counts/batch-retrieve",
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

    return res.status(200).json({
      ok: true,
      squareResponse: data,
    })
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message,
    })
  }
}
