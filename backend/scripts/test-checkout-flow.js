/**
 * Day 1 E2E helper:
 * 1) npm run db:seed
 * 2) npm run dev  (server running)
 * 3) node scripts/test-checkout-flow.js
 * Approve in browser, then re-run: node scripts/test-checkout-flow.js capture <PAYPAL_ORDER_ID>
 */

const base = process.env.PUBLIC_BASE_URL || "http://localhost:3001";

async function main() {
  const [,, action, paypalOrderId] = process.argv;

  if (action === "capture") {
    if (!paypalOrderId) {
      console.error("Usage: node scripts/test-checkout-flow.js capture <PAYPAL_ORDER_ID>");
      process.exit(1);
    }
    const res = await fetch(`${base}/api/checkout/capture`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paypalOrderId }),
    });
    const data = await res.json();
    console.log(res.status, data);
    return;
  }

  const listingRes = await fetch(`${base}/api/demo-listing`);
  const listing = await listingRes.json();
  if (!listing.id) {
    console.error("No demo listing:", listing);
    process.exit(1);
  }

  const res = await fetch(`${base}/api/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ listingId: listing.id, quantity: 1 }),
  });
  const data = await res.json();
  if (!res.ok) {
    console.error(data);
    process.exit(1);
  }

  console.log("\nDemo listing:", listing.title, `$${(listing.price_cents / 100).toFixed(2)}`);
  console.log("PayPal order id:", data.paypalOrderId);
  console.log("\nOpen this URL in a browser and pay with the sandbox personal account:\n");
  console.log(data.approvalUrl);
  console.log(
    "\nAfter approval, run:\n",
    `node scripts/test-checkout-flow.js capture ${data.paypalOrderId}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
