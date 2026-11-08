import pg from "pg";
import { requireDatabase } from "../config.js";

const { Pool } = pg;

let pool;

export function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: requireDatabase(),
      ssl: { rejectUnauthorized: false },
    });
  }
  return pool;
}
