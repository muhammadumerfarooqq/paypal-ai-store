import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getPool } from "./pool.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const schema = fs.readFileSync(path.join(here, "schema.sql"), "utf8");
const patches = fs.readFileSync(path.join(here, "patches.sql"), "utf8");

const pool = getPool();

try {
  await pool.query(schema);
  await pool.query(patches);
  console.log("Database schema applied.");
} finally {
  await pool.end();
}
