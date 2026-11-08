import { Router } from "express";
import multer from "multer";
import { getSellerBySlug } from "../services/listings.js";
import { uploadImageBuffer } from "../services/cloudinary.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 5 },
});

export const uploadsRouter = Router();

uploadsRouter.post(
  "/api/sellers/:slug/uploads",
  upload.array("photos", 5),
  async (req, res) => {
    try {
      const seller = await getSellerBySlug(req.params.slug);
      if (!seller) return res.status(404).json({ error: "Seller not found" });

      const files = req.files || [];
      if (!files.length) {
        return res.status(400).json({ error: "photos[] required (max 5)" });
      }

      const urls = [];
      for (const file of files) {
        const result = await uploadImageBuffer(file.buffer, {
          folder: `munshi/${seller.slug}`,
        });
        urls.push(result.secure_url);
      }

      res.json({ photoUrls: urls });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  }
);
