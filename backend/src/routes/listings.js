import { Router } from "express";
import {
  createDraftFromPhotos,
  getSellerBySlug,
  getSellerDrafts,
  publishListing,
  updateListing,
} from "../services/listings.js";

export const listingsRouter = Router();

listingsRouter.get("/api/sellers/:slug/listings/drafts", async (req, res) => {
  try {
    const seller = await getSellerBySlug(req.params.slug);
    if (!seller) return res.status(404).json({ error: "Seller not found" });
    const drafts = await getSellerDrafts(seller.id);
    res.json({ drafts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

listingsRouter.post("/api/sellers/:slug/listings/draft", async (req, res) => {
  try {
    const seller = await getSellerBySlug(req.params.slug);
    if (!seller) return res.status(404).json({ error: "Seller not found" });

    const { photoUrls } = req.body;
    const listing = await createDraftFromPhotos(seller.id, photoUrls);
    res.status(201).json({ listing });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

listingsRouter.patch("/api/sellers/:slug/listings/:listingId", async (req, res) => {
  try {
    const seller = await getSellerBySlug(req.params.slug);
    if (!seller) return res.status(404).json({ error: "Seller not found" });

    const listing = await updateListing(seller.id, req.params.listingId, req.body);
    res.json({ listing });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

listingsRouter.post(
  "/api/sellers/:slug/listings/:listingId/publish",
  async (req, res) => {
    try {
      const seller = await getSellerBySlug(req.params.slug);
      if (!seller) return res.status(404).json({ error: "Seller not found" });

      const listing = await publishListing(seller.id, req.params.listingId);
      res.json({ listing });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
);
