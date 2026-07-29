/**
 * One-off: photo-1602631985686 (a kids' "HAPPY BIRTHDAY" party photo,
 * mistakenly in the curated `decorators` demo pool — see
 * lib/config/demo-images.ts) had already been seeded into 3 decorator
 * galleries before the pool was corrected. Swaps it out per-listing for a
 * different pool photo not already present in that listing's own gallery.
 *
 *   node scripts/fix-birthday-photo-in-galleries.mjs          # dry run
 *   node scripts/fix-birthday-photo-in-galleries.mjs --write  # actually writes
 */

import mongoose from "mongoose";
import { readFileSync } from "fs";

const BAD_URL = "https://images.unsplash.com/photo-1602631985686-1bb0e6a8696e?w=1600&q=80";

const REPLACEMENTS = {
  "decorator-enchanted-1": "https://images.unsplash.com/photo-1469371670807-013ccf25f16a?w=1600&q=80",
  "decorator-french-1": "https://images.unsplash.com/photo-1519378058457-4c29a0a2efac?w=1600&q=80",
  "decorator-royal-1": "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=1600&q=80",
};

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
const collection = mongoose.connection.db.collection("servicelistings");

for (const [serviceId, replacement] of Object.entries(REPLACEMENTS)) {
  const doc = await collection.findOne({ serviceId });
  if (!doc) {
    console.log(`${serviceId}: not found, skipping.`);
    continue;
  }
  const gallery = doc.gallery || [];
  const idx = gallery.indexOf(BAD_URL);
  if (idx === -1) {
    console.log(`${serviceId}: bad URL not in gallery (already fixed?), skipping.`);
    continue;
  }
  if (gallery.includes(replacement)) {
    console.log(`${serviceId}: replacement already in gallery, would create a duplicate — skipping, needs a manual pick.`);
    continue;
  }
  const nextGallery = [...gallery];
  nextGallery[idx] = replacement;
  console.log(`${serviceId}: gallery[${idx}] ${BAD_URL} -> ${replacement}`);
  if (write) {
    await collection.updateOne({ serviceId }, { $set: { gallery: nextGallery } });
  }
}

if (!write) console.log("\n[dry run] Pass --write to apply.");

await mongoose.disconnect();
