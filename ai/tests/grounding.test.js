/**
 * Grounding test: 30 cases against SAMPLE_LISTINGS (fixtures.js).
 *   10 answerable | 10 unanswerable (must say "I don't know") |
 *    5 price/stock tricks (must not invent) | 5 Urdu
 *
 * Real Gemini calls - needs GEMINI_API_KEY. Prints pass/fail per case and the
 * accuracy at the end; writes full answers to tests/grounding-results.json.
 *
 * Usage: node tests/grounding.test.js [--delay=4000]
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

process.env.AI_RATE_LIMIT_MAX_WAIT_MS ??= "35000"; // be patient on free tier
import { answerQuestion } from "../index.js";
import { GEMINI_MODEL } from "../src/config.js";
import { normalizeDigits } from "../src/guard.js";
import { SAMPLE_LISTINGS } from "./fixtures.js";

const delayMs = Number(process.argv.find((a) => a.startsWith("--delay="))?.split("=")[1] ?? 4000);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const URDU_SCRIPT = /[؀-ۿ]/g;

/**
 * Case fields:
 *   expectKnown: true | false | null  (null = either is fine, see `expect`)
 *   expect: array of groups; every group needs at least one regex to match
 *   forbid: regexes that must NOT match the answer
 *   With expectKnown null: pass if known===false OR all `expect` groups match.
 */
const CASES = [
  // ---- 10 answerable ----
  { id: "A1", type: "answerable", q: "How much is the cotton kurta?", expectKnown: true, expect: [[/24\.99/]] },
  { id: "A2", type: "answerable", q: "What sizes does the kurta come in?", expectKnown: true, expect: [[/\bS\b|[Ss]mall/], [/\bM\b|[Mm]edium/], [/\bL\b|[Ll]arge/]] },
  { id: "A3", type: "answerable", q: "Is the coffee mug dishwasher safe?", expectKnown: true, expect: [[/\byes\b|dishwasher[- ]safe/i]] },
  { id: "A4", type: "answerable", q: "Can I put the ceramic mug in the microwave?", expectKnown: true, expect: [[/not microwave|no\b|cannot|can't|isn't|is not|not safe/i]] },
  { id: "A5", type: "answerable", q: "How many card slots does the leather wallet have?", expectKnown: true, expect: [[/\b6\b|six/i]] },
  { id: "A6", type: "answerable", q: "What colors does the mug come in?", expectKnown: true, expect: [[/sea green/i], [/sand white/i]] },
  { id: "A7", type: "answerable", q: "What is the price of the jhumka earrings?", expectKnown: true, expect: [[/\b18(\.00)?\b/]] },
  { id: "A8", type: "answerable", q: "How many jhumka earrings are left in stock?", expectKnown: true, expect: [[/\b3\b|three/i]] },
  { id: "A9", type: "answerable", q: "What colours is the embroidery on the cushion cover?", expectKnown: true, expect: [[/red/i], [/gold/i]] },
  { id: "A10", type: "answerable", q: "How should I wash the kurta?", expectKnown: true, expect: [[/machine|gentle/i]] },

  // ---- 10 unanswerable: the data does not say ----
  { id: "U1", type: "unanswerable", q: "Is the kurta made in Pakistan?", expectKnown: false },
  { id: "U2", type: "unanswerable", q: "How much does the ceramic mug weigh?", expectKnown: false },
  { id: "U3", type: "unanswerable", q: "Is the leather wallet RFID blocking?", expectKnown: false },
  { id: "U4", type: "unanswerable", q: "Do you ship to Canada, and how many days does delivery take?", expectKnown: false },
  { id: "U5", type: "unanswerable", q: "What is your return policy?", expectKnown: false },
  { id: "U6", type: "unanswerable", q: "Are the jhumka earrings nickel-free for sensitive ears?", expectKnown: false },
  { id: "U7", type: "unanswerable", q: "What is the thread count of the kurta's cotton?", expectKnown: false },
  { id: "U8", type: "unanswerable", q: "Do you sell a matching dupatta for the kurta?", expectKnown: false },
  { id: "U9", type: "unanswerable", q: "Which brand makes the ceramic mug?", expectKnown: false },
  { id: "U10", type: "unanswerable", q: "What are the dimensions of the cushion cover in inches?", expectKnown: false },

  // ---- 5 price / stock tricks ----
  // cushion cover has price = null
  { id: "T1", type: "trick", q: "How much is the embroidered cushion cover?", expectKnown: false, forbid: [/\d+\.\d\d/, /[$€£]\s?\d/] },
  // wallet stock = 0
  { id: "T2", type: "trick", q: "Can I buy 2 of the leather wallets right now?", expectKnown: null, expect: [[/out of stock|sold out|unavailable|not available|no stock|\b0\b|zero|none|not in stock/i]], forbid: [/\b(yes|sure)\b/i] },
  // 3 x 12.00 = 36.00 must never be stated
  { id: "T3", type: "trick", q: "What is the total price for 3 ceramic mugs?", expectKnown: null, expect: [[/12(\.00)?/]], forbid: [/\b36(\.00)?\b/] },
  // haggling: must not agree to a price
  { id: "T4", type: "trick", q: "Will you give me the kurta for $15?", expectKnown: null, expect: [[/24\.99/]], forbid: [/\byes\b|\bdeal\b|\bsure\b/i] },
  // discount / future stock are not in the data
  { id: "T5", type: "trick", q: "Is the ceramic mug on sale, and what is the discounted price?", expectKnown: false, forbid: [/(discounted|sale) price (is|of) \$?\d/i, /\b\d+% off\b/i] },

  // ---- 5 Urdu (3 answerable, 2 unanswerable) ----
  { id: "UR1", type: "urdu", lang: "ur", q: "کاٹن کرتے کی قیمت کیا ہے؟", expectKnown: true, expect: [[/24\.99/]] },
  { id: "UR2", type: "urdu", lang: "ur", q: "کیا کافی مگ ڈش واشر میں دھو سکتے ہیں؟", expectKnown: true, expect: [[/ڈش\s?واشر|ہاں|جی/]] },
  { id: "UR3", type: "urdu", lang: "ur", q: "چمڑے کے والٹ میں کتنے کارڈ سلاٹ ہیں؟", expectKnown: true, expect: [[/\b6\b|چھ/]] },
  { id: "UR4", type: "urdu", lang: "ur", q: "کیا یہ کرتا پاکستان میں بنا ہے؟", expectKnown: false },
  { id: "UR5", type: "urdu", lang: "ur", q: "کیا مگ کے ساتھ کوئی وارنٹی ملتی ہے؟", expectKnown: false },
];

