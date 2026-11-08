# Munshi

**PayPal AI Hackathon** — AI-assisted storefront for sellers on Instagram and WhatsApp: photos → listings → shareable shop → **PayPal sandbox** checkout, with an assistant for buyers and a dashboard for sellers.

[![PayPal AI Hackathon](https://img.shields.io/badge/Hackathon-PayPal_AI-003087?style=for-the-badge&logo=paypal&logoColor=white)](https://paypalaihackathon.devpost.com/)
[![License](https://img.shields.io/badge/License-TBD-lightgrey?style=for-the-badge)]()

---

## Tech stack

<!-- Colorful for-the-badge row -->
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/Neon-Postgres-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![PayPal](https://img.shields.io/badge/PayPal-Sandbox-003087?style=for-the-badge&logo=paypal&logoColor=white)
![Cloudinary](https://img.shields.io/badge/Cloudinary-3448C5?style=for-the-badge&logo=cloudinary&logoColor=white)

![React](https://img.shields.io/badge/React-Coming_Days_4–5-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![AI](https://img.shields.io/badge/AI-Vision_LLM-Day_3-FF6F00?style=for-the-badge&logo=google&logoColor=white)

| Layer | Choice | Notes |
|-------|--------|--------|
| **API** | Node 20+ / Express | REST, [`docs/API.md`](docs/API.md) |
| **Database** | Neon (Postgres) | Sellers, listings, orders, stock on `listings` |
| **Payments** | PayPal Orders API | Sandbox; capture + webhooks |
| **Media** | Cloudinary | Seller photo uploads (3–5 images) |
| **AI** | `/ai` module | Placeholders until Day 3 (Umer) |
| **Frontend** | React | Day 4–5 (Fizza) — `/shop/:seller` |

---

## What it does (core)

1. **Photo → listing** — Upload photos; AI drafts title, description, category, tags (no AI pricing).
2. **Storefront** — Public listings per seller slug.
3. **PayPal checkout** — Price and stock always from the DB.
4. **Webhooks** — Paid orders recorded; stock decrements.
5. **Assistant** *(planned)* — Answers from listing data only.
6. **Seller dashboard** *(API ready)* — Orders, AI summary placeholder, rule-based restock hints.

See [`docs/LIMITATIONS.md`](docs/LIMITATIONS.md) for honest demo / restock wording.

---

## Team & progress

| Day | Owner | Focus | Status |
|-----|-------|--------|--------|
| 1–2 | **Sarim** | Backend, PayPal, DB, uploads, API docs | ✅ Local complete |
| 3 | Umer | Real `/ai` functions + tests | 🔜 |
| 4–5 | Fizza | React storefront + dashboard | 🔜 |
| 11 Nov | All | Devpost, demo video, submit | 🔜 |

**Deploy:** Hosted app + `PAYPAL_WEBHOOK_ID` — repo owner connects CI/host (see [`docs/DEPLOY.md`](docs/DEPLOY.md)).

---

## Repository layout

```
Munshi/
├── backend/          # Express API (deploy this service)
├── ai/               # draftListing, answerQuestion, summarizeOrders
├── frontend/         # React (not started)
├── docs/
│   ├── API.md
│   ├── DEPLOY.md
│   └── LIMITATIONS.md
├── .env.example      # Copy to .env at repo root
└── project-guide.txt # Full hackathon plan
```

---

## Quick start (backend)

1. Copy **`.env.example`** → **`.env`** at repo root and fill values (Neon, PayPal, Cloudinary).
2. From **`backend/`**:

```bash
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

3. Check **`GET http://localhost:3001/health`** → `"ok": true`, `"databaseConfigured": true`.

### Test scripts

| Command | What it does |
|---------|----------------|
| `npm run test:checkout` | Day 1 seed product → PayPal approval URL |
| `node scripts/test-checkout-flow.js capture <ORDER_ID>` | Capture after sandbox pay |
| `npm run test:day2` | Draft → price → publish → checkout URL |
| `npm run test:refund -- <capture_id>` | Refund smoke test (optional) |

Sandbox buyer logins live in your local `.env` comments only — never committed.

---

## Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | Yes | Neon Postgres connection string |
| `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` | Yes | Sandbox app credentials |
| `PAYPAL_MODE` | Yes | `sandbox` |
| `CLOUDINARY_*` | Yes (Day 2+) | Photo uploads |
| `PUBLIC_BASE_URL` | Yes for webhooks | Local: `http://localhost:3001`; production: HTTPS host |
| `PAYPAL_WEBHOOK_ID` | After deploy | PayPal Developer → Webhooks |
| `PORT` | Optional | Default `3001` |

Full template: [`.env.example`](.env.example).

---

## Docs for integrators

- **[API reference](docs/API.md)** — Every endpoint (Fizza / Umer).
- **[Deploy](docs/DEPLOY.md)** — Render, webhooks, ngrok.
- **[Limitations](docs/LIMITATIONS.md)** — Restock rules, demo data.

---

## Principles (non‑negotiable)

- AI **never** sets price, cart total, or stock — only DB + code.
- Assistant uses **our listing data** only; otherwise it says it doesn’t know.
- Human confirm before money moves (cart / refunds when built).

---

## Hackathon links

- [Devpost — PayPal AI Hackathon](https://paypalaihackathon.devpost.com/)
- Submit: working demo, public repo + license, YouTube demo (&lt; 3 min), description
