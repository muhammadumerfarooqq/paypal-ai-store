import { Router } from "express";
import {
  getPublishedListingForShop,
  getPublishedListingsForShop,
} from "../services/listings.js";

export const shopRouter = Router();

shopRouter.get("/api/shop/:sellerSlug/listings", async (req, res) => {
  try {
    const listings = await getPublishedListingsForShop(req.params.sellerSlug);
    res.json({ sellerSlug: req.params.sellerSlug, listings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

shopRouter.get("/api/shop/:sellerSlug/listings/:listingId", async (req, res) => {
  try {
    const listing = await getPublishedListingForShop(
      req.params.sellerSlug,
      req.params.listingId
    );
    if (!listing) return res.status(404).json({ error: "Listing not found" });
    res.json({ listing });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
