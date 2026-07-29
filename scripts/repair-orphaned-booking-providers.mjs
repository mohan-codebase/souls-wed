/**
 * One-time data repair: point orphaned bookings at real listings.
 *
 * THE PROBLEM
 *
 * `Booking.providerId` is supposed to hold a `Venue.venueId` slug
 * ("venue-refinery-1") or a `ServiceListing.serviceId` ("decorator-enchanted-1").
 * Seeded bookings instead stored the listing's raw MongoDB `_id`
 * ("6a5b9aa2fe9eb47c17b765fd"). Both point at the same venue, but nothing else
 * in the app knows that:
 *
 *   1. The double-booking check in POST /api/bookings matches `providerId` as
 *      an exact string. A booking stored under the `_id` spelling does NOT
 *      conflict with one stored under the slug — so the same venue could be
 *      sold twice for the same date. This is the reason the repair matters.
 *   2. GET /api/bookings resolves a vendor's listings to slugs, so `_id`-based
 *      bookings were invisible to the vendor who owned them.
 *   3. GET /api/bookings/availability never returned those dates, so the public
 *      calendar showed booked days as free.
 *
 * POST /api/bookings now normalises `providerId` to the canonical slug on
 * write, so new orphans can't appear. This script fixes the ones already there.
 *
 * WHAT IT DOES
 *
 * For every booking whose `providerId` matches no live listing, it resolves the
 * real listing by, in order:
 *   1. `Venue._id`            — the seed-data case, an exact and unambiguous match
 *   2. `ServiceListing._id`
 *   3. `Venue.name` / `ServiceListing.name` matched against `providerName`
 *
 * Name matching is the last resort and is skipped when the name is ambiguous
 * (more than one listing shares it). Anything unresolved is reported, never
 * guessed at.
 *
 * It also backfills `providerImage`, which older bookings predate.
 *
 * USAGE
 *
 *   node scripts/repair-orphaned-booking-providers.mjs            # dry run
 *   node scripts/repair-orphaned-booking-providers.mjs --apply    # write
 *
 * Safe to re-run: healthy bookings are skipped.
 */
import "dotenv/config";
import mongoose from "mongoose";

const apply = process.argv.includes("--apply");

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI is not set. Run this from the project root so .env is picked up.");
  process.exit(1);
}

const loose = new mongoose.Schema({}, { strict: false });
const Booking = mongoose.model("Booking", loose);
const Venue = mongoose.model("Venue", loose);
const ServiceListing = mongoose.model("ServiceListing", loose);

const isObjectId = (v) => /^[0-9a-fA-F]{24}$/.test(String(v || ""));

async function main() {
  await mongoose.connect(uri);
  console.log(`Connected.${apply ? "" : "  DRY RUN — nothing will be written."}\n`);

  const [venues, services, bookings] = await Promise.all([
    Venue.find({}, "venueId name image heroImage").lean(),
    ServiceListing.find({}, "serviceId name image").lean(),
    Booking.find({}, "providerId providerName providerImage status").lean(),
  ]);

  // Lookup tables
  const byVenueSlug = new Map(venues.map((v) => [v.venueId, v]));
  const byServiceSlug = new Map(services.map((s) => [s.serviceId, s]));
  const byVenueObjectId = new Map(venues.map((v) => [String(v._id), v]));
  const byServiceObjectId = new Map(services.map((s) => [String(s._id), s]));

  // Names are only usable if unique.
  const nameCounts = new Map();
  for (const item of [...venues, ...services]) {
    nameCounts.set(item.name, (nameCounts.get(item.name) || 0) + 1);
  }
  const byUniqueName = new Map();
  for (const v of venues) if (nameCounts.get(v.name) === 1) byUniqueName.set(v.name, v);
  for (const s of services) if (nameCounts.get(s.name) === 1) byUniqueName.set(s.name, s);

  const canonicalOf = (item) => item.venueId ?? item.serviceId;
  const imageOf = (item) => item.heroImage || item.image || "";

  let healthy = 0;
  const repairs = [];
  const unresolved = [];

  for (const b of bookings) {
    const pid = b.providerId;

    if (byVenueSlug.has(pid) || byServiceSlug.has(pid)) {
      healthy++;
      // Still worth backfilling a missing thumbnail.
      if (!b.providerImage) {
        const item = byVenueSlug.get(pid) || byServiceSlug.get(pid);
        const img = imageOf(item);
        if (img) repairs.push({ b, to: pid, img, via: "image backfill only" });
      }
      continue;
    }

    let match = null;
    let via = "";

    if (isObjectId(pid)) {
      match = byVenueObjectId.get(pid) || byServiceObjectId.get(pid) || null;
      if (match) via = "listing _id";
    }
    if (!match && b.providerName && byUniqueName.has(b.providerName)) {
      match = byUniqueName.get(b.providerName);
      via = "unique name match";
    }

    if (match) {
      repairs.push({ b, to: canonicalOf(match), img: imageOf(match), via });
    } else {
      unresolved.push(b);
    }
  }

  console.log(`Bookings scanned: ${bookings.length}`);
  console.log(`  already correct: ${healthy}`);
  console.log(`  to repair:       ${repairs.length}`);
  console.log(`  unresolved:      ${unresolved.length}\n`);

  if (repairs.length) {
    console.log("REPAIRS");
    console.log("─".repeat(96));
    for (const r of repairs) {
      const shortId = String(r.b._id).slice(-8);
      const from = r.b.providerId;
      console.log(
        `  ${shortId}  ${(r.b.providerName || "?").slice(0, 30).padEnd(30)} ` +
          `${String(from).slice(0, 26).padEnd(26)} → ${String(r.to).padEnd(28)} (${r.via})`
      );
      if (apply) {
        const set = { providerId: r.to };
        if (r.img && !r.b.providerImage) set.providerImage = r.img;
        await Booking.updateOne({ _id: r.b._id }, { $set: set });
      }
    }
    console.log("─".repeat(96));
  }

  if (unresolved.length) {
    console.log("\n⚠ UNRESOLVED — these point at nothing and were left untouched:");
    for (const b of unresolved) {
      console.log(
        `  ${String(b._id).slice(-8)}  providerId="${b.providerId}"  name="${b.providerName || "?"}"  status=${b.status}`
      );
    }
    console.log(
      "\n  Either the listing was deleted, or the name has changed. Decide per booking:\n" +
        "  point it at the right listing by hand, or cancel it so the dates are released."
    );
  }

  if (!apply && repairs.length) {
    console.log("\nDRY RUN — nothing was written. Re-run with --apply to make these changes.");
  } else if (apply) {
    console.log("\nDone. Re-run without --apply to confirm everything reports as correct.");
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Repair failed:", err);
  process.exit(1);
});
