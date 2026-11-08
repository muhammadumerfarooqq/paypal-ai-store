/**
 * Rule-based restock hints (not predictive ML). See docs/LIMITATIONS.md.
 */

const LOW_STOCK_THRESHOLD = 5;
const FAST_SELL_DAYS = 7;
const FAST_SELL_MIN_QTY = 3;

export function buildRestockSuggestions(listings, recentOrderCounts) {
  const suggestions = [];

  for (const l of listings) {
    const sold = recentOrderCounts[l.id] || 0;
    const reasons = [];

    if (l.stock_quantity <= LOW_STOCK_THRESHOLD) {
      reasons.push(`low stock (${l.stock_quantity} left)`);
    }
    if (sold >= FAST_SELL_MIN_QTY) {
      reasons.push(`sold ${sold} in the last ${FAST_SELL_DAYS} days`);
    }

    if (reasons.length) {
      suggestions.push({
        listingId: l.id,
        title: l.title,
        stockQuantity: l.stock_quantity,
        soldRecently: sold,
        recommendation: `Consider restocking "${l.title}" — ${reasons.join("; ")}.`,
      });
    }
  }

  return suggestions;
}
