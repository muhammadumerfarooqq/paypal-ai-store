import { Router } from "express";
import { answerQuestion, proposeCartItems } from "../../../ai/index.js";
import { getPublishedListingsForShop } from "../services/listings.js";

export const assistantRouter = Router();

async function loadListings({ sellerSlug, listings }) {
  if (Array.isArray(listings) && listings.length) {
    return listings;
  }
  if (sellerSlug) {
    return getPublishedListingsForShop(sellerSlug);
  }
  return [];
}

assistantRouter.post("/api/assistant", async (req, res) => {
  try {
    const { question, language = "en", sellerSlug, listings } = req.body;
    if (!question || !String(question).trim()) {
      return res.status(400).json({ error: "question required" });
    }

    const shopListings = await loadListings({ sellerSlug, listings });
    if (!shopListings.length) {
      return res.status(400).json({
        error: "listings required (pass listings[] or sellerSlug with published items)",
      });
    }

    const result = await answerQuestion(shopListings, question, language);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

assistantRouter.post("/api/assistant/cart", async (req, res) => {
  try {
    const { message, sellerSlug, listings } = req.body;
    if (!message || !String(message).trim()) {
      return res.status(400).json({ error: "message required" });
    }

    const shopListings = await loadListings({ sellerSlug, listings });
    if (!shopListings.length) {
      return res.status(400).json({
        error: "listings required (pass listings[] or sellerSlug with published items)",
      });
    }

    const proposal = await proposeCartItems(shopListings, message);
    res.json(proposal);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});
