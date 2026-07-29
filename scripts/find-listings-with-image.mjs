/**
 * One-off: find every ServiceListing whose gallery/image references a given
 * URL, so a bad pool entry can be tracked down and swapped everywhere it was
 * already seeded, not just fixed in the pool for future seeds.
 *
 *   node scripts/find-listings-with-image.mjs "<url-substring>"
 */

import mongoose from "mongoose";
import { readFileSync } from "fs";

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

const needle = process.argv[2];
if (!needle) {
  console.error("Usage: node scripts/find-listings-with-image.mjs <url-substring>");
  process.exit(1);
}

loadEnv();
if (!process.env.MONGODB_URI) {
  console.error("MONGODB_URI is not set.");
  process.exit(1);
}

await mongoose.connect(process.env.MONGODB_URI);
const db = mongoose.connection.db;

const docs = await db
  .collection("servicelistings")
  .find({ $or: [{ image: { $regex: needle } }, { gallery: { $regex: needle } }] })
  .toArray();

if (docs.length === 0) {
  console.log("No listings reference that URL.");
} else {
  for (const doc of docs) {
    console.log(`${doc.serviceId} — ${doc.name} (category: ${doc.category})`);
    if (doc.image?.includes(needle)) console.log(`  image: ${doc.image}`);
    (doc.gallery || []).forEach((u, i) => {
      if (u.includes(needle)) console.log(`  gallery[${i}]: ${u}`);
    });
  }
}

await mongoose.disconnect();
