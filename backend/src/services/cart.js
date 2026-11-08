import { getPool } from "../db/pool.js";

export async function computeCartTotal(lineItems) {
  if (!Array.isArray(lineItems) || !lineItems.length) {
    throw new Error("lineItems required");
  }

  const items = [];
  let totalCents = 0;
  let currency = "USD";

  for (const line of lineItems) {
    const { listingId, quantity } = line;
    if (!listingId || !quantity || quantity < 1) {
      throw new Error("Each line needs listingId and quantity >= 1");
    }

    const { rows } = await getPool().query(
      `SELECT id, title, price_cents, currency, stock_quantity, status
       FROM listings WHERE id = $1`,
      [listingId]
    );
    const listing = rows[0];
    if (!listing || listing.status !== "published") {
      throw new Error(`Listing ${listingId} not available`);
    }
    if (listing.stock_quantity < quantity) {
      throw new Error(`Insufficient stock for ${listing.title}`);
    }

    currency = listing.currency || "USD";
    const lineCents = listing.price_cents * quantity;
    totalCents += lineCents;
    items.push({
      listingId: listing.id,
      title: listing.title,
      quantity,
      unitPriceCents: listing.price_cents,
      lineTotalCents: lineCents,
    });
  }

  return { currency, totalCents, items };
}
