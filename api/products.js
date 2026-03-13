export default function handler(req, res) {
  res.status(200).json([
    {
      id: "1",
      slug: "sample-product",
      name: "Sample Product",
      price: 2500,
      currency: "USD"
    }
  ])
}