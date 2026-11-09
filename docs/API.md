# Munshi API

Base URL: `PUBLIC_BASE_URL` (local default `http://localhost:3001`).

## Health

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Service status |

## Shop (public)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/shop/:sellerSlug/listings` | Published listings |
| GET | `/api/shop/:sellerSlug/listings/:listingId` | One published listing |

## Seller listings

| Method | Path | Body | Description |
|--------|------|------|-------------|
| POST | `/api/sellers/:slug/uploads` | `multipart/form-data` field `photos` (max 5) | Upload to Cloudinary → `{ photoUrls }` |
| POST | `/api/sellers/:slug/listings/draft` | `{ "photoUrls": ["https://..."] }` | Real AI draft (Gemini) → DB row. Fields empty if AI unavailable |
| PATCH | `/api/sellers/:slug/listings/:listingId` | `{ "price_cents", "stock_quantity", "title", ... }` | Edit draft (seller sets price) |
| POST | `/api/sellers/:slug/listings/:listingId/publish` | — | Publish when price + stock set |
| GET | `/api/sellers/:slug/listings/drafts` | — | List drafts |

## Checkout (PayPal sandbox)

| Method | Path | Body | Description |
|--------|------|------|-------------|
| POST | `/api/checkout` | `{ "listingId", "quantity" }` | Create PayPal order (price from DB) |
| POST | `/api/checkout/capture` | `{ "paypalOrderId" }` | Capture + mark paid + decrement stock |
| GET | `/api/demo-listing` | — | Day 1 seed listing (dev) |

## Orders & dashboard

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/orders` | Recent orders (dev) |
| GET | `/api/sellers/:slug/orders` | Seller orders + AI summary (numbers computed in code; "not enough data" under 3 orders) |
| GET | `/api/sellers/:slug/restock-suggestions` | Rule-based restock hints |

## Customer assistant (AI)

| Method | Path | Body | Description |
|--------|------|------|-------------|
| POST | `/api/assistant` | `{ "question", "language"?: "en"\|"ur", "sellerSlug"?: string, "listings"?: [] }` | `answerQuestion(listings, question, language)` |
| POST | `/api/assistant/cart` | `{ "message", "sellerSlug"?: string, "listings"?: [] }` | `proposeCartItems(listings, message)` — confirm then `POST /api/cart/total` |

Pass **`sellerSlug`** (e.g. `demo-boutique`) or an explicit **`listings`** array from the shop API.

## Cart (extra 8)

| Method | Path | Body | Description |
|--------|------|------|-------------|
| POST | `/api/cart/total` | `{ "lineItems": [{ "listingId", "quantity" }] }` | Total computed in code. Feed it the `lineItems` from `proposeCartItems()` (human confirms first) |

## Webhooks

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/webhooks/paypal` | Reachability check |
| POST | `/api/webhooks/paypal` | `PAYMENT.CAPTURE.COMPLETED` — signature verified via `PAYPAL_WEBHOOK_ID` |
