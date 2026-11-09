import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

// Load the repo-root .env (same file the backend uses). Never overrides vars
// that are already set, and `quiet` stops dotenv from printing anything.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
dotenv.config({ path: path.join(root, ".env"), quiet: true });

/**
 * THE ONE place the Gemini model name lives.
 *
 * `gemini-3.5-flash-lite` = current stable fast Flash-Lite model with image
 * input and structured output (aistudio.google.com/docs/models, Nov 2026).
 *
 * Why not `gemini-3.6-flash` (the stable full Flash)? On this project's FREE
 * tier it is capped at 20 requests PER DAY (verified from the API's 429), which
 * is less than one run of the 30-case test. Flash-Lite has a per-minute cap
 * (15 RPM) but a far larger daily allowance. With billing enabled, switching
 * back to "gemini-3.6-flash" is this one-line change.
 */
export const GEMINI_MODEL = "gemini-3.5-flash-lite";

export const REQUEST_TIMEOUT_MS = 45_000;
export const TEMPERATURE = 0.2;

/** Longest side (px) photos are shrunk to before being sent to the model. */
export const MAX_IMAGE_SIDE = 1024;
export const MAX_PHOTOS = 5;
export const MAX_PHOTO_BYTES = 15 * 1024 * 1024;
export const PHOTO_FETCH_TIMEOUT_MS = 15_000;

/** A summary needs at least this many orders. */
export const MIN_ORDERS_FOR_SUMMARY = 3;

/** Biggest quantity the cart proposer will ever suggest for one line. */
export const MAX_PROPOSED_QUANTITY = 20;

/**
 * If Gemini answers 429/503 with a retry hint no longer than this, wait once
 * and retry; otherwise fall back immediately so API requests never hang.
 * Tests raise it via AI_RATE_LIMIT_MAX_WAIT_MS.
 */
export function rateLimitMaxWaitMs() {
  const v = Number(process.env.AI_RATE_LIMIT_MAX_WAIT_MS);
  return Number.isFinite(v) && v >= 0 ? v : 8_000;
}
