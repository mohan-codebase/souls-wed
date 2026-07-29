/**
 * One-off: decorator-royal-1 ("Royal Petals Decor") had its `image` (hero/cover
 * photo) set to a scraped photo of an unrelated real business — a "HAPPY
 * BIRTHDAY" banner shot from a Lucknow florist's directory listing
 * (jdmagicbox.com), not a licensed stock photo like the rest of its gallery.
 * Replaces it with an unused entry from the same curated `decorators` pool
 * already used for this listing's gallery (lib/config/demo-images.ts).
 *
 *   node scripts/fix-royal-petals-hero-image.mjs          # dry run
 *   node scripts/fix-royal-petals-hero-image.mjs --write  # actually writes
 */

import mongoose from "mongoose";
import { readFileSync } from "fs";

const SERVICE_ID = "decorator-royal-1";
const BAD_IMAGE =
  "https://content.jdmagicbox.com/comp/lucknow/r9/0522px522.x522.220904013830.b3r9/catalogue/shamsi-sons-gomti-nagar-lucknow-flower-decorators-evp5m0reai.jpg";
const NEW_IMAGE = "https://images.unsplash.com/photo-1507290439931-a861b5a38200?w=1600&q=80";

function loadEnv() {
  try {
    for (const line of readFileSync(".env", "utf8").split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    /* .env is optional if the vars are already exported */
  }
}

const write = process.argv.includes("--write");
loadEnv();

if (!process.env.MONGODB_URI) {
  console.error("MONGODB_URI is not set.");
  process.exit(1);
}

await mongoose.connect(process.env.MONGODB_URI);
const db = mongoose.connection.db;
const collection = db.collection("servicelistings");

const doc = await collection.findOne({ serviceId: SERVICE_ID });
if (!doc) {
  console.error(`No ServiceListing found with serviceId "${SERVICE_ID}".`);
  process.exit(1);
}

console.log(`Found "${doc.name}" (${SERVICE_ID}). Current image: ${doc.image}`);

if (doc.image !== BAD_IMAGE) {
  console.log("Current image doesn't match the expected bad URL — not touching it. Stopping.");
  process.exit(0);
}

if (!write) {
  console.log(`[dry run] Would set image -> ${NEW_IMAGE}`);
} else {
  await collection.updateOne({ serviceId: SERVICE_ID }, { $set: { image: NEW_IMAGE } });
  console.log(`Updated. image -> ${NEW_IMAGE}`);
}

await mongoose.disconnect();
