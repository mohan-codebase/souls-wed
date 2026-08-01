/**
 * One-time import of real listings from the old soulswed.com backend
 * (api.soulswed.com — still live, read-only, unauthenticated) into the
 * five categories that existed on the old site: venues, planners,
 * photographers, decorators, makeup artists.
 *
 * Every listing is owned by a single shared vendor account (looked up or
 * created by VENDOR_EMAIL below) and written with verified:false so nothing
 * appears on public pages until reviewed and flipped live.
 *
 * Non-INR prices are converted using the static approximate rates in
 * FX_TO_INR below — set once at import time, not live/current.
 *
 * USAGE
 *   node scripts/import-legacy-listings.mjs                          # dry run against soulswed-dev
 *   node scripts/import-legacy-listings.mjs --apply                  # write to soulswed-dev
 *   node scripts/import-legacy-listings.mjs --apply --target=production   # write to the real prod DB
 *
 * The safety check below requires the database name in MONGODB_URI to match
 * the target explicitly — soulswed-dev by default, or soulswed only when
 * --target=production is passed. This is deliberate friction: it should not
 * be possible to hit production by forgetting a flag.
 */
import "dotenv/config";
import mongoose from "mongoose";

const apply = process.argv.includes("--apply");
const targetArg = process.argv.find((a) => a.startsWith("--target="));
const target = targetArg ? targetArg.split("=")[1] : "dev";
const PER_CATEGORY_LIMIT = 100;
const VENDOR_EMAIL = "vendor@soulswed.com";
// The old Angular app builds image src as `middletierhost + "/uploads" + imagespath`
// (middletierhost = api.soulswed.com) — NOT soulswed.com, which is the new app's own
// domain and is currently in full maintenance mode (every path 200s with a maintenance
// HTML page, which is why a plain status-code check looked fine but was wrong).
const OLD_IMAGE_BASE = "https://api.soulswed.com/uploads";

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI is not set. Run from the project root so .env is picked up.");
  process.exit(1);
}
const expectedDb = target === "production" ? "/soulswed?" : "/soulswed-dev?";
if (!uri.includes(expectedDb)) {
  console.error(`Refusing to run: --target=${target} expects MONGODB_URI to contain "${expectedDb}". Got: ${uri.replace(/\/\/[^@]+@/, "//<redacted>@")}`);
  process.exit(1);
}

// Static approximate rates to INR, set at import time (2026-07-31). Not live.
const FX_TO_INR = {
  INR: 1,
  USD: 87,
  EUR: 94,
  GBP: 110,
  CHF: 98,
  AED: 23.7,
  THB: 2.4,
  LKR: 0.28,
  NZD: 50,
};

// new-site slug -> old-site API path
const CATEGORIES = [
  { slug: "venues", oldPath: "venues", kind: "venue" },
  { slug: "planners", oldPath: "planners", kind: "service" },
  { slug: "photography", oldPath: "photographers", kind: "service" },
  { slug: "decorators", oldPath: "decorators", kind: "service" },
  { slug: "makeup", oldPath: "makeupartists", kind: "service" },
];

const loose = new mongoose.Schema({}, { strict: false });
const Vendor = mongoose.model("Vendor", loose);
const Venue = mongoose.model("Venue", loose);
const ServiceListing = mongoose.model("ServiceListing", loose);

function toINR(rec) {
  const rate = FX_TO_INR[rec.currency];
  if (rate == null) {
    console.warn(`  ! unknown currency "${rec.currency}" on "${rec.vendorname}" — skipping price conversion, using raw value`);
    return Math.round(rec.startingprice || 0);
  }
  return Math.round((rec.startingprice || 0) * rate);
}

// Old records sometimes leave `city` blank and only populate the full
// address string in `cityname` (e.g. "25 W 28th St, New York, NY 10001,
// United States"). Strip street/zip segments (anything with a digit) to
// recover just the city.
function parseCityFallback(cityname) {
  if (!cityname) return "";
  const parts = cityname.split(",").map((s) => s.trim()).filter(Boolean);
  const clean = parts.filter((s) => !/\d/.test(s));
  return clean[0] || "";
}

function resolveCity(rec) {
  return rec.city || parseCityFallback(rec.cityname) || "Unknown";
}

