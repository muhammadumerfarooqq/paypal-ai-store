import { Router } from "express";
import { config } from "../config.js";

export const healthRouter = Router();

healthRouter.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "munshi-backend",
    paypalMode: config.paypal.mode,
    databaseConfigured: Boolean(config.databaseUrl),
  });
});
