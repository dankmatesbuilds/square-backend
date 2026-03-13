export default function handler(req, res) {
  const products = [
    {
      id: "1",
      slug: "sample-product",
      name: "Sample Product",
      price: 2500,
      currency: "USD"
    }
  ]

  const product = products.find(
    p => p.id === req.query.id || p.slug === req.query.id
  )

  if (!product) {
    return res.status(404).json({ error: "Product not found" })
  }

  res.status(200).json(product)
}
