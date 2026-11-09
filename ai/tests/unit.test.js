/**
 * Offline unit tests (no network, no API key needed): `npm run test:unit`.
 * They cover the code-side safety nets: number guard, price/stock stripping,
 * order facts, fallbacks when the key is missing.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { numbersIn, ungroundedNumbers, formatMoney, looksLikePrice } from "../src/guard.js";
import { stripForbiddenKeys } from "../src/draftListing.js";
import { computeOrderFacts, plainSummary } from "../src/summarizeOrders.js";
import { isPrivateAddress } from "../src/images.js";
import { draftListing, answerQuestion, summarizeOrders } from "../index.js";
import { SAMPLE_LISTINGS } from "./fixtures.js";

test("numbersIn canonicalises digits, decimals, thousands, Urdu digits", () => {
  assert.deepEqual(numbersIn("Rs 1,299 and 20.00 and 09"), ["1299", "20", "9"]);
  assert.deepEqual(numbersIn("قیمت ۲۴.۹۹ ہے"), ["24.99"]);
});

test("ungroundedNumbers flags numbers not in the data", () => {
  const data = { price: "24.99 USD", stock_quantity: 7 };
  assert.deepEqual(ungroundedNumbers("It costs 24.99 and 7 are left", data), []);
  assert.deepEqual(ungroundedNumbers("Total for 3 is 74.97", data), ["3", "74.97"]);
  assert.deepEqual(ungroundedNumbers("Only 20.00", { p: "20" }), []);
});

test("formatMoney / looksLikePrice", () => {
  assert.equal(formatMoney(2499, "USD"), "24.99 USD");
  assert.equal(formatMoney(null), null);
  assert.ok(looksLikePrice("Only $20 today"));
  assert.ok(looksLikePrice("priced at 500 rs"));
  assert.ok(!looksLikePrice("A 350 ml mug in sea green"));
});

test("stripForbiddenKeys removes price/stock keys at any depth", () => {
  const out = stripForbiddenKeys({
    title: "x",
    price: 10,
    price_cents: 1000,
    stock_quantity: 3,
    variants: [{ name: "Color", options: ["Red"], price: 5 }],
  });
  assert.deepEqual(out, { title: "x", variants: [{ name: "Color", options: ["Red"] }] });
});

test("private addresses are rejected for photo fetching", () => {
  for (const ip of ["127.0.0.1", "10.1.2.3", "192.168.0.5", "172.20.0.1", "169.254.169.254", "::1"]) {
    assert.ok(isPrivateAddress(ip), ip);
  }
  assert.ok(!isPrivateAddress("8.8.8.8"));
});

const orders = [
  { status: "paid", amount_cents: 2499, currency: "USD", quantity: 1, paid_at: "2026-11-05T10:00:00Z", listing_title: "Kurta" },
  { status: "paid", amount_cents: 4998, currency: "USD", quantity: 2, paid_at: "2026-11-06T10:00:00Z", listing_title: "Kurta" },
  { status: "paid", amount_cents: 1200, currency: "USD", quantity: 1, paid_at: "2026-11-07T10:00:00Z", listing_title: "Mug" },
  { status: "created", amount_cents: 1200, currency: "USD", quantity: 1, listing_title: "Mug" },
  { status: "refunded", amount_cents: 1800, currency: "USD", quantity: 1, listing_title: "Earrings" },
];

test("computeOrderFacts computes counts, totals and best seller in code", () => {
  const f = computeOrderFacts(orders);
  assert.equal(f.totalOrders, 5);
  assert.equal(f.paidOrders, 3);
  assert.equal(f.refundedOrders, 1);
  assert.equal(f.unpaidOrAbandonedOrders, 1);
  assert.equal(f.unitsSold, 4);
  assert.deepEqual(f.revenue, ["86.97 USD"]);
  assert.deepEqual(f.bestSellers, [{ title: "Kurta", unitsSold: 3 }]);
  assert.equal(f.bestSellerIsTie, false);
  assert.equal(f.firstPaidDate, "2026-11-05");
  assert.match(plainSummary(f), /3 paid/);
});

test("no API key: every function falls back safely and never throws", async () => {
  const saved = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  try {
    const d = await draftListing([{ data: Buffer.from("not an image") }]);
    assert.equal(d.title, "");
    assert.equal(d.source, "fallback");
    assert.ok(!("price" in d) && !("price_cents" in d) && !("stock_quantity" in d));

    const a = await answerQuestion(SAMPLE_LISTINGS, "How much is the mug?", "en");
    assert.equal(a.known, false);
    assert.match(a.answer, /don't know/i);
    const u = await answerQuestion(SAMPLE_LISTINGS, "مگ کی قیمت؟", "ur");
    assert.equal(u.known, false);
    assert.match(u.answer, /[؀-ۿ]/);

    // paid orders but no key -> plain code-built summary
    const s = await summarizeOrders(orders);
    assert.match(s, /3 paid/);
  } finally {
    if (saved !== undefined) process.env.GEMINI_API_KEY = saved;
  }
});

test("summarizeOrders: fewer than 3 orders says not enough data (no API call)", async () => {
  const s = await summarizeOrders(orders.slice(0, 2));
  assert.match(s, /not enough data/i);
  assert.match(await summarizeOrders([]), /not enough data/i);
  assert.match(await summarizeOrders(undefined), /not enough data/i);
});

test("languageProblem rejects Hindi / non-Urdu answers when Urdu was requested", async () => {
  const { languageProblem } = await import("../src/answerQuestion.js");
  assert.ok(languageProblem("मुझे नहीं पता", "ur"));
  assert.ok(languageProblem("I don't know", "ur"));
  assert.equal(languageProblem("مجھے معلوم نہیں", "ur"), null);
  assert.equal(languageProblem("anything", "en"), null);
});

test("proposeCartItems: no key / no listings / empty message -> empty proposal, only ids+quantities", async () => {
  const { proposeCartItems } = await import("../index.js");
  const saved = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  try {
    const r = await proposeCartItems(SAMPLE_LISTINGS, "add 2 mugs please");
    assert.deepEqual(r, { lineItems: [], requiresConfirmation: true });
  } finally {
    if (saved !== undefined) process.env.GEMINI_API_KEY = saved;
  }
  assert.deepEqual((await proposeCartItems([], "mug")).lineItems, []);
  assert.deepEqual((await proposeCartItems(SAMPLE_LISTINGS, "  ")).lineItems, []);
});

test("answerQuestion with no listings or empty question: don't know, no API call", async () => {
  assert.equal((await answerQuestion([], "hi", "en")).known, false);
  assert.equal((await answerQuestion(SAMPLE_LISTINGS, "   ", "en")).known, false);
});
