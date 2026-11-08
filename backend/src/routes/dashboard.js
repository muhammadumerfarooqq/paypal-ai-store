import { Router } from "express";
import { getPool } from "../db/pool.js";
import { getSellerBySlug } from "../services/listings.js";
import { buildRestockSuggestions } from "../services/restock.js";
import { summarizeOrders } from "../../../ai/index.js";

export const dashboardRouter = Router();

dashboardRouter.get("/api/sellers/:slug/orders", async (req, res) => {
  try {
    const seller = await getSellerBySlug(req.params.slug);
    if (!seller) return res.status(404).json({ error: "Seller not found" });

    const { rows } = await getPool().query(
      `SELECT o.id, o.status, o.amount_cents, o.currency, o.quantity, o.paid_at,
              o.paypal_order_id, o.paypal_capture_id, l.title AS listing_title
       FROM orders o
       JOIN listings l ON l.id = o.listing_id
       WHERE o.seller_id = $1
       ORDER BY o.created_at DESC
       LIMIT 100`,
      [seller.id]
    );

    const summary = await summarizeOrders(rows);
    res.json({ orders: rows, summary });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

dashboardRouter.get("/api/sellers/:slug/restock-suggestions", async (req, res) => {
  try {
    const seller = await getSellerBySlug(req.params.slug);
    if (!seller) return res.status(404).json({ error: "Seller not found" });

    const listings = await getPool().query(
      `SELECT id, title, stock_quantity FROM listings
       WHERE seller_id = $1 AND status = 'published'`,
      [seller.id]
    );

    const sales = await getPool().query(
      `SELECT o.listing_id, COALESCE(SUM(o.quantity), 0)::int AS qty
       FROM orders o
       WHERE o.seller_id = $1 AND o.status = 'paid'
         AND o.paid_at >= now() - interval '7 days'
       GROUP BY o.listing_id`,
      [seller.id]
    );

    const counts = {};
    for (const r of sales.rows) counts[r.listing_id] = r.qty;

    const suggestions = buildRestockSuggestions(listings.rows, counts);
    res.json({
      disclaimer: "Rule-based hints only, not a predictive model.",
      suggestions,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
