/**
 * Code-level grounding helpers. The model is never trusted to be the only
 * thing standing between a made-up number and the customer: any number in a
 * model-written answer must also appear in the data we gave it.
 */

const ARABIC_INDIC = "٠١٢٣٤٥٦٧٨٩"; // U+0660..0669
const EXT_ARABIC_INDIC = "۰۱۲۳۴۵۶۷۸۹"; // U+06F0..06F9 (Urdu/Persian)

export function normalizeDigits(text) {
  return String(text ?? "").replace(/[٠-٩۰-۹]/g, (ch) => {
    const a = ARABIC_INDIC.indexOf(ch);
    return String(a >= 0 ? a : EXT_ARABIC_INDIC.indexOf(ch));
  });
}

/** Canonical form: "09" -> "9", "20.00" -> "20", "24.990" -> "24.99". */
function canonicalNumber(token) {
  const n = Number(token);
  return Number.isFinite(n) ? String(n) : token;
}

/** All numbers in a piece of text, canonicalised, digits normalised, "1,299" -> 1299. */
export function numbersIn(text) {
  let s = normalizeDigits(text);
  while (/(\d),(\d{3})(?!\d)/.test(s)) s = s.replace(/(\d),(\d{3})(?!\d)/g, "$1$2");
  return (s.match(/\d+(?:\.\d+)?/g) || []).map(canonicalNumber);
}

/**
 * Numbers present in `answer` that appear in none of `sources`
 * (sources are strings, or anything JSON-serialisable).
 */
export function ungroundedNumbers(answer, ...sources) {
  const allowed = new Set();
  for (const src of sources) {
    const text = typeof src === "string" ? src : JSON.stringify(src ?? "");
    for (const n of numbersIn(text)) allowed.add(n);
  }
  return [...new Set(numbersIn(answer))].filter((n) => !allowed.has(n));
}

/** "2499" cents + "USD" -> "24.99 USD". Returns null when cents is not a number. */
export function formatMoney(cents, currency = "USD") {
  if (cents === null || cents === undefined || cents === "") return null;
  const n = Number(cents);
  if (!Number.isFinite(n)) return null;
  return `${(n / 100).toFixed(2)} ${currency || "USD"}`;
}

/** Strings that look like a price ("$20", "Rs. 500", "49 USD"). */
const PRICE_PATTERN =
  /[$£€₨₹]\s?\d|\b(?:rs\.?|pkr|usd|eur|gbp|inr)\s?\d|\d\s?(?:usd|pkr|rs\b|eur|gbp|dollars?|rupees?)\b|\bprice[d]?\s*(?:at|of|:)\s*\d/i;

export function looksLikePrice(text) {
  return PRICE_PATTERN.test(normalizeDigits(text));
}
