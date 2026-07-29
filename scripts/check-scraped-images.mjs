/**
 * One-off audit: find any listing images that look scraped from a real
 * business directory (jdmagicbox, justdial, etc.) rather than licensed stock
 * photos, across both ServiceListing and Vendor collections.
 *
 *   node scripts/check-scraped-images.mjs
 */

import mongoose from "mongoose";
import { readFileSync } from "fs";

const SUSPECT_DOMAINS = ["jdmagicbox.com", "justdial.com", "sulekha.com"];

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

loadEnv();
if (!process.env.MONGODB_URI) {
  console.error("MONGODB_URI is not set.");
  process.exit(1);
}

await mongoose.connect(process.env.MONGODB_URI);
const db = mongoose.connection.db;

function isSuspect(url) {
  return typeof url === "string" && SUSPECT_DOMAINS.some((d) => url.includes(d));
}

for (const collName of ["servicelistings", "vendors"]) {
  const docs = await db.collection(collName).find({}).toArray();
  for (const doc of docs) {
    const fields = ["image", "heroImage"];
    const arrays = ["images", "gallery"];
    const hits = [];
    for (const f of fields) if (isSuspect(doc[f])) hits.push(`${f}: ${doc[f]}`);
    for (const a of arrays) {
      if (Array.isArray(doc[a])) {
        doc[a].forEach((url, i) => {
          if (isSuspect(url)) hits.push(`${a}[${i}]: ${url}`);
        });
      }
    }
    if (hits.length > 0) {
      console.log(`\n[${collName}] ${doc.name || doc.businessName || doc._id} (${doc.serviceId || doc._id})`);
      hits.forEach((h) => console.log(`  ${h}`));
    }
  }
}

await mongoose.disconnect();
console.log("\nDone.");
