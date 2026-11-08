/**
 * Placeholder AI (Day 1). Umer replaces with real LLM calls on Day 3.
 */

export async function draftListing(_photoUrls) {
  return {
    title: "Demo Handcrafted Mug",
    description: "Placeholder listing from draftListing(). Replace on Day 3.",
    category: "Home & Kitchen",
    variants: [{ name: "Color", options: ["White", "Black"] }],
    tags: ["demo", "munshi", "placeholder"],
  };
}

export async function answerQuestion(_listing, _question) {
  return {
    answer:
      "Placeholder: I only know what's in the listing. Real assistant ships on Day 3.",
    known: false,
  };
}

export async function summarizeOrders(_orders) {
  return "Placeholder order summary — no real orders analyzed yet.";
}
