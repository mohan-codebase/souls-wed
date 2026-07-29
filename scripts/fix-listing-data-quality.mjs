/**
 * Data-quality pass over listings and vendor profiles (AUDIT-REPORT.md P3).
 *
 * Three separate problems, all cosmetic-but-visible:
 *
 * 1. `country: "Global"` on real listings.
 *    Refinery Hotel New York renders as "Garment District, Global" while its own
 *    map card correctly says "New York, United States". "Global" is a
 *    placeholder that leaked into production data. This infers the real country
 *    from the city where it can, and leaves anything ambiguous alone.
 *
 * 2. The master vendor has no `category`.
 *    `/api/auth/me` returns `category: ""`, so the admin Vendors table renders
 *    an empty pill. Inferred from the categories the vendor actually lists in.
 *
 * 3. `reviewCount` / `rating` drift.
 *    Recomputed from the real `reviews[]` array. (scripts/backfill-review-stats.mjs
 *    already does this; repeated here so one run leaves everything consistent.)
 *
 * USAGE
 *   node scripts/fix-listing-data-quality.mjs            # dry run
 *   node scripts/fix-listing-data-quality.mjs --apply
 *
 * Everything it would change is printed first. Safe to re-run.
 */
import "dotenv/config";
import mongoose from "mongoose";

const apply = process.argv.includes("--apply");

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI is not set. Run from the project root so .env is picked up.");
  process.exit(1);
}

const loose = new mongoose.Schema({}, { strict: false });
const Venue = mongoose.model("Venue", loose);
const ServiceListing = mongoose.model("ServiceListing", loose);
const Vendor = mongoose.model("Vendor", loose);

/**
 * City → country. Deliberately conservative: only cities we're confident about.
 * Anything not listed here is reported and left untouched rather than guessed.
 */
const CITY_COUNTRY = {
  "new york": "United States",
  "garment district": "United States",
  nomad: "United States",
  manhattan: "United States",
  brooklyn: "United States",
  "hong kong": "Hong Kong",
  admiralty: "Hong Kong",
  "tsim sha tsui": "Hong Kong",
  london: "United Kingdom",
  westminster: "United Kingdom",
  mumbai: "India",
  delhi: "India",
  "new delhi": "India",
  bengaluru: "India",
  bangalore: "India",
  chennai: "India",
  hyderabad: "India",
  jaipur: "India",
  udaipur: "India",
  goa: "India",
  kolkata: "India",
  pune: "India",
};

const PLACEHOLDER_COUNTRIES = new Set(["", "global", "n/a", "unknown", null, undefined]);

function inferCountry(doc) {
  const current = String(doc.country ?? "").trim();
  if (!PLACEHOLDER_COUNTRIES.has(current.toLowerCase())) return null; // already fine

  const haystack = [doc.city, doc.location, doc.name]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  for (const [city, country] of Object.entries(CITY_COUNTRY)) {
    if (haystack.includes(city)) return country;
  }
  return null;
}

function reviewStats(reviews) {
  const list = Array.isArray(reviews) ? reviews : [];
  if (list.length === 0) return { reviewCount: 0, rating: 0 };
  const sum = list.reduce((acc, r) => acc + (Number(r?.rating) || 0), 0);
  return { reviewCount: list.length, rating: Number((sum / list.length).toFixed(1)) };
}

async function main() {
  await mongoose.connect(uri);
  console.log(`Connected.${apply ? "" : "  DRY RUN — nothing will be written."}\n`);

  const [venues, services, vendors] = await Promise.all([
    Venue.find({}).lean(),
    ServiceListing.find({}).lean(),
    Vendor.find({}).lean(),
  ]);

  // ── 1 + 3: listings ──
  const listingFixes = [];
  const unknownCountry = [];

  for (const [label, Model, docs] of [
    ["venue", Venue, venues],
    ["service", ServiceListing, services],
  ]) {
    for (const d of docs) {
      const set = {};

      const country = inferCountry(d);
      if (country) set.country = country;
      else if (PLACEHOLDER_COUNTRIES.has(String(d.country ?? "").toLowerCase())) {
        unknownCountry.push(`${label}: ${d.name} (city: ${d.city || "—"})`);
      }

      const stats = reviewStats(d.reviews);
      if (d.reviewCount !== stats.reviewCount) set.reviewCount = stats.reviewCount;
      if (Number(d.rating ?? 0) !== stats.rating) set.rating = stats.rating;

      if (Object.keys(set).length) {
        listingFixes.push({ label, Model, doc: d, set });
      }
    }
  }

  // ── 2: vendor category ──
  const vendorFixes = [];
  for (const v of vendors) {
    if (String(v.category ?? "").trim()) continue;

    const owned = services.filter((s) => String(s.vendorId) === String(v._id));
    const ownsVenues = venues.some((x) => String(x.vendorId) === String(v._id));

    const categories = [...new Set(owned.map((s) => s.category).filter(Boolean))];
    if (ownsVenues) categories.unshift("venues");

    if (categories.length === 0) continue;

    // A vendor listing in several categories is a "Multi-category" partner;
    // otherwise use the single category they actually operate in.
    const category = categories.length > 1 ? "Multi-category" : categories[0];
    vendorFixes.push({ v, set: { category } });
  }

  // ── report + apply ──
  console.log(`Listings needing a fix: ${listingFixes.length}`);
  for (const f of listingFixes) {
    console.log(`  [${f.label}] ${String(f.doc.name).slice(0, 40).padEnd(40)} ${JSON.stringify(f.set)}`);
    if (apply) await f.Model.updateOne({ _id: f.doc._id }, { $set: f.set });
  }

  console.log(`\nVendors needing a category: ${vendorFixes.length}`);
  for (const f of vendorFixes) {
    console.log(`  ${f.v.businessName || f.v.name} → ${f.set.category}`);
    if (apply) await Vendor.updateOne({ _id: f.v._id }, { $set: f.set });
  }

  if (unknownCountry.length) {
    console.log(`\n⚠ Country could not be inferred — set these by hand in the admin panel:`);
    unknownCountry.forEach((u) => console.log(`  ${u}`));
  }

  console.log(
    apply
      ? "\nDone."
      : "\nDRY RUN — nothing was written. Re-run with --apply to make these changes."
  );

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Data-quality pass failed:", err);
  process.exit(1);
});
