import { getPool } from "../db/pool.js";
import { draftListing } from "../../../ai/index.js";

export async function getSellerBySlug(slug) {
  const { rows } = await getPool().query(
    "SELECT * FROM sellers WHERE slug = $1",
    [slug]
  );
  return rows[0] || null;
}

export async function createDraftFromPhotos(sellerId, photoUrls) {
  if (!photoUrls?.length) {
    throw new Error("At least one photo URL required");
  }
  if (photoUrls.length > 5) {
    throw new Error("Maximum 5 photos");
  }

  const draft = await draftListing(photoUrls);
  const cover = photoUrls[0];

  const { rows } = await getPool().query(
    `INSERT INTO listings (
       seller_id, title, description, category, price_cents, stock_quantity,
       status, image_url, photo_urls, tags, variants
     ) VALUES ($1, $2, $3, $4, NULL, 0, 'draft', $5, $6::jsonb, $7::jsonb, $8::jsonb)
     RETURNING *`,
    [
      sellerId,
      draft.title,
      draft.description,
      draft.category,
      cover,
      JSON.stringify(photoUrls),
      JSON.stringify(draft.tags || []),
      JSON.stringify(draft.variants || []),
    ]
  );
  return rows[0];
}

export async function updateListing(sellerId, listingId, patch) {
  const allowed = ["title", "description", "category", "price_cents", "stock_quantity", "tags", "variants"];
  const sets = [];
  const vals = [];
  let i = 1;

  for (const key of allowed) {
    if (patch[key] === undefined) continue;
    let value = patch[key];
    if (key === "tags" || key === "variants") {
      sets.push(`${key} = $${i}::jsonb`);
      value = JSON.stringify(value);
    } else {
      sets.push(`${key} = $${i}`);
    }
    vals.push(value);
    i++;
  }
  if (!sets.length) {
    throw new Error("No fields to update");
  }

  vals.push(listingId, sellerId);
  const { rows } = await getPool().query(
    `UPDATE listings SET ${sets.join(", ")}
     WHERE id = $${i} AND seller_id = $${i + 1} AND status = 'draft'
     RETURNING *`,
    vals
  );
  if (!rows[0]) throw new Error("Draft listing not found");
  return rows[0];
}

export async function publishListing(sellerId, listingId) {
  const { rows } = await getPool().query(
    `UPDATE listings
     SET status = 'published', published_at = now()
     WHERE id = $1 AND seller_id = $2 AND status = 'draft'
       AND price_cents IS NOT NULL AND price_cents > 0
       AND stock_quantity >= 0
     RETURNING *`,
    [listingId, sellerId]
  );
  if (!rows[0]) {
    throw new Error("Cannot publish: set price and stock, or listing is not draft");
  }
  return rows[0];
}

export async function getPublishedListingsForShop(sellerSlug) {
  const { rows } = await getPool().query(
    `SELECT l.id, l.title, l.description, l.category, l.price_cents, l.currency,
            l.stock_quantity, l.image_url, l.photo_urls, l.tags, l.published_at
     FROM listings l
     JOIN sellers s ON s.id = l.seller_id
     WHERE s.slug = $1 AND l.status = 'published'
     ORDER BY l.published_at DESC`,
    [sellerSlug]
  );
  return rows;
}

export async function getPublishedListingForShop(sellerSlug, listingId) {
  const { rows } = await getPool().query(
    `SELECT l.*
     FROM listings l
     JOIN sellers s ON s.id = l.seller_id
     WHERE s.slug = $1 AND l.id = $2 AND l.status = 'published'`,
    [sellerSlug, listingId]
  );
  return rows[0] || null;
}

export async function getSellerDrafts(sellerId) {
  const { rows } = await getPool().query(
    `SELECT id, title, price_cents, stock_quantity, status, created_at, image_url
     FROM listings WHERE seller_id = $1 AND status = 'draft'
     ORDER BY created_at DESC`,
    [sellerId]
  );
  return rows;
}
