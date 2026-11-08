import { Router } from "express";
import { getPool } from "../db/pool.js";

export const ordersRouter = Router();

ordersRouter.get("/api/orders", async (_req, res) => {
  try {
    const { rows } = await getPool().query(
      `SELECT o.id, o.status, o.amount_cents, o.currency, o.quantity,
              o.paypal_order_id, o.paypal_capture_id, o.paid_at,
              l.title AS listing_title
       FROM orders o
       JOIN listings l ON l.id = o.listing_id
       ORDER BY o.created_at DESC
       LIMIT 20`
    );
    res.json({ orders: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
