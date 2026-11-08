import { getPool } from "../db/pool.js";

export async function getPublishedListingById(listingId) {
  const { rows } = await getPool().query(
    `SELECT l.*, s.slug AS seller_slug
     FROM listings l
     JOIN sellers s ON s.id = l.seller_id
     WHERE l.id = $1 AND l.status = 'published'`,
    [listingId]
  );
  return rows[0] || null;
}

export async function findOrderByPaypalOrderId(paypalOrderId) {
  const { rows } = await getPool().query(
    "SELECT * FROM orders WHERE paypal_order_id = $1",
    [paypalOrderId]
  );
  return rows[0] || null;
}

export async function createPendingOrder({ listing, quantity, paypalOrderId }) {
  const amountCents = listing.price_cents * quantity;
  const { rows } = await getPool().query(
    `INSERT INTO orders (
       seller_id, listing_id, quantity, amount_cents, currency,
       status, paypal_order_id
     ) VALUES ($1, $2, $3, $4, $5, 'created', $6)
     RETURNING *`,
    [
      listing.seller_id,
      listing.id,
      quantity,
      amountCents,
      listing.currency || "USD",
      paypalOrderId,
    ]
  );
  return rows[0];
}

export async function markOrderPaid({
  paypalOrderId,
  captureId,
  capturePayload,
}) {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const orderRes = await client.query(
      `SELECT o.*, l.stock_quantity
       FROM orders o
       JOIN listings l ON l.id = o.listing_id
       WHERE o.paypal_order_id = $1
       FOR UPDATE`,
      [paypalOrderId]
    );
    const order = orderRes.rows[0];
    if (!order) {
      await client.query("ROLLBACK");
      return { ok: false, reason: "order_not_found" };
    }
    if (order.status === "paid") {
      await client.query("COMMIT");
      return { ok: true, order, alreadyPaid: true };
    }

    const qty = order.quantity;
    if (order.stock_quantity < qty) {
      await client.query("ROLLBACK");
      return { ok: false, reason: "insufficient_stock" };
    }

    const updated = await client.query(
      `UPDATE orders
       SET status = 'paid',
           paypal_capture_id = $2,
           raw_paypal = $3::jsonb,
           paid_at = now()
       WHERE id = $1
       RETURNING *`,
      [order.id, captureId, JSON.stringify(capturePayload)]
    );

    await client.query(
      `UPDATE listings
       SET stock_quantity = stock_quantity - $1
       WHERE id = $2`,
      [qty, order.listing_id]
    );

    await client.query("COMMIT");
    return { ok: true, order: updated.rows[0] };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export function extractCaptureFromOrderResponse(captureResponse) {
  const unit = captureResponse?.purchase_units?.[0];
  const capture = unit?.payments?.captures?.[0];
  return {
    captureId: capture?.id,
    status: capture?.status,
    capture,
  };
}
