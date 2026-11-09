import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import {
  GEMINI_MODEL,
  REQUEST_TIMEOUT_MS,
  TEMPERATURE,
  rateLimitMaxWaitMs,
} from "./config.js";

let client = null;
let clientKey = null;

export function hasApiKey() {
  return Boolean(process.env.GEMINI_API_KEY);
}

function getClient() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  if (!client || clientKey !== key) {
    client = new GoogleGenAI({
      apiKey: key,
      httpOptions: { timeout: REQUEST_TIMEOUT_MS },
    });
    clientKey = key;
  }
  return client;
}

/** Remove anything key-shaped from a message before it is logged or returned. */
export function redact(message) {
  let s = String(message ?? "");
  const key = process.env.GEMINI_API_KEY;
  if (key) s = s.split(key).join("[redacted]");
  return s.replace(/AIza[0-9A-Za-z_-]{20,}/g, "[redacted]");
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function errorStatus(err) {
  const s = err?.status ?? err?.code ?? err?.error?.code;
  if (Number.isFinite(Number(s))) return Number(s);
  const m = /"code"\s*:\s*(\d{3})/.exec(String(err?.message ?? ""));
  return m ? Number(m[1]) : null;
}

function retryDelayMs(err) {
  const msg = String(err?.message ?? "");
  const m =
    /"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/.exec(msg) ||
    /retry in (\d+(?:\.\d+)?)s/i.exec(msg);
  return m ? Math.ceil(Number(m[1]) * 1000) + 500 : 2_000;
}

function describeError(err) {
  const status = errorStatus(err);
  return `${status ? `HTTP ${status}: ` : ""}${redact(err?.message).slice(0, 200)}`;
}

/** Zod schema -> JSON Schema for Gemini's `responseJsonSchema`. */
export function toResponseSchema(zodSchema) {
  const { $schema, ...rest } = z.toJSONSchema(zodSchema);
  return rest;
}

/**
 * Ask Gemini for JSON that matches a zod schema.
 *
 *  - native structured output (responseMimeType + responseJsonSchema)
 *  - output re-validated with zod (plus optional `check` returning problems)
 *  - ONE retry with the problems fed back if the output is invalid
 *  - ONE wait-and-retry on a short 429/503; otherwise give up quickly
 *  - never throws: returns { ok:false, reason } and the caller uses its fallback
 *
 * @returns {Promise<{ok:true,data:any}|{ok:false,reason:string,detail?:string}>}
 */
export async function generateStructured({
  label,
  system,
  parts,
  schema,
  check = () => [],
}) {
  const ai = getClient();
  if (!ai) return { ok: false, reason: "no_api_key" };

  const responseJsonSchema = toResponseSchema(schema);
  let feedback = null;
  let lastProblems = [];
  let waited = false;

  for (let attempt = 0; attempt < 2; attempt++) {
    const userParts = feedback ? [...parts, { text: feedback }] : parts;

    let text;
    try {
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [{ role: "user", parts: userParts }],
        config: {
          systemInstruction: system,
          temperature: TEMPERATURE,
          responseMimeType: "application/json",
          responseJsonSchema,
        },
      });
      text = response.text;
    } catch (err) {
      const status = errorStatus(err);
      const transient = status === 429 || status === 500 || status === 503;
      if (transient && !waited) {
        const delay = retryDelayMs(err);
        if (delay <= rateLimitMaxWaitMs()) {
          waited = true;
          await sleep(delay);
          attempt--; // this wasn't a validation attempt
          continue;
        }
      }
      const detail = describeError(err);
      console.warn(`[ai] ${label}: Gemini call failed (${detail})`);
      return {
        ok: false,
        reason: status === 429 ? "rate_limited" : "api_error",
        detail,
      };
    }

    let json;
    try {
      json = JSON.parse(text);
    } catch {
      lastProblems = ["output was not valid JSON"];
      feedback = `Your previous reply was not valid JSON. Reply again with ONLY JSON matching the schema.`;
      continue;
    }

    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      lastProblems = parsed.error.issues.map(
        (i) => `${i.path.join(".") || "(root)"}: ${i.message}`
      );
    } else {
      const problems = check(parsed.data);
      if (!problems.length) return { ok: true, data: parsed.data };
      lastProblems = problems;
    }
    feedback = `Your previous reply was rejected: ${lastProblems.join("; ")}. Reply again with corrected JSON only.`;
  }

  console.warn(`[ai] ${label}: invalid model output twice (${lastProblems.join("; ")})`);
  return { ok: false, reason: "invalid_output", detail: lastProblems.join("; ") };
}
