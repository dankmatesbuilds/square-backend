export default async function handler(req, res) {
  try {
    const squareToken = process.env.SQUARE_ACCESS_TOKEN
    const locationId = process.env.SQUARE_LOCATION_ID
    const squareEnv = (process.env.SQUARE_ENV || "sandbox").toLowerCase()

    const baseUrl =
      squareEnv === "production"
        ? "https://connect.squareup.com"
        : "https://connect.squareupsandbox.com"

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

    return res.status(response.status).json({
      ok: response.ok,
      environment: squareEnv,
      baseUrl,
      squareResponse: data,
    })
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message,
    })
  }
}