function imageUrl(rec) {
  if (!rec.imagespath) return "";
  // Old filenames often contain raw spaces (e.g. "Screenshot 2024-10-29
  // 195153.png") that break unencoded in an <img>/next/image src.
  const encodedPath = rec.imagespath
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/");
  return OLD_IMAGE_BASE + encodedPath;
}

async function fetchCategory(oldPath) {
  const res = await fetch(`https://api.soulswed.com/vendors/${oldPath}`);
  if (!res.ok) throw new Error(`fetch ${oldPath} failed: ${res.status}`);
  const data = await res.json();
  return data.filter((r) => r.test === 0 && r.active === 1);
}

async function ensureVendor() {
  let vendor = await Vendor.findOne({ email: VENDOR_EMAIL });
  if (vendor) {
    console.log(`Using existing vendor account: ${vendor._id} (${VENDOR_EMAIL})`);
    return vendor;
  }
  console.log(`No vendor found for ${VENDOR_EMAIL} in this database.`);
  if (!apply) {
    console.log("(dry run — would create a new Vendor account here)");
    return { _id: "DRY-RUN-VENDOR-ID" };
  }
  vendor = await Vendor.create({
    name: "SoulsWed Legacy Import",
    businessName: "SoulsWed Legacy Import",
    email: VENDOR_EMAIL,
    city: "Multiple",
    country: "India",
    categories: CATEGORIES.map((c) => c.slug),
    verified: true,
  });
  console.log(`Created vendor account: ${vendor._id}`);
  return vendor;
}

function mapVenue(rec, vendorId) {
  return {
    vendorId: String(vendorId),
    venueId: `legacy-venue-${rec.idvendor}`,
    name: rec.vendorname.trim(),
    location: rec.cityname || rec.city || "",
    city: resolveCity(rec),
    country: rec.countryname || "India",
    price: String(toINR(rec)),
    priceUnit: rec.pricebasis || "Per Day",
    rating: 0,
    reviewCount: 0,
    verified: false,
    featured: false,
    image: imageUrl(rec),
    heroImage: imageUrl(rec),
    gallery: [],
    videos: [],
    faqs: [],
    reviews: [],
    features: [],
    description: rec.description || "",
    active: true,
  };
}

function mapService(rec, vendorId, slug) {
  const priceFrom = toINR(rec) || 5000;
  return {
    vendorId: String(vendorId),
    serviceId: `legacy-${slug}-${rec.idvendor}`,
    category: slug,
    name: rec.vendorname.trim(),
    city: resolveCity(rec),
    country: rec.countryname || "India",
    location: rec.cityname || "",
    priceFrom,
    priceUnit: rec.pricebasis || "",
    description: rec.description || "",
    image: imageUrl(rec),
    heroImage: imageUrl(rec),
    gallery: [],
    videos: [],
    faqs: [],
    features: [],
    rating: 0,
    reviewCount: 0,
    verified: false,
    featured: false,
    active: true,
  };
}

async function main() {
  await mongoose.connect(uri, { bufferCommands: false });
  console.log(`Connected to database: ${mongoose.connection.db.databaseName}`);
  console.log(apply ? "APPLY MODE — will write to the database" : "DRY RUN — nothing will be written (pass --apply to write)");
  console.log("");

  const vendor = await ensureVendor();
  console.log("");

  let totalWritten = 0;
  for (const { slug, oldPath, kind } of CATEGORIES) {
    console.log(`--- ${slug} (old path: ${oldPath}) ---`);
    const records = (await fetchCategory(oldPath)).slice(0, PER_CATEGORY_LIMIT);
    console.log(`  fetched ${records.length} usable records (test/inactive filtered out)`);

    const docs = records.map((rec) =>
      kind === "venue" ? mapVenue(rec, vendor._id) : mapService(rec, vendor._id, slug)
    );

    console.log(`  sample: ${JSON.stringify(docs[0], null, 2)}`);

    if (apply) {
      const Model = kind === "venue" ? Venue : ServiceListing;
      const idField = kind === "venue" ? "venueId" : "serviceId";
      let written = 0;
      for (const doc of docs) {
        await Model.updateOne({ [idField]: doc[idField] }, { $set: doc }, { upsert: true });
        written++;
      }
      console.log(`  wrote ${written} documents to ${kind === "venue" ? "venues" : "servicelistings"}`);
      totalWritten += written;
    }
    console.log("");
  }

  console.log(apply ? `Done. Total written: ${totalWritten}` : "Dry run complete. Re-run with --apply to write.");
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
