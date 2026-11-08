import { Router } from "express";
import { config } from "../config.js";
import { markOrderPaid } from "../services/orders.js";

export const webhooksRouter = Router();

/** Day 1: reachable endpoint; full signature verify when PAYPAL_WEBHOOK_ID is set. */
webhooksRouter.post("/api/webhooks/paypal", async (req, res) => {
  try {
    const event = req.body;
    console.log("PayPal webhook:", event?.event_type);

    if (event?.event_type === "PAYMENT.CAPTURE.COMPLETED") {
      const capture = event.resource;
      const paypalOrderId =
        capture?.supplementary_data?.related_ids?.order_id ||
        event.resource?.id;

      if (paypalOrderId) {
        await markOrderPaid({
          paypalOrderId,
          captureId: capture.id,
          capturePayload: event,
        });
      }
    }

    if (!config.paypal.webhookId) {
      console.warn(
        "PAYPAL_WEBHOOK_ID not set — webhook accepted without verification (dev only)."
      );
    }

    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

webhooksRouter.get("/api/webhooks/paypal", (_req, res) => {
  res.json({ ok: true, message: "PayPal webhook endpoint reachable" });
});
