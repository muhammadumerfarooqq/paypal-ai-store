/**
 * Runs draftListing() on every image in /sample-photos (local files, passed as
 * inline image data) and prints each JSON draft. Judge the output by eye:
 * any wrong or invented detail counts as a failure.
 *
 * Usage:  node tests/try-draft.js [folder] [--delay=4000]
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { draftListing } from "../index.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const folder = path.resolve(args.find((a) => !a.startsWith("--")) || path.join(here, "../../sample-photos"));
const delayMs = Number(args.find((a) => a.startsWith("--delay="))?.split("=")[1] ?? 4000);

const IMAGE = /\.(jpe?g|png|webp)$/i;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let files;
try {
  files = (await fs.readdir(folder)).filter((f) => IMAGE.test(f)).sort();
} catch {
  console.error(`Cannot read folder: ${folder}`);
  process.exit(1);
}
if (!files.length) {
  console.error(`No images found in ${folder}`);
  process.exit(1);
}

let ok = 0;
for (const [i, file] of files.entries()) {
  const data = await fs.readFile(path.join(folder, file));
  const started = Date.now();
  const draft = await draftListing([{ data }]);
  const secs = ((Date.now() - started) / 1000).toFixed(1);

  console.log(`\n=== [${i + 1}/${files.length}] ${file}  (${secs}s, source: ${draft.source}) ===`);
  console.log(JSON.stringify(draft, null, 2));
  if (draft.source === "gemini") ok++;
  if (i < files.length - 1) await sleep(delayMs);
}

console.log(`\n${ok}/${files.length} drafts came from the model (the rest fell back to empty).`);
