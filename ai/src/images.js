import dns from "node:dns/promises";
import net from "node:net";
import sharp from "sharp";
import {
  MAX_IMAGE_SIDE,
  MAX_PHOTOS,
  MAX_PHOTO_BYTES,
  PHOTO_FETCH_TIMEOUT_MS,
} from "./config.js";

/** True for loopback / private / link-local addresses (basic SSRF guard). */
export function isPrivateAddress(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127)
    );
  }
  if (net.isIPv6(ip)) {
    const v = ip.toLowerCase();
    if (v.startsWith("::ffff:")) return isPrivateAddress(v.slice(7));
    return v === "::1" || v === "::" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80");
  }
  return true;
}

async function assertPublicUrl(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("not a valid URL");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("only http(s) photo URLs are allowed");
  }
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new Error("private host not allowed");
  }
  const addrs = net.isIP(host)
    ? [{ address: host }]
    : await dns.lookup(host, { all: true });
  if (!addrs.length || addrs.some((a) => isPrivateAddress(a.address))) {
    throw new Error("private host not allowed");
  }
  return url;
}

async function fetchBuffer(rawUrl) {
  const url = await assertPublicUrl(rawUrl);
  const res = await fetch(url, {
    redirect: "error", // a redirect could point somewhere private
    signal: AbortSignal.timeout(PHOTO_FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const type = res.headers.get("content-type") || "";
  if (!type.startsWith("image/")) throw new Error(`not an image (${type || "no content-type"})`);
  const declared = Number(res.headers.get("content-length"));
  if (declared > MAX_PHOTO_BYTES) throw new Error("image too large");
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > MAX_PHOTO_BYTES) throw new Error("image too large");
  return buf;
}

/** Resize to <= MAX_IMAGE_SIDE on the long side, honour EXIF rotation, re-encode as JPEG. */
export async function downscale(buffer) {
  return sharp(buffer)
    .rotate()
    .resize({ width: MAX_IMAGE_SIDE, height: MAX_IMAGE_SIDE, fit: "inside", withoutEnlargement: true })
    .flatten({ background: "#ffffff" })
    .jpeg({ quality: 80 })
    .toBuffer();
}

function toBuffer(data) {
  if (Buffer.isBuffer(data)) return data;
  if (data instanceof Uint8Array) return Buffer.from(data);
  if (typeof data === "string") return Buffer.from(data, "base64");
  throw new Error("unsupported photo data");
}

/**
 * Turn the `photos` argument into Gemini inline image parts.
 * Each photo may be:
 *   - an http(s) URL string                (what the backend passes today)
 *   - { url }                              (same, as an object)
 *   - { data: Buffer|Uint8Array|base64, mimeType? }   (local files / tests)
 * Photos that fail to load are skipped and reported, never thrown.
 */
export async function preparePhotos(photos) {
  const list = (Array.isArray(photos) ? photos : [photos]).filter(Boolean).slice(0, MAX_PHOTOS);
  const images = [];
  const skipped = [];

  for (let i = 0; i < list.length; i++) {
    const p = list[i];
    try {
      let raw;
      if (typeof p === "string") raw = await fetchBuffer(p);
      else if (p?.url) raw = await fetchBuffer(p.url);
      else if (p?.data) raw = toBuffer(p.data);
      else throw new Error("unsupported photo input");

      const small = await downscale(raw);
      images.push({ inlineData: { mimeType: "image/jpeg", data: small.toString("base64") } });
    } catch (err) {
      skipped.push({ index: i, reason: String(err.message).slice(0, 120) });
    }
  }
  return { images, skipped };
}
