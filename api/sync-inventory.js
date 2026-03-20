export default async function handler(req, res) {
  try {
    const squareToken = process.env.SQUARE_ACCESS_TOKEN;
    const locationId = process.env.SQUARE_LOCATION_ID;

    // 1. Get inventory counts
    const inventoryRes = await fetch(
      "https://connect.squareup.com/v2/inventory/batch-retrieve-counts",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${squareToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          location_ids: [locationId],
        }),
      }
    );

    const inventoryData = await inventoryRes.json();

    console.log("Inventory:", inventoryData);

    return res.status(200).json({
      success: true,
      data: inventoryData,
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
