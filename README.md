# Munshi

AI-assisted storefront for Instagram/WhatsApp sellers — PayPal sandbox checkout, Postgres (Neon), photo storage (Cloudinary).

## Status

| Day | Owner | Status |
|-----|-------|--------|
| 1 | Sarim | In progress — structure + PayPal E2E |
| 2 | Sarim | In progress — listings, uploads, API.md |

## Local backend

```bash
cd backend
npm install
# Set DATABASE_URL in ../.env (Neon), then:
npm run db:migrate
npm run db:seed
npm run dev
```

`GET /health` should return `{ "ok": true }`.

### Day 1 PayPal sandbox test

```bash
npm run dev
# new terminal:
npm run test:checkout
# approve in browser with sandbox personal account, then:
node scripts/test-checkout-flow.js capture <PAYPAL_ORDER_ID>
```

`GET /api/webhooks/paypal` confirms the webhook route is reachable (POST after deploy).

## Secrets

Copy `.env.example` to `.env`. Never commit `.env`.
