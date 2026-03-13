require('dotenv').config();
const express = require('express');
const { Client, Environment } = require('square');
const crypto = require('crypto');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const SQUARE_ENV = (process.env.SQUARE_ENV || 'sandbox').toLowerCase();

const client = new Client({
  environment: SQUARE_ENV === 'production' ? Environment.Production : Environment.Sandbox,
  accessToken: process.env.SQUARE_ACCESS_TOKEN || ''
});

function handleApiError(res, err, prefix = 'Request failed') {
  const detail = err && err.errors ? err.errors : (err && err.message) || String(err);
  return res.status(500).json({ error: prefix, detail });
}

// Square Runnng Check
app.get('/', (req, res) => {
  res.send('Square backend is running');
});

// Health
app.get('/health', (req, res) => res.json({ ok: true }));

//Products
app.get("/api/products", (req, res) => {
  res.json([
    {
      id: "1",
      slug: "sample-product",
      name: "Sample Product",
      price: 2500,
      currency: "USD"
    }
  ]);
});

//Products ID
app.get("/api/products/:id", (req, res) => {
  const products = [
    {
      id: "1",
      slug: "sample-product",
      name: "Sample Product",
      price: 2500,
      currency: "USD"
    }
  ];

  const product = products.find(
    (p) => p.id === req.params.id || p.slug === req.params.id
  );

  if (!product) {
    return res.status(404).json({ error: "Product not found" });
  }

  res.json(product);
});

app.post("/api/checkout", async (req, res) => {
  const { sourceId, amount, currency = "USD" } = req.body || {};

  if (!sourceId) {
    return res.status(400).json({ error: "Missing sourceId" });
  }

  if (!amount || typeof amount !== "number") {
    return res.status(400).json({ error: "Missing or invalid amount" });
  }

  try {
    const idempotencyKey = crypto.randomUUID();
    const locationId = process.env.SQUARE_LOCATION_ID;

    const body = {
      sourceId,
      idempotencyKey,
      amountMoney: { amount, currency }
    };

    if (locationId) body.locationId = locationId;

    const response = await client.paymentsApi.createPayment(body);
    return res.json(response.result);
  } catch (err) {
    return handleApiError(res, err, "Checkout failed");
  }
});

// Idempotency key generator for clients
app.get('/idempotency-key', (req, res) => {
  res.json({ idempotencyKey: crypto.randomUUID() });
});

// Customers
app.post('/customers', async (req, res) => {
  const { givenName, familyName, emailAddress, phoneNumber, referenceId, note } = req.body || {};
  try {
    const response = await client.customersApi.createCustomer({ givenName, familyName, emailAddress, phoneNumber, referenceId, note });
    return res.json(response.result);
  } catch (err) {
    return handleApiError(res, err, 'Create customer failed');
  }
});

app.get('/customers/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const response = await client.customersApi.retrieveCustomer(id);
    return res.json(response.result);
  } catch (err) {
    return handleApiError(res, err, 'Retrieve customer failed');
  }
});

// Save a card on file for a customer (expects { sourceId, cardholderName })
app.post('/customers/:id/cards', async (req, res) => {
  const { id: customerId } = req.params;
  const { sourceId, cardholderName } = req.body || {};
  if (!sourceId) return res.status(400).json({ error: 'Missing sourceId (card nonce/token)' });

  try {
    const idempotencyKey = crypto.randomUUID();
    // The Cards API expects a body with card details and sourceId
    const body = {
      idempotencyKey,
      sourceId,
      card: {
        cardholderName,
        customerId
      }
    };
    const response = await client.cardsApi.createCard(body);
    return res.json(response.result);
  } catch (err) {
    return handleApiError(res, err, 'Create card failed');
  }
});

// Refunds
app.post('/refunds', async (req, res) => {
  const { paymentId, amount, currency = 'USD' } = req.body || {};
  if (!paymentId) return res.status(400).json({ error: 'Missing paymentId' });
  if (!amount || typeof amount !== 'number') return res.status(400).json({ error: 'Missing or invalid amount (number in cents)' });

  try {
    const idempotencyKey = crypto.randomUUID();
    const body = {
      idempotencyKey,
      amountMoney: { amount, currency },
      paymentId
    };
    const response = await client.refundsApi.refundPayment(body);
    return res.json(response.result);
  } catch (err) {
    return handleApiError(res, err, 'Refund failed');
  }
});

// Retrieve payment
app.get('/payments/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const response = await client.paymentsApi.getPayment(id);
    return res.json(response.result);
  } catch (err) {
    return handleApiError(res, err, 'Get payment failed');
  }
});

// List payments (optional query params: beginTime, endTime, sortOrder, cursor)
app.get('/payments', async (req, res) => {
  try {
    const response = await client.paymentsApi.listPayments(req.query);
    return res.json(response.result);
  } catch (err) {
    return handleApiError(res, err, 'List payments failed');
  }
});

app.listen(PORT, () => {
  console.log(`Square backend running on http://localhost:${PORT}`);
});
