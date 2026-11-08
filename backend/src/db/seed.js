import { getPool } from "./pool.js";

const DEMO_SLUG = "demo-boutique";

const pool = getPool();

try {
  const existing = await pool.query(
    "SELECT id FROM sellers WHERE slug = $1",
    [DEMO_SLUG]
  );
  if (existing.rows.length > 0) {
    console.log(`Seed skipped: seller "${DEMO_SLUG}" already exists.`);
    process.exit(0);
  }

  const seller = await pool.query(
    `INSERT INTO sellers (slug, display_name)
     VALUES ($1, $2)
     RETURNING id`,
    [DEMO_SLUG, "Demo Boutique (seed)"]
  );
  const sellerId = seller.rows[0].id;

  const listing = await pool.query(
    `INSERT INTO listings (
       seller_id, title, description, category, price_cents, currency,
       stock_quantity, status, image_url, tags, variants, published_at
     ) VALUES (
       $1, $2, $3, $4, $5, 'USD', $6, 'published',
       $7, $8::jsonb, $9::jsonb, now()
     )
     RETURNING id, title, price_cents, stock_quantity`,
    [
      sellerId,
      "Artisan Ceramic Mug",
      "Day 1 hardcoded product for PayPal sandbox checkout. Demo seed data.",
      "Home & Kitchen",
      2499,
      25,
      "https://res.cloudinary.com/demo/image/upload/sample.jpg",
      JSON.stringify(["demo", "munshi", "seed"]),
      JSON.stringify([{ name: "Color", options: ["Sand", "Ocean"] }]),
    ]
  );

  console.log("Seed complete:");
  console.log({ sellerSlug: DEMO_SLUG, listing: listing.rows[0] });
} finally {
  await pool.end();
}