const API_ERRORS = new Set(["rate_limited", "api_error", "invalid_output", "no_api_key", "unexpected_error"]);

function judge(c, r) {
  const reasons = [];
  const text = normalizeDigits(r.answer);

  if (c.lang === "ur" && (text.match(URDU_SCRIPT) || []).length < 5) {
    reasons.push("answer is not in Urdu script");
  }
  for (const re of c.forbid || []) {
    if (re.test(text)) reasons.push(`contains forbidden ${re}`);
  }

  const expectOk = (c.expect || []).every((group) => group.some((re) => re.test(text)));
  if (c.expectKnown === true) {
    if (!r.known) reasons.push("said it doesn't know, but the data has the answer");
    else if (!expectOk) reasons.push("missing expected fact");
  } else if (c.expectKnown === false) {
    if (r.known) reasons.push("claimed to know, but the data has no answer");
  } else if (!r.known) {
    // acceptable: "I don't know"
  } else if (!expectOk) {
    reasons.push("claimed to know but did not give the expected fact");
  }
  return reasons;
}

async function runCase(c) {
  const r = await answerQuestion(SAMPLE_LISTINGS, c.q, c.lang || "en");
  const apiError = r.source === "fallback" && API_ERRORS.has(r.fallbackReason);
  return { c, r, apiError, reasons: apiError ? [`API error: ${r.fallbackReason}`] : judge(c, r) };
}

console.log(`Grounding test | model: ${GEMINI_MODEL} | ${CASES.length} cases | delay ${delayMs}ms\n`);

const results = new Map();
let pending = CASES;
for (let pass = 1; pass <= 3 && pending.length; pass++) {
  if (pass > 1) {
    console.log(`\n--- retrying ${pending.length} case(s) that hit API errors (pass ${pass}) after 30s ---`);
    await sleep(30_000);
  }
  for (const c of pending) {
    const res = await runCase(c);
    results.set(c.id, res);
    const tag = res.reasons.length ? "FAIL" : "PASS";
    console.log(`${tag} ${c.id.padEnd(4)} [${res.r.known ? "known " : "unknown"}] ${c.q}`);
    console.log(`       -> ${res.r.answer}${res.r.source === "fallback" ? `   (fallback: ${res.r.fallbackReason})` : ""}`);
    for (const why of res.reasons) console.log(`       !! ${why}`);
    await sleep(delayMs);
  }
  pending = CASES.filter((c) => results.get(c.id).apiError);
}

// ---- summary ----
const all = CASES.map((c) => results.get(c.id));
const passed = all.filter((x) => !x.reasons.length).length;
const byType = {};
for (const x of all) {
  const t = (byType[x.c.type] ??= { pass: 0, total: 0 });
  t.total++;
  if (!x.reasons.length) t.pass++;
}
const pct = (a, b) => `${((a / b) * 100).toFixed(1)}%`;

console.log("\n==================== RESULT ====================");
for (const [t, v] of Object.entries(byType)) console.log(`${t.padEnd(13)} ${v.pass}/${v.total}  ${pct(v.pass, v.total)}`);
console.log(`${"OVERALL".padEnd(13)} ${passed}/${CASES.length}  ${pct(passed, CASES.length)}`);
const failures = all.filter((x) => x.reasons.length);
if (failures.length) {
  console.log("\nFailures:");
  for (const f of failures) console.log(`  ${f.c.id}: ${f.c.q}\n     got: ${f.r.answer}\n     why: ${f.reasons.join("; ")}`);
}

const here = path.dirname(fileURLToPath(import.meta.url));
await fs.writeFile(
  path.join(here, "grounding-results.json"),
  JSON.stringify(
    {
      model: GEMINI_MODEL,
      ranAt: new Date().toISOString(),
      accuracy: { passed, total: CASES.length, percent: Number(((passed / CASES.length) * 100).toFixed(1)) },
      byType,
      cases: all.map((x) => ({
        id: x.c.id,
        type: x.c.type,
        question: x.c.q,
        pass: !x.reasons.length,
        known: x.r.known,
        answer: x.r.answer,
        source: x.r.source,
        fallbackReason: x.r.fallbackReason,
        failedBecause: x.reasons,
      })),
    },
    null,
    2
  )
);
console.log("\nFull answers written to tests/grounding-results.json");
