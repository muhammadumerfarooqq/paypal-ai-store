import { config, requirePayPal } from "../config.js";

let cachedToken = null;
let tokenExpiresAt = 0;

async function getAccessToken() {
  const now = Date.now();
  if (cachedToken && now < tokenExpiresAt - 30_000) {
    return cachedToken;
  }

  const { clientId, clientSecret } = requirePayPal();
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(`${config.paypal.apiBase}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayPal token failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiresAt = now + data.expires_in * 1000;
  return cachedToken;
}

async function paypalFetch(path, options = {}) {
  const token = await getAccessToken();
  const res = await fetch(`${config.paypal.apiBase}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }
  if (!res.ok) {
    throw new Error(`PayPal ${path} (${res.status}): ${text}`);
  }
  return body;
}

export async function createCheckoutOrder({
  listing,
  quantity = 1,
  customId,
}) {
  const unitAmount = (listing.price_cents / 100).toFixed(2);
  const { publicBaseUrl } = config;

  return paypalFetch("/v2/checkout/orders", {
    method: "POST",
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: listing.id,
          custom_id: customId,
          description: listing.title.slice(0, 127),
          amount: {
            currency_code: listing.currency || "USD",
            value: unitAmount,
            breakdown: {
              item_total: {
                currency_code: listing.currency || "USD",
                value: unitAmount,
              },
            },
          },
          items: [
            {
              name: listing.title.slice(0, 127),
              quantity: String(quantity),
              unit_amount: {
                currency_code: listing.currency || "USD",
                value: unitAmount,
              },
              category: "PHYSICAL_GOODS",
            },
          ],
        },
      ],
      application_context: {
        return_url: `${publicBaseUrl}/api/checkout/return`,
        cancel_url: `${publicBaseUrl}/api/checkout/cancel`,
        brand_name: "Munshi",
        user_action: "PAY_NOW",
      },
    }),
  });
}

export async function captureOrder(paypalOrderId) {
  return paypalFetch(`/v2/checkout/orders/${paypalOrderId}/capture`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function refundCapture(captureId, amountCents, currency = "USD") {
  const value = (amountCents / 100).toFixed(2);
  return paypalFetch(`/v2/payments/captures/${captureId}/refund`, {
    method: "POST",
    body: JSON.stringify({
      amount: { value, currency_code: currency },
    }),
  });
}
