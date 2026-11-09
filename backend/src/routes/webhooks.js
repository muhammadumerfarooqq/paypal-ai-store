import { Router } from "express";
import { config } from "../config.js";
import { applyCaptureCompletedWebhook } from "../services/orders.js";
import { verifyPayPalWebhook } from "../paypal/webhookVerify.js";

export const webhooksRouter = Router();

webhooksRouter.post("/api/webhooks/paypal", async (req, res) => {
  try {
    const verification = await verifyPayPalWebhook(req);
    if (!verification.ok && !verification.skipped) {
      console.warn("PayPal webhook verification failed:", verification.reason);
      return res.sendStatus(401);
    }

    const event = req.body;
    console.log("PayPal webhook:", event?.event_type);

    if (event?.event_type === "PAYMENT.CAPTURE.COMPLETED") {
      const result = await applyCaptureCompletedWebhook(event);
      if (!result.ok && result.reason !== "order_not_found") {
        console.warn("Webhook capture apply:", result);
      }
    }

    if (verification.skipped) {
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
  res.json({
    ok: true,
    message: "PayPal webhook endpoint reachable",
    webhookIdConfigured: Boolean(config.paypal.webhookId),
  });
});
