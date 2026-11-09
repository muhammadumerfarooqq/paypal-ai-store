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
| **AI** | `/ai` module | Google Gemini (`@google/genai`), schema-validated output — see [AI layer](#ai-layer) |
| **Frontend** | React | Day 4–5 (Fizza) — `/shop/:seller` |

---

## What it does (core)

1. **Photo → listing** — Upload photos; AI drafts title, description, category, tags, variants (never a price or stock).
2. **Storefront** — Public listings per seller slug.
3. **PayPal checkout** — Price and stock always from the DB.
4. **Webhooks** — Paid orders recorded; stock decrements.
5. **Assistant** — `answerQuestion()` answers from listing data only, in English or Urdu; otherwise says it doesn't know. *(AI function done; HTTP route for the chat UI not added yet.)*
6. **Seller dashboard** — Orders, AI order summary (numbers computed in code), rule-based restock hints.

See [`docs/LIMITATIONS.md`](docs/LIMITATIONS.md) for honest demo / restock wording.

---

## Team & progress

| Day | Owner | Focus | Status |
|-----|-------|--------|--------|
| 1–2 | **Sarim** | Backend, PayPal, DB, uploads, API docs | ✅ Local complete |
| 3 | Umer | Real `/ai` functions + tests | ✅ Done locally (see [AI evaluation](#ai-evaluation)) |
| 4–5 | Fizza | React storefront + dashboard | 🔜 |
| 11 Nov | All | Devpost, demo video, submit | 🔜 |

**Deploy:** Hosted app + `PAYPAL_WEBHOOK_ID` — repo owner connects CI/host (see [`docs/DEPLOY.md`](docs/DEPLOY.md)).

---

## Repository layout

```
Munshi/
├── backend/          # Express API (deploy this service)
├── ai/               # draftListing, answerQuestion, summarizeOrders, proposeCartItems
│   ├── index.js      # the exported functions (signatures fixed)
│   ├── src/          # Gemini wrapper, image prep, guards, one file per function
│   └── tests/        # unit, grounding, photo and cart tests
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

1. Copy **`.env.example`** → **`.env`** at repo root and fill values (Neon, PayPal, Cloudinary, `GEMINI_API_KEY`).
2. Install the AI module's dependencies once (the backend imports `/ai`): `cd ai && npm install`.
3. From **`backend/`**:

```bash
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

4. Check **`GET http://localhost:3001/health`** → `"ok": true`, `"databaseConfigured": true`.

### Test scripts

Backend (run from `backend/`):

| Command | What it does |
|---------|----------------|
| `npm run test:checkout` | Day 1 seed product → PayPal approval URL |
| `node scripts/test-checkout-flow.js capture <ORDER_ID>` | Capture after sandbox pay |
| `npm run test:day2` | Draft (real AI) → price → publish → checkout URL. Leaves a published demo listing + an unpaid sandbox order behind. |
| `npm run test:refund -- <capture_id>` | Refund smoke test (optional) |

AI (run from `ai/`):

| Command | Needs the API? | What it does |
|---------|----------------|----------------|
| `npm run test:unit` | No | Offline checks of the code-side guards and fallbacks |
| `npm run test:grounding` | Yes (~30 calls, ~2.5 min) | The 30-case assistant test, prints accuracy |
| `npm run try-draft` | Yes (8 calls) | `draftListing` on every image in `sample-photos/` (local only, gitignored) |
| `node tests/try-orders-and-cart.js` | Yes + running backend | Live check of `summarizeOrders` and `proposeCartItems` → `POST /api/cart/total` |

Sandbox buyer logins live in your local `.env` comments only — never committed.

---

## Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | Yes | Neon Postgres connection string |
| `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` | Yes | Sandbox app credentials |
| `PAYPAL_MODE` | Yes | `sandbox` |
| `CLOUDINARY_*` | Yes (Day 2+) | Photo uploads |
| `GEMINI_API_KEY` | For real AI | Google Gemini key (Google AI Studio). If missing, every AI function returns a safe fallback instead of crashing. Never logged. |
| `PUBLIC_BASE_URL` | Yes for webhooks | Local: `http://localhost:3001`; production: HTTPS host |
| `PAYPAL_WEBHOOK_ID` | After deploy | PayPal Developer → Webhooks |
| `PORT` | Optional | Default `3001` |

Full template: [`.env.example`](.env.example).

---

## AI layer

Lives in [`ai/`](ai/), model name in **one constant** (`GEMINI_MODEL` in [`ai/src/config.js`](ai/src/config.js)): currently `gemini-3.5-flash-lite`, called through the official `@google/genai` SDK with native structured (JSON-schema) output, re-validated with zod.

| Function | What it does | What it never does |
|----------|--------------|--------------------|
| `draftListing(photos)` | Photos (URLs or local image data, downscaled to ≤1024 px) → `{title, description, category, tags[], variants[]}`. One retry on invalid output. | Output a price or stock field (stripped in code); state a price in the text (rejected and retried). Brand, material and size are only allowed if visible. |
| `answerQuestion(listings, question, language)` | Answers **only** from the listing rows passed in, `en` or `ur`, in ≤2 sentences. Otherwise: "I don't know, contact the seller." | Use outside knowledge. A code guard blocks any answer containing a number that is not in the data (so no invented price, stock or total). |
| `summarizeOrders(orders)` | Counts, revenue, units and best seller are **computed in code**; the model only writes prose around those facts. Fewer than 3 orders → "not enough data". | Invent numbers or trends (numbers re-checked in code; on failure a plain code-built summary is returned). |
| `proposeCartItems(listings, message)` | Chat message → `{ lineItems: [{listingId, quantity}], requiresConfirmation: true }`. The model never sees prices or stock. | Output prices, stock or totals. Feed the proposal to `POST /api/cart/total` — the **database** computes the total, and a human confirms before payment. |

**Safe fallbacks:** no key, timeout, rate limit (429) or invalid output → empty draft fields / "I don't know" / plain-text summary / empty cart. Nothing throws into the server. Results carry a `source` field (`gemini` or `fallback`) so the UI can tell.

**Not AI:** restock suggestions are rules in code (`backend/src/services/restock.js`: low stock, fast-selling), **not a predictive model**. The wording is also generated by code today — LLM-written restock wording is not wired in yet. See [`docs/LIMITATIONS.md`](docs/LIMITATIONS.md).

**Free-tier limits (checked against the live API, Nov 2026):** `gemini-3.6-flash` allows only **20 requests per day** on the free tier, which is less than one run of our own test, so the project uses Flash-Lite (15 requests per minute, much larger daily allowance). With billing enabled, switch the one constant back to `gemini-3.6-flash`. Free-tier prompts may be used by Google to improve its products — don't send real customer data on the free tier.

---

## AI evaluation

Test: [`ai/tests/grounding.test.js`](ai/tests/grounding.test.js), 30 questions against 5 sample listings ([`fixtures.js`](ai/tests/fixtures.js)): 10 answerable, 10 unanswerable (must say "I don't know"), 5 price/stock tricks (haggling, totals, out-of-stock, unpriced item, "is it on sale"), 5 Urdu (3 answerable + 2 unanswerable). Real calls, 4.5 s apart for the free-tier limit. Every answer is in [`ai/tests/grounding-results.json`](ai/tests/grounding-results.json).

| Run | Model | Result | Notes |
|-----|-------|--------|-------|
| 0 | `gemini-3.6-flash` | **Not scored** | Free-tier quota (20 requests/day) ran out after 17 answers; 13 cases got HTTP 429. The 17 answered were all correct, but that is not an accuracy number. |
| 1 | `gemini-3.5-flash-lite` | **29/30 = 96.7 %** (automatic judge) | One failure: **UR5** — the model answered in Hindi (Devanagari) instead of Urdu. On reading the answers, **UR3 should also have failed**: the judge passed it but the Urdu was garbled ("…سلاکۭ ہیںلفٹ کی قیمت…") and added an irrelevant price/stock. Score after manual review: **28/30 = 93.3 %**. Saved in `grounding-results-before-urdu-guard.json`. |
| 2 | `gemini-3.5-flash-lite` | **30/30 = 100 %** | After adding a language guard (Urdu answers must be Arabic script, no Devanagari, else one retry then fallback) and an "answer only what was asked" prompt rule. By category: answerable 10/10, unanswerable 10/10, tricks 5/5, Urdu 5/5. |

How to read the 100 %:

- **Run 2 is not a clean held-out result.** The prompt was changed and the guard added *after* seeing run 1's failures, using the same 30 questions. Run 1 (93.3–96.7 %) is the better estimate of the first-try quality; run 2 shows the fix works on the cases that exposed the problem.
- Only 30 questions, written by us, on 5 invented listings. A keyword judge, single run each (temperature 0.2, so results vary a little between runs).
- Part of the "100 %" is code, not the model: the number guard (no ungrounded price/stock/total) and the language guard are in the pipeline under test.
- Safe but unhelpful answers count as passes: asked "will you give me the kurta for $15?" and "total price for 3 mugs?", the assistant answered "I don't know… contact the seller" instead of stating the unit price. Nothing invented, but not the best answer.
- Urdu output has not been audited by a native speaker. Answers keep English product names and sometimes English words ("card slots") inside Urdu sentences.

Offline checks (`npm run test:unit`): 11/11 pass — number guard, price/stock key stripping, order facts, no-key fallbacks, language guard, private-address blocking.

---

## Photo to listing results

Script: [`ai/tests/try-draft.js`](ai/tests/try-draft.js) ran `draftListing` on 8 stock product photos in `sample-photos/` (local only, gitignored). Each photo was checked by eye against its draft. Raw output: [`try-draft-output.txt`](ai/tests/try-draft-output.txt). Latency was 2–10 s per photo. 8/8 calls succeeded; **no draft contained a price, stock figure, invented brand, or invented size.**

| # | Photo | Verdict | Notes |
|---|-------|---------|-------|
| 1 | Man in black kurta + shalwar | ✅ Correct | Colour, collar, button placket, long sleeves, black boots all right. Calls the shalwar "pants". |
| 2 | Two candles, dried leaves | ✅ Correct | "Cinnamon Spice" is really on the label; lit white candle, wooden surface, red fabric all right. Title is singular though the photo shows two candles. |
| 3 | Two mugs on a wooden tray | ⚠️ Issues | Says "ceramic" without hedging (material not provable from a photo); calls the beige/taupe mug "light grey"; titles it "set with wooden tray" — the tray is a prop, not necessarily for sale. |
| 4 | Brown tote with beige handles | ✅ Correct | Colours, handles, buckle strap, gold hardware right. Did not claim "leather"; did not invent the unreadable logo. |
| 5 | Gold jewellery shop window | ⚠️ Issues | Facts are visible (necklaces, bracelets, a "22K GOLD" sign), but this is a whole shop display, not one product, and the "22k gold" claim comes from a shop sign — it would read as a purity claim for the listing. |
| 6 | Pink floral wrap dress on a rack | ✅ Correct | Pattern, short flared sleeves and side tie right. Ignored the visible "M/L" tag (no invented size). |
| 7 | Four silver pendant necklaces with pearl beads | ✅ Correct | Filigree pendants and small white beads right. Does not mention the peacock motif (omission, not an error). |
| 8 | Red sneakers (blurred black pair behind) | ⚠️ Issue | Title "Red and black sneakers" — the black pair is a blurred background item, not the product. Correctly avoided naming the brand. |

**Strict score: 5 of 8 clean, 3 of 8 with minor-to-moderate problems** (an unhedged material claim, props or background treated as part of the product, one colour name off, a store-window photo treated as a product). None of the problems is a fabricated price, brand or size, but they are exactly why the seller must review and edit every draft before publishing — the app already requires that, since the AI cannot set a price. The prompt was not tuned on these 8 photos; the planned fix is in `docs/LIMITATIONS.md`.

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
