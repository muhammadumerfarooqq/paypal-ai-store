# Munshi

**PayPal AI Hackathon** — AI-assisted storefront for sellers on Instagram and WhatsApp: photos → listings → shareable shop → **PayPal sandbox** checkout, with an assistant for buyers and a dashboard for sellers.

[![PayPal AI Hackathon](https://img.shields.io/badge/Hackathon-PayPal_AI-003087?style=for-the-badge&logo=paypal&logoColor=white)](https://paypalaihackathon.devpost.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

---

## Live links

| What | Link |
|------|------|
| **Backend API (Render)** | https://paypal-ai-store.onrender.com — try [`/health`](https://paypal-ai-store.onrender.com/health) |
| **Frontend (Vercel)** | ⚠️ **TODO — add the Vercel URL here after deploy** |
| **Demo video (YouTube, < 3 min)** | ⚠️ **TODO — add the YouTube link here after upload** |

> **Heads-up:** the backend runs on Render's **free instance, which sleeps when idle**. The first request after a quiet period can take **about 50 seconds** while it wakes up; later requests are fast.
> The AI endpoints also share a **free-tier Gemini quota** (15 requests/minute on the current model), so under heavy use they fall back to "I don't know" / empty drafts instead of failing — see [AI layer](#ai-layer).
> Payments are **PayPal sandbox only** — no real money moves.

---

## Tech stack

<!-- Colorful for-the-badge row -->
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/Neon-Postgres-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![PayPal](https://img.shields.io/badge/PayPal-Sandbox-003087?style=for-the-badge&logo=paypal&logoColor=white)
![Cloudinary](https://img.shields.io/badge/Cloudinary-3448C5?style=for-the-badge&logo=cloudinary&logoColor=white)

![React](https://img.shields.io/badge/React-In_progress-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Gemini](https://img.shields.io/badge/AI-Google_Gemini-FF6F00?style=for-the-badge&logo=google&logoColor=white)

| Layer | Choice | Notes |
|-------|--------|--------|
| **API** | Node 20+ / Express | REST, [`docs/API.md`](docs/API.md) |
| **Database** | Neon (Postgres) | Sellers, listings, orders, stock on `listings` |
| **Payments** | PayPal Orders API | Sandbox; capture + webhooks |
| **Media** | Cloudinary | Seller photo uploads (3–5 images) |
| **AI** | `/ai` module | Google Gemini (`@google/genai`), schema-validated output — see [AI layer](#ai-layer) |
| **Frontend** | React (deployed on Vercel) | **In progress** — not yet part of the verified backend/AI results below |

---

## What it does

What is built and working **in the backend + AI layer** (endpoint details in [`docs/API.md`](docs/API.md)):

1. **Photo → listing** — Seller uploads 1–5 photos; Gemini drafts title, description, category, tags and variants. The draft has **no price or stock field**; the seller reviews, edits, sets the price and stock, then publishes.
2. **Storefront API** — Published listings per seller slug (`/api/shop/:sellerSlug/listings`).
3. **PayPal sandbox checkout** — Single-listing checkout (`POST /api/checkout`, then capture). Price and stock always come from the database.
4. **Webhooks** — `PAYMENT.CAPTURE.COMPLETED` marks the order paid and decrements stock. The signature is verified when `PAYPAL_WEBHOOK_ID` is set (without it, webhooks are accepted unverified — dev only).
5. **Customer assistant** — `POST /api/assistant` answers a shopper's question **only from the shop's listing data**, in English or Urdu (`"language": "ur"`); if the data doesn't say, it says it doesn't know and points to the seller.
6. **Chat-to-cart (proposal)** — `POST /api/assistant/cart` turns a chat message into proposed `{listingId, quantity}` lines. The AI never sees prices or stock. Send the proposal to `POST /api/cart/total` and the **database computes the total**; a human must confirm.
7. **Seller dashboard API** — Orders list, an AI-written order summary (every number computed in code; "not enough data" under 3 orders), and **rule-based** restock hints.

What is **not** built or not complete (full list in [Next steps](#next-steps) and [`docs/LIMITATIONS.md`](docs/LIMITATIONS.md)):

- Paying a **multi-item cart** through PayPal. `/api/checkout` handles one listing; the cart endpoints produce a proposal and a DB-computed total, but there is no multi-item PayPal checkout.
- **AI-assisted refunds** (not built).
- **Predictive restock** — suggestions are plain rules, not a model.
- The React frontend is **in progress**; the Urdu/chat/cart screens should only be counted as working once the UI exists. The API behind them works and is tested (see [AI evaluation](#ai-evaluation)).

---

## Team & progress

| Owner | Area | Status |
|-------|------|--------|
| **Sarim** | Backend, PayPal sandbox checkout, database, webhooks, assistant endpoints, and the React frontend | Backend + endpoints ✅ deployed on Render · Frontend 🚧 **in progress** |
| **Umer** | AI layer (`/ai`), AI tests and evaluation, documentation | ✅ Done — evaluated locally (see [AI evaluation](#ai-evaluation)) |
| All | Devpost write-up, demo video, submission (11 Nov) | 🔜 |

---

## How the AI is kept honest

The model is a writer and a classifier — **never the source of money facts.** Four rules, each enforced in code, not just in the prompt:

1. **No AI pricing.** `draftListing` has no price or stock field; price-like keys are stripped and price-like text is rejected and retried. Price, stock and every cart total come from the database (`/api/cart/total`).
2. **Answers only from listing data.** The assistant sees only whitelisted listing fields. If the answer is not there, it must say "I don't know — please contact the seller" (fixed fallback text if the AI is unavailable).
3. **Number guard.** Any number in an answer that does not appear in the listing data (or the question) blocks the answer — so an invented price, stock count or total cannot reach the shopper. Order-summary figures are computed in code and re-checked the same way.
4. **Human confirms before payment.** Chat-to-cart only *proposes* `{listingId, quantity}`; the shopper confirms, and PayPal checkout is the only money step.

How well this holds up, including failures: [AI evaluation](#ai-evaluation). Honest limits: [`docs/LIMITATIONS.md`](docs/LIMITATIONS.md).

---

## Repository layout

```
Munshi/
├── backend/          # Express API (deploy this service)
├── ai/               # draftListing, answerQuestion, summarizeOrders, proposeCartItems
│   ├── index.js      # the exported functions (signatures fixed)
│   ├── src/          # Gemini wrapper, image prep, guards, one file per function
│   └── tests/        # unit, grounding, photo and cart tests
├── frontend/         # React app (in progress)
├── docs/
│   ├── API.md
│   ├── DEPLOY.md
│   └── LIMITATIONS.md
├── LICENSE           # MIT
├── .env.example      # Copy to .env at repo root
└── project-guide.txt # Full hackathon plan
```

---

## Demo

▶️ **Demo video (YouTube, under 3 minutes):** ⚠️ **TODO — paste the public YouTube link here before submitting.**

---

## Run it locally

Needs Node 20+, a Neon Postgres database, a PayPal **sandbox** app, a Cloudinary account and a Gemini API key.

1. Copy **`.env.example`** → **`.env`** at repo root and fill in the values (see [Environment variables](#environment-variables)). Never commit `.env`.
2. Install the AI module's dependencies — the backend imports `/ai`, and `/ai` has its own `package.json`. Skipping this makes the backend crash at startup with "Cannot find package":

```bash
cd ai && npm install
```

3. From **`backend/`**:

```bash
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

4. Check **`GET http://localhost:3001/health`** → `"ok": true`, `"databaseConfigured": true`.
5. **Webhooks while developing:** PayPal needs a public HTTPS URL. Run `ngrok http 3001`, set `PUBLIC_BASE_URL` to the ngrok URL, register `https://<host>/api/webhooks/paypal` in PayPal Developer → Webhooks, and put the webhook ID in `PAYPAL_WEBHOOK_ID`.

**Deploying (Render):** web service with root directory `backend`; build command `npm install && npm install --prefix ../ai`; start `npm start`; copy the `.env` variables (including `GEMINI_API_KEY`) into the service environment, set `PUBLIC_BASE_URL` to the Render URL. Full steps: [`docs/DEPLOY.md`](docs/DEPLOY.md).

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

> **Headline: 93.3 % (28/30) first-try grounding accuracy** on our 30-question test, after manual review of the answers (the automatic judge said 96.7 %). A later run scored 100 %, but only **after** we changed the prompt and added a language guard based on the first run's failures, on the same questions — so treat 100 % as "the fixes work", not as the expected accuracy.

Test: [`ai/tests/grounding.test.js`](ai/tests/grounding.test.js), 30 questions against 5 sample listings ([`fixtures.js`](ai/tests/fixtures.js)): 10 answerable, 10 unanswerable (must say "I don't know"), 5 price/stock tricks (haggling, totals, out-of-stock, unpriced item, "is it on sale"), 5 Urdu (3 answerable + 2 unanswerable). Real calls, 4.5 s apart for the free-tier limit. Every answer is in [`ai/tests/grounding-results.json`](ai/tests/grounding-results.json).

| Run | Model | Result | Notes |
|-----|-------|--------|-------|
| 0 | `gemini-3.6-flash` | **Not scored** | Free-tier quota (20 requests/day) ran out after 17 answers; 13 cases got HTTP 429. The 17 answered were all correct, but that is not an accuracy number. |
| 1 | `gemini-3.5-flash-lite` | **29/30 = 96.7 %** (automatic judge) | One failure: **UR5** — the model answered in Hindi (Devanagari) instead of Urdu. On reading the answers, **UR3 should also have failed**: the judge passed it but the Urdu was garbled ("…سلاکۭ ہیںلفٹ کی قیمت…") and added an irrelevant price/stock. Score after manual review: **28/30 = 93.3 %**. Saved in `grounding-results-before-urdu-guard.json`. |
| 2 | `gemini-3.5-flash-lite` | **30/30 = 100 %** (after tuning — not a clean test) | After adding a language guard (Urdu answers must be Arabic script, no Devanagari, else one retry then fallback) and an "answer only what was asked" prompt rule. By category: answerable 10/10, unanswerable 10/10, tricks 5/5, Urdu 5/5. |

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

## Next steps

Not built yet, listed honestly:

- **AI-assisted refunds** — the assistant would check the refund policy and draft a recommendation; the seller approves and only then a PayPal refund is triggered. Today refunds are only a manual sandbox smoke test (`npm run test:refund`).
- **Multi-item PayPal checkout** — pay a confirmed chat cart in one PayPal order (today: single-listing checkout; the cart only gets a proposal and a DB-computed total).
- **Better photo drafts** — ignore props/background items, always hedge materials, don't treat shop-sign claims as product claims (found in the photo test above).
- **Full-size Gemini model** — move from Flash-Lite to `gemini-3.6-flash` once billing is enabled; native-speaker review of Urdu answers; a larger, independent grounding test set.
- **Predictive restock** — replace the plain rules once there is real sales history.

---

## Docs for integrators

- **[API reference](docs/API.md)** — Every endpoint.
- **[Deploy](docs/DEPLOY.md)** — Render, webhooks, ngrok.
- **[Limitations](docs/LIMITATIONS.md)** — Each limitation with a viva defence, planned fix and status.

---

## Principles (non‑negotiable)

- AI **never** sets price, cart total, or stock — only DB + code.
- Assistant uses **our listing data** only; otherwise it says it doesn’t know.
- A human confirms before money moves (cart confirm before PayPal checkout). Refunds are not built.

---

## Hackathon links

- [Devpost — PayPal AI Hackathon](https://paypalaihackathon.devpost.com/)
- Submission: working demo, public repo + [MIT license](LICENSE), YouTube demo (under 3 min), description.
