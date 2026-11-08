import { v2 as cloudinary } from "cloudinary";
import { requireCloudinary } from "../config.js";

let configured = false;

function ensureConfigured() {
  if (!configured) {
    cloudinary.config(requireCloudinary());
    configured = true;
  }
  return cloudinary;
}

export async function uploadImageBuffer(buffer, { folder = "munshi" } = {}) {
  const c = ensureConfigured();
  return new Promise((resolve, reject) => {
    const stream = c.uploader.upload_stream(
      { folder, resource_type: "image" },
      (err, result) => {
        if (err) reject(err);
        else resolve(result);
      }
    );
    stream.end(buffer);
  });
}
