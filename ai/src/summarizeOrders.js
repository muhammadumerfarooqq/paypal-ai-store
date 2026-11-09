import { z } from "zod";
import { MIN_ORDERS_FOR_SUMMARY } from "./config.js";
import { generateStructured, redact } from "./gemini.js";
import { formatMoney, ungroundedNumbers } from "./guard.js";

const SummarySchema = z.object({ summary: z.string().trim().min(1).max(800) });

const isoDay = (d) => (d ? new Date(d).toISOString().slice(0, 10) : null);

/**
 * All counts, totals and the best seller are computed HERE, in code.
 * The model only gets these facts and turns them into prose.
 * Exported for tests.
 */
export function computeOrderFacts(orders) {
  const list = Array.isArray(orders) ? orders : [];
  const status = { paid: 0, refunded: 0, created: 0, failed: 0, other: 0 };
  for (const o of list) {
    status[o.status in status ? o.status : "other"]++;
  }

  const paid = list.filter((o) => o.status === "paid");
  const refunded = list.filter((o) => o.status === "refunded");

  const revenueCents = {}; // per currency, paid orders only
  const refundedCents = {};
  const sumInto = (bucket, o) => {
    const cur = o.currency || "USD";
    bucket[cur] = (bucket[cur] || 0) + Number(o.amount_cents || 0);
  };
  paid.forEach((o) => sumInto(revenueCents, o));
  refunded.forEach((o) => sumInto(refundedCents, o));

  const byProduct = new Map();
  for (const o of paid) {
    const name = o.listing_title || o.title || String(o.listing_id || "Unknown item");
    const row = byProduct.get(name) || { title: name, units: 0, orders: 0 };
    row.units += Number(o.quantity || 1);
    row.orders += 1;
    byProduct.set(name, row);
  }
  const products = [...byProduct.values()].sort(
    (a, b) => b.units - a.units || b.orders - a.orders || a.title.localeCompare(b.title)
  );
  const topUnits = products[0]?.units ?? 0;
  const bestSellers = products.filter((p) => p.units === topUnits && topUnits > 0);

  const paidDates = paid.map((o) => o.paid_at).filter(Boolean).map((d) => new Date(d)).sort((a, b) => a - b);

  const money = (bucket) =>
    Object.entries(bucket).map(([cur, cents]) => formatMoney(cents, cur));

  return {
    totalOrders: list.length,
    paidOrders: status.paid,
    refundedOrders: status.refunded,
    unpaidOrAbandonedOrders: status.created + status.failed,
    unitsSold: paid.reduce((n, o) => n + Number(o.quantity || 1), 0),
    revenue: money(revenueCents), // e.g. ["74.97 USD"]
    refundedValue: money(refundedCents),
    averagePaidOrder: Object.entries(revenueCents).map(([cur, cents]) =>
      formatMoney(Math.round(cents / paid.filter((o) => (o.currency || "USD") === cur).length), cur)
    ),
    bestSellers: bestSellers.map((p) => ({ title: p.title, unitsSold: p.units })),
    bestSellerIsTie: bestSellers.length > 1,
    productsSold: products.map((p) => ({ title: p.title, unitsSold: p.units })),
    firstPaidDate: isoDay(paidDates[0]),
    lastPaidDate: isoDay(paidDates.at(-1)),
  };
}

/** Plain-text summary built purely in code. Used as the no-AI fallback. */
export function plainSummary(facts) {
  const parts = [];
  parts.push(
    `${facts.totalOrders} orders recorded: ${facts.paidOrders} paid` +
      (facts.refundedOrders ? `, ${facts.refundedOrders} refunded` : "") +
      (facts.unpaidOrAbandonedOrders ? `, ${facts.unpaidOrAbandonedOrders} not paid` : "") +
      "."
  );
  if (facts.paidOrders) {
    parts.push(
      `Paid revenue: ${facts.revenue.join(" + ")} from ${facts.unitsSold} unit${facts.unitsSold === 1 ? "" : "s"}.`
    );
    if (facts.bestSellers.length) {
      const names = facts.bestSellers.map((b) => `"${b.title}"`).join(" and ");
      parts.push(
        `Best seller${facts.bestSellerIsTie ? "s (tied)" : ""}: ${names} (${facts.bestSellers[0].unitsSold} unit${
          facts.bestSellers[0].unitsSold === 1 ? "" : "s"
        }).`
      );
    }
  } else {
    parts.push("No paid orders yet.");
  }
  return parts.join(" ");
}

const SYSTEM = `You write a short order summary for a small shop owner.

Rules:
- Use ONLY the FACTS JSON. Every number, product name and date you write must come from it.
- 2 to 4 plain-English sentences. Mention paid orders, revenue, units sold and the best seller (say "tied" if bestSellerIsTie is true).
- Do not predict, forecast or describe trends or growth. Do not give advice. Do not compare to other periods. Do not guess reasons.
- Do not add any number that is not in FACTS (do not do your own arithmetic).
- Do not mention restocking.`;

/**
 * Short plain-English summary of real orders. Never throws.
 * @param {Array<{status:string, amount_cents:number, currency?:string, quantity?:number, paid_at?:string, listing_title?:string}>} orders
 * @returns {Promise<string>}
 */
export async function summarizeOrders(orders) {
  try {
    const list = Array.isArray(orders) ? orders : [];
    if (list.length < MIN_ORDERS_FOR_SUMMARY) {
      return `Not enough data yet: ${list.length} order${list.length === 1 ? "" : "s"} so far. A summary needs at least ${MIN_ORDERS_FOR_SUMMARY} orders.`;
    }

    const facts = computeOrderFacts(list);
    const plain = plainSummary(facts);
    if (!facts.paidOrders) return plain; // nothing for the model to add

    const result = await generateStructured({
      label: "summarizeOrders",
      system: SYSTEM,
      parts: [{ text: `FACTS (JSON):\n${JSON.stringify(facts, null, 1)}` }],
      schema: SummarySchema,
      check: ({ summary }) => {
        const bad = ungroundedNumbers(summary, facts);
        return bad.length ? [`contains numbers not in FACTS: ${bad.join(", ")}`] : [];
      },
    });

    return result.ok ? result.data.summary : plain;
  } catch (err) {
    console.warn(`[ai] summarizeOrders: unexpected error (${redact(err.message).slice(0, 150)})`);
    return "Order summary is unavailable right now.";
  }
}
