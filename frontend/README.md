# Munshi Frontend (Days 4–5)

React + Vite storefront, seller AI listing studio, customer assistant (English & Urdu), chat-to-cart confirmation flow, and seller dashboard built against [`../docs/API.md`](../docs/API.md).

## Routes

- `/shop/:sellerSlug` — Public storefront with search, category filter, stock/sold-out badges, and PayPal Sandbox checkout.
- `/shop/:sellerSlug/listings/:listingId` — Product detail page with multi-photo gallery, variants, tags, quantity selector, and PayPal checkout.
- `/seller/:slug/new` — Seller studio: upload 1–5 photos to Cloudinary (`POST /api/sellers/:slug/uploads`), generate Gemini Vision draft (`POST /api/sellers/:slug/listings/draft`), edit fields, set price & stock (`PATCH`), and publish (`POST .../publish`).
- `/seller/:slug/dashboard` — Seller dashboard: orders history & AI order summary (`GET /api/sellers/:slug/orders`), rule-based restock hints (`GET /api/sellers/:slug/restock-suggestions`), and inventory/drafts management.
- `/checkout/success` & `/checkout/cancelled` — PayPal Sandbox return handlers.

## Quick start

1. Create `frontend/.env` (git-ignored; see `frontend/.env.example`):
   ```env
   VITE_PAYPAL_CLIENT_ID=<your-paypal-sandbox-client-id>
   VITE_DEFAULT_SELLER_SLUG=demo-boutique
   ```
2. Install & start (with backend running on `http://localhost:3001`):
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
3. Open `http://localhost:5173`.
