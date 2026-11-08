import { Router } from "express";
import { createCheckoutOrder, captureOrder } from "../paypal/client.js";
import {
  createPendingOrder,
  extractCaptureFromOrderResponse,
  findOrderByPaypalOrderId,
  getPublishedListingById,
  markOrderPaid,
} from "../services/orders.js";

export const checkoutRouter = Router();

checkoutRouter.get("/api/demo-listing", async (_req, res) => {
  try {
    const { rows } = await (
      await import("../db/pool.js")
    ).getPool().query(
      `SELECT l.id, l.title, l.price_cents, l.currency, l.stock_quantity, s.slug AS seller_slug
       FROM listings l
       JOIN sellers s ON s.id = l.seller_id
       WHERE s.slug = 'demo-boutique' AND l.status = 'published'
       LIMIT 1`
    );
    if (!rows[0]) {
      return res.status(404).json({ error: "Run npm run db:seed first" });
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

checkoutRouter.post("/api/checkout", async (req, res) => {
  try {
    const { listingId, quantity = 1 } = req.body;
    if (!listingId) {
      return res.status(400).json({ error: "listingId required" });
    }
    const listing = await getPublishedListingById(listingId);
    if (!listing) {
      return res.status(404).json({ error: "Listing not found or not published" });
    }
    if (listing.stock_quantity < quantity) {
      return res.status(400).json({ error: "Insufficient stock" });
    }

    const customId = `munshi-${listing.id}-${Date.now()}`;
    const paypalOrder = await createCheckoutOrder({
      listing,
      quantity,
      customId,
    });

    await createPendingOrder({
      listing,
      quantity,
      paypalOrderId: paypalOrder.id,
    });

    const approvalUrl = paypalOrder.links?.find((l) => l.rel === "approve")?.href;

    res.json({
      paypalOrderId: paypalOrder.id,
      approvalUrl,
      amountCents: listing.price_cents * quantity,
      currency: listing.currency,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

checkoutRouter.post("/api/checkout/capture", async (req, res) => {
  try {
    const paypalOrderId = req.body.paypalOrderId || req.body.token;
    if (!paypalOrderId) {
      return res.status(400).json({ error: "paypalOrderId required" });
    }

    const existing = await findOrderByPaypalOrderId(paypalOrderId);
    if (!existing) {
      return res.status(404).json({ error: "Unknown PayPal order" });
    }

    const captureResponse = await captureOrder(paypalOrderId);
    const { captureId, capture } = extractCaptureFromOrderResponse(captureResponse);

    if (!captureId || capture?.status !== "COMPLETED") {
      return res.status(502).json({
        error: "Capture not completed",
        paypal: captureResponse,
      });
    }

    const result = await markOrderPaid({
      paypalOrderId,
      captureId,
      capturePayload: captureResponse,
    });

    if (!result.ok) {
      return res.status(409).json(result);
    }

    res.json({ ok: true, order: result.order });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

checkoutRouter.get("/api/checkout/return", async (req, res) => {
  const paypalOrderId = req.query.token;
  if (!paypalOrderId) {
    return res.status(400).send("Missing token");
  }
  res.redirect(`/checkout/success?paypalOrderId=${encodeURIComponent(paypalOrderId)}`);
});

checkoutRouter.get("/api/checkout/cancel", (_req, res) => {
  res.redirect("/checkout/cancelled");
});

checkoutRouter.get("/checkout/success", (_req, res) => {
  res.type("html").send(`
    <h1>Payment approved</h1>
    <p>Call <code>POST /api/checkout/capture</code> with your PayPal order id, or use the test script.</p>
  `);
});

checkoutRouter.get("/checkout/cancelled", (_req, res) => {
  res.type("html").send("<h1>Checkout cancelled</h1>");
});
