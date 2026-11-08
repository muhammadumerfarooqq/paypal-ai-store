import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
dotenv.config({ path: path.join(root, ".env") });

function required(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export const config = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 3001),
  publicBaseUrl: (process.env.PUBLIC_BASE_URL || "http://localhost:3001").replace(
    /\/$/,
    ""
  ),
  databaseUrl: process.env.DATABASE_URL || "",
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
    apiKey: process.env.CLOUDINARY_API_KEY || "",
    apiSecret: process.env.CLOUDINARY_API_SECRET || "",
  },
  paypal: {
    mode: process.env.PAYPAL_MODE || "sandbox",
    clientId: process.env.PAYPAL_CLIENT_ID || "",
    clientSecret: process.env.PAYPAL_CLIENT_SECRET || "",
    webhookId: process.env.PAYPAL_WEBHOOK_ID || "",
    apiBase:
      (process.env.PAYPAL_MODE || "sandbox") === "live"
        ? "https://api-m.paypal.com"
        : "https://api-m.sandbox.paypal.com",
  },
};

export function requireDatabase() {
  return required("DATABASE_URL");
}

export function requirePayPal() {
  return {
    clientId: required("PAYPAL_CLIENT_ID"),
    clientSecret: required("PAYPAL_CLIENT_SECRET"),
  };
}

export function requireCloudinary() {
  return {
    cloud_name: required("CLOUDINARY_CLOUD_NAME"),
    api_key: required("CLOUDINARY_API_KEY"),
    api_secret: required("CLOUDINARY_API_SECRET"),
  };
}
