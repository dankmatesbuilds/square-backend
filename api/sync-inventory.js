for (const item of items) {
  const variationId =
    item.fieldData?.squareVariationId?.value ||
    item.fieldData?.squareVariationId

  if (!variationId) continue

  const match = counts.find(
    (c) => c.catalog_object_id === variationId
  )

  if (!match) continue

  const quantity = parseInt(match.quantity || "0")

  let status = "in_stock"
  let available = true

  if (quantity === 0) {
    status = "out_of_stock"
    available = false
  } else if (quantity <= 5) {
    status = "low_stock"
  }

  await collection.addItems([
    {
      id: item.id,
      fieldData: {
        inventoryCount: quantity,
        inventoryStatus: status,
        availableForPurchase: available,
        lastSyncedAt: new Date().toISOString(),
      },
    },
  ])
}
