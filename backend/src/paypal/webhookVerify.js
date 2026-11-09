import { config, requirePayPal } from "../config.js";
import { getAccessToken } from "./client.js";

export { getAccessToken };

/**
 * @see https://developer.paypal.com/api/rest/webhooks/rest/
 */
export async function verifyPayPalWebhook(req) {
  const webhookId = config.paypal.webhookId;
  if (!webhookId) {
    return { ok: true, skipped: true };
  }

  const h = req.headers;
  const authAlgo = h["paypal-auth-algo"];
  const certUrl = h["paypal-cert-url"];
  const transmissionId = h["paypal-transmission-id"];
  const transmissionSig = h["paypal-transmission-sig"];
  const transmissionTime = h["paypal-transmission-time"];

  if (!authAlgo || !certUrl || !transmissionId || !transmissionSig || !transmissionTime) {
    return { ok: false, reason: "missing_transmission_headers" };
  }

  const token = await getAccessToken();
  const res = await fetch(
    `${config.paypal.apiBase}/v1/notifications/verify-webhook-signature`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        auth_algo: authAlgo,
        cert_url: certUrl,
        transmission_id: transmissionId,
        transmission_sig: transmissionSig,
        transmission_time: transmissionTime,
        webhook_id: webhookId,
        webhook_event: req.body,
      }),
    }
  );

  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = {};
  }

  if (!res.ok) {
    return { ok: false, reason: `verify_http_${res.status}`, detail: text };
  }

  if (body.verification_status !== "SUCCESS") {
    return { ok: false, reason: body.verification_status || "verification_failed" };
  }

  return { ok: true };
}
