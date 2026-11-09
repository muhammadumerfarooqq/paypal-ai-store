/**
 * Live Render smoke + checkout start.
 * Full pay + webhook: approve in browser, then:
 *   node scripts/test-live-deploy.js capture <PAYPAL_ORDER_ID>
 */

const base =
  process.env.PUBLIC_BASE_URL || "https://paypal-ai-store.onrender.com";
const slug = process.env.DEMO_SELLER_SLUG || "demo-boutique";

async function json(path, options) {
  const res = await fetch(`${base}${path}`, options);
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text.slice(0, 200) };
  }
  return { status: res.status, data };
}

async function main() {
  const [, , action, paypalOrderId] = process.argv;

  const health = await json("/health");
  console.log("GET /health", health.status, health.data);
  if (!health.data?.ok) process.exit(1);

  const webhook = await json("/api/webhooks/paypal");
  console.log("GET /api/webhooks/paypal", webhook.status, webhook.data);

  if (action === "capture") {
    if (!paypalOrderId) {
      console.error("Usage: node scripts/test-live-deploy.js capture <PAYPAL_ORDER_ID>");
      process.exit(1);
    }
    const before = await json("/api/orders");
    const stockBefore = await json(`/api/shop/${slug}/listings`);

    const cap = await json("/api/checkout/capture", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paypalOrderId }),
    });
    console.log("POST /api/checkout/capture", cap.status, cap.data);

    await new Promise((r) => setTimeout(r, 3000));

    const after = await json("/api/orders");
    const stockAfter = await json(`/api/shop/${slug}/listings`);
    console.log("\nOrders (before → after paid count):");
    const paid = (rows) =>
      (rows?.orders || rows || []).filter((o) => o.status === "paid").length;
    console.log(
      paid(before.data),
      "→",
      paid(after.data),
      cap.data?.order?.status
    );
    if (stockBefore.data?.listings?.[0] && stockAfter.data?.listings?.[0]) {
      console.log(
        "Sample listing stock:",
        stockBefore.data.listings[0].stock_quantity,
        "→",
        stockAfter.data.listings[0].stock_quantity
      );
    }
    return;
  }

  const shop = await json(`/api/shop/${slug}/listings`);
  const listing = shop.data?.listings?.find((l) => l.stock_quantity > 0);
  if (!listing) {
    console.error("No in-stock listing for", slug, shop.data);
    process.exit(1);
  }
  console.log("Using listing:", listing.id, listing.title, listing.stock_quantity);

  const checkout = await json("/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ listingId: listing.id, quantity: 1 }),
  });
  console.log("POST /api/checkout", checkout.status);
  if (checkout.status !== 200) {
    console.log(checkout.data);
    process.exit(1);
  }

  console.log("\nPayPal order:", checkout.data.paypalOrderId);
  console.log("Approve:\n", checkout.data.approvalUrl);
  console.log(
    "\nAfter sandbox payment (webhook may mark paid; capture is fallback):\n",
    `node scripts/test-live-deploy.js capture ${checkout.data.paypalOrderId}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
