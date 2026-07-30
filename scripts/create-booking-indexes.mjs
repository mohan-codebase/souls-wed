/**
 * Build the double-booking guard index on the bookings collection.
 *
 * WHY
 * ---
 * The booking conflict check in POST /api/bookings is a findOne-then-save: two
 * concurrent requests (a double-clicked submit, or two racing clients) can both
 * pass the check before either writes, and the same date gets sold twice. A
 * unique partial index on { providerId, eventDates } makes MongoDB reject the
 * second write. See lib/models/Booking.ts for the full rationale.
 *
 * autoIndex is unreliable on serverless (and off in many prod setups), so the
 * index has to be built explicitly — that's what this script does.
 *
 * WHAT IT DOES
 * ------------
 * 1. Scans existing ACTIVE (pending/confirmed) bookings for any provider+date
 *    that is already held by more than one booking. A unique index cannot be
 *    built while such duplicates exist, and they are exactly the double-bookings
 *    we're trying to prevent — so the script REPORTS them and stops rather than
 *    guessing which one to keep. Resolve them (cancel one) and re-run.
 * 2. If clean, creates the index. Safe to re-run; creating an index that
 *    already exists with the same spec is a no-op.
 *
 * USAGE
 * -----
 *   node scripts/create-booking-indexes.mjs            # dry run (report only)
 *   node scripts/create-booking-indexes.mjs --apply    # build the index
 *
 * Requires MongoDB 5.3+ (for $in in the partialFilterExpression). Reads
 * MONGODB_URI from .env.
 */
import "dotenv/config";
import mongoose from "mongoose";

const apply = process.argv.includes("--apply");

const INDEX_KEY = { providerId: 1, eventDates: 1 };
const INDEX_OPTIONS = {
  name: "provider_eventDates_active_unique",
  unique: true,
  partialFilterExpression: {
    status: { $in: ["pending", "confirmed"] },
    eventDates: { $exists: true },
  },
};

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is not set. Add it to .env.");
    process.exit(1);
  }

  await mongoose.connect(uri, { bufferCommands: false });
  const bookings = mongoose.connection.collection("bookings");

  // ── Step 1: detect existing conflicts that would block the build ──
  // One index entry per (providerId, date) across active bookings; anything
  // that appears more than once is an existing double-booking.
  const dupes = await bookings
    .aggregate([
      { $match: { status: { $in: ["pending", "confirmed"] }, eventDates: { $exists: true } } },
      { $unwind: "$eventDates" },
      {
        $group: {
          _id: { providerId: "$providerId", date: "$eventDates" },
          bookingIds: { $addToSet: "$_id" },
          count: { $sum: 1 },
        },
      },
      { $match: { count: { $gt: 1 } } },
    ])
    .toArray();

  if (dupes.length > 0) {
    console.error(
      `\n✖ Found ${dupes.length} provider+date slot(s) already held by more than one active booking.\n` +
        "  A unique index can't be built until these are resolved (cancel the extra booking).\n"
    );
    for (const d of dupes) {
      const date = new Date(d._id.date).toISOString().split("T")[0];
      console.error(
        `  provider ${d._id.providerId}  ${date}  →  bookings: ${d.bookingIds.map(String).join(", ")}`
      );
    }
    console.error("\nNo index created. Resolve the conflicts above and re-run.");
    await mongoose.disconnect();
    process.exit(2);
  }

  console.log("✓ No existing active double-bookings — safe to build the index.");

  if (!apply) {
    console.log("\nDry run. Re-run with --apply to create:");
    console.log(`  ${JSON.stringify(INDEX_KEY)}  ${JSON.stringify(INDEX_OPTIONS)}`);
    await mongoose.disconnect();
    return;
  }

  await bookings.createIndex(INDEX_KEY, INDEX_OPTIONS);
  console.log(`\n✓ Created index "${INDEX_OPTIONS.name}".`);

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error("Failed:", err.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
