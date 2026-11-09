/**
 * Munshi AI layer (Day 3): Google Gemini via @google/genai.
 *
 * Exported signatures are fixed - the backend imports them:
 *   draftListing(photos)                      -> { title, description, category, tags[], variants[] }
 *   answerQuestion(listings, question, lang)  -> { answer, known, ... }
 *   summarizeOrders(orders)                   -> string
 *
 * Rules enforced here (see docs/LIMITATIONS.md):
 *   - the AI never sets prices, totals or stock
 *   - answers come only from the listing data passed in
 *   - every function degrades to a safe fallback instead of throwing
 */

export { draftListing } from "./src/draftListing.js";
export { answerQuestion } from "./src/answerQuestion.js";
export { summarizeOrders } from "./src/summarizeOrders.js";

// Extra 8 (chat-to-cart): returns only { listingId, quantity } proposals.
// Prices, stock and totals come from the DB via POST /api/cart/total.
export { proposeCartItems } from "./src/proposeCartItems.js";
