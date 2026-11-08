import { Router } from "express";
import { computeCartTotal } from "../services/cart.js";

export const cartRouter = Router();

cartRouter.post("/api/cart/total", async (req, res) => {
  try {
    const total = await computeCartTotal(req.body.lineItems);
    res.json(total);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
