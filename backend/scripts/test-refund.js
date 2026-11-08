/**
 * Refund viability smoke test (requires a paid order with paypal_capture_id).
 * Usage: node scripts/test-refund.js <capture_id> [amount_cents]
 */

import { refundCapture } from "../src/paypal/client.js";

const captureId = process.argv[2];
const amountCents = Number(process.argv[3]);

if (!captureId) {
  console.error("Usage: node scripts/test-refund.js <paypal_capture_id> [amount_cents]");
  process.exit(1);
}

try {
  const result = await refundCapture(
    captureId,
    amountCents || 2499,
    "USD"
  );
  console.log("Refund OK:", result);
} catch (e) {
  console.error("Refund failed:", e.message);
  process.exit(1);
}
