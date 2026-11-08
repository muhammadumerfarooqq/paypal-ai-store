/**
 * Day 2 flow without file upload (uses Cloudinary URL from body).
 * Usage: node scripts/test-day2-flow.js [sellerSlug]
 */

const base = process.env.PUBLIC_BASE_URL || "http://localhost:3001";
const slug = process.argv[2] || "demo-boutique";

async function json(path, options) {
  const res = await fetch(`${base}${path}`, options);
  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data));
  return data;
}

const samplePhoto =
  "https://res.cloudinary.com/demo/image/upload/sample.jpg";

try {
  const draft = await json(`/api/sellers/${slug}/listings/draft`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ photoUrls: [samplePhoto] }),
  });
  console.log("Draft created:", draft.listing.id, draft.listing.title);

  const updated = await json(`/api/sellers/${slug}/listings/${draft.listing.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ price_cents: 1999, stock_quantity: 10 }),
  });
  console.log("Price set:", updated.listing.price_cents);

  const published = await json(
    `/api/sellers/${slug}/listings/${draft.listing.id}/publish`,
    { method: "POST" }
  );
  console.log("Published:", published.listing.id);

  const shop = await json(`/api/shop/${slug}/listings`);
  console.log("Shop count:", shop.listings.length);

  const checkout = await json("/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ listingId: published.listing.id, quantity: 1 }),
  });
  console.log("\nPayPal approval URL:\n", checkout.approvalUrl);
  console.log(
    "\nAfter sandbox pay: node scripts/test-checkout-flow.js capture",
    checkout.paypalOrderId
  );
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
