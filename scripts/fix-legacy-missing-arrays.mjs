/**
 * One-off fix for scripts/import-legacy-listings.mjs: it wrote documents via
 * updateOne(..., { upsert: true }), which bypasses Mongoose's schema defaults,
 * so array fields not explicitly set in the mapped doc (reviews, faqs,
 * features) are entirely absent rather than defaulting to []. Any component
 * that calls .filter()/.map() on venue.reviews etc. without a fallback
 * crashes on these documents (see VenueReviews.tsx).
 *
 * USAGE
 *   node scripts/fix-legacy-missing-arrays.mjs                         # dry run, soulswed-dev
 *   node scripts/fix-legacy-missing-arrays.mjs --apply                 # write, soulswed-dev
 *   node scripts/fix-legacy-missing-arrays.mjs --apply --target=production
 */
import "dotenv/config";
import mongoose from "mongoose";

const apply = process.argv.includes("--apply");
const targetArg = process.argv.find((a) => a.startsWith("--target="));
const target = targetArg ? targetArg.split("=")[1] : "dev";

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI is not set.");
  process.exit(1);
}
const expectedDb = target === "production" ? "/soulswed?" : "/soulswed-dev?";
if (!uri.includes(expectedDb)) {
  console.error(`Refusing to run: --target=${target} expects MONGODB_URI to contain "${expectedDb}".`);
  process.exit(1);
}

const loose = new mongoose.Schema({}, { strict: false });
const Venue = mongoose.model("Venue", loose);
const ServiceListing = mongoose.model("ServiceListing", loose);

async function fixCollection(Model, idField, fields) {
  const filter = { [idField]: /^legacy-/, $or: fields.map((f) => ({ [f]: { $exists: false } })) };
  const count = await Model.countDocuments(filter);
  if (apply && count > 0) {
    const setObj = Object.fromEntries(fields.map((f) => [f, []]));
    // Only sets fields that are missing on each matched doc; $set with array
    // literal is safe here since we already scoped the filter to "missing".
    for (const f of fields) {
      await Model.updateMany({ [idField]: /^legacy-/, [f]: { $exists: false } }, { $set: { [f]: [] } });
    }
  }
  return count;
}

async function main() {
  await mongoose.connect(uri, { bufferCommands: false });
  console.log(`Connected to database: ${mongoose.connection.db.databaseName}`);
  console.log(apply ? "APPLY MODE — will write" : "DRY RUN — pass --apply to write");

  const venueCount = await fixCollection(Venue, "venueId", ["reviews", "faqs", "features"]);
  console.log(`venues needing a fix: ${venueCount}`);
  const serviceCount = await fixCollection(ServiceListing, "serviceId", ["faqs", "features"]);
  console.log(`servicelistings needing a fix: ${serviceCount}`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
