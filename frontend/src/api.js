const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

export const DEFAULT_SELLER_SLUG =
  import.meta.env.VITE_DEFAULT_SELLER_SLUG || "demo-boutique";

export const PAYPAL_CLIENT_ID =
  import.meta.env.VITE_PAYPAL_CLIENT_ID ||
  import.meta.env.REACT_APP_PAYPAL_CLIENT_ID ||
  "";

export const CATEGORIES = [
  "Clothing",
  "Footwear",
  "Bags & Accessories",
  "Jewelry",
  "Beauty & Personal Care",
  "Home & Kitchen",
  "Decor & Art",
  "Electronics",
  "Toys & Kids",
  "Food & Drink",
  "Stationery & Crafts",
  "Other",
];

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, options);
  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const message =
      data?.error || data?.reason || data?.message || `HTTP ${res.status}`;
    const err = new Error(message);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export function formatMoney(cents, currency = "USD") {
  if (cents === null || cents === undefined || Number.isNaN(Number(cents))) {
    return "Price not set";
  }
  const amount = (Number(cents) / 100).toFixed(2);
  if ((currency || "USD").toUpperCase() === "USD") {
    return `$${amount} USD`;
  }
  return `${amount} ${currency}`;
}

export function getHealth() {
  return request("/health");
}

export function getShopListings(sellerSlug = DEFAULT_SELLER_SLUG) {
  return request(`/api/shop/${encodeURIComponent(sellerSlug)}/listings`);
}

export function getShopListing(sellerSlug, listingId) {
  return request(
    `/api/shop/${encodeURIComponent(sellerSlug)}/listings/${encodeURIComponent(listingId)}`
  );
}

export function uploadSellerPhotos(sellerSlug, files) {
  const form = new FormData();
  for (const file of files) {
    form.append("photos", file);
  }
  return request(`/api/sellers/${encodeURIComponent(sellerSlug)}/uploads`, {
    method: "POST",
    body: form,
  });
}

export function createListingDraft(sellerSlug, photoUrls) {
  return request(
    `/api/sellers/${encodeURIComponent(sellerSlug)}/listings/draft`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ photoUrls }),
    }
  );
}

export function updateListingDraft(sellerSlug, listingId, patch) {
  return request(
    `/api/sellers/${encodeURIComponent(sellerSlug)}/listings/${encodeURIComponent(listingId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }
  );
}

export function publishListingDraft(sellerSlug, listingId) {
  return request(
    `/api/sellers/${encodeURIComponent(sellerSlug)}/listings/${encodeURIComponent(listingId)}/publish`,
    {
      method: "POST",
    }
  );
}

export function getSellerDrafts(sellerSlug = DEFAULT_SELLER_SLUG) {
  return request(
    `/api/sellers/${encodeURIComponent(sellerSlug)}/listings/drafts`
  );
}

export function createCheckoutOrder({ listingId, quantity = 1 }) {
  return request("/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ listingId, quantity: Number(quantity) }),
  });
}

export function captureCheckoutOrder({ paypalOrderId }) {
  return request("/api/checkout/capture", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paypalOrderId }),
  });
}

export function getSellerOrders(sellerSlug = DEFAULT_SELLER_SLUG) {
  return request(`/api/sellers/${encodeURIComponent(sellerSlug)}/orders`);
}

export function getRestockSuggestions(sellerSlug = DEFAULT_SELLER_SLUG) {
  return request(
    `/api/sellers/${encodeURIComponent(sellerSlug)}/restock-suggestions`
  );
}

export function askAssistant({
  question,
  language = "en",
  sellerSlug = DEFAULT_SELLER_SLUG,
  listings,
}) {
  return request("/api/assistant", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, language, sellerSlug, listings }),
  });
}

export function proposeAssistantCart({
  message,
  sellerSlug = DEFAULT_SELLER_SLUG,
  listings,
}) {
  return request("/api/assistant/cart", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, sellerSlug, listings }),
  });
}

export function calculateCartTotal({ lineItems }) {
  return request("/api/cart/total", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lineItems }),
  });
}
