/**
 * Flips verified:true on the listings written by scripts/import-legacy-listings.mjs
 * (identified by venueId/serviceId starting with "legacy-"), so they go live on
 * public pages.
 *
 * USAGE
 *   node scripts/verify-legacy-listings.mjs            # dry run, prints counts
 *   node scripts/verify-legacy-listings.mjs --apply     # actually writes
 */
import "dotenv/config";
import mongoose from "mongoose";

const apply = process.argv.includes("--apply");

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI is not set. Run from the project root so .env is picked up.");
  process.exit(1);
}
if (!/\/soulswed-dev\?/.test(uri)) {
  console.error(`Refusing to run: MONGODB_URI does not point at soulswed-dev. Got: ${uri.replace(/\/\/[^@]+@/, "//<redacted>@")}`);
  process.exit(1);
}

const loose = new mongoose.Schema({}, { strict: false });
const Venue = mongoose.model("Venue", loose);
const ServiceListing = mongoose.model("ServiceListing", loose);

async function main() {
  await mongoose.connect(uri, { bufferCommands: false });
  console.log(`Connected to database: ${mongoose.connection.db.databaseName}`);
  console.log(apply ? "APPLY MODE — will write" : "DRY RUN — pass --apply to write");
  console.log("");

  const venueFilter = { venueId: /^legacy-/, verified: { $ne: true } };
  const serviceFilter = { serviceId: /^legacy-/, verified: { $ne: true } };

  const venueCount = await Venue.countDocuments(venueFilter);
  const serviceCount = await ServiceListing.countDocuments(serviceFilter);
  console.log(`venues to verify: ${venueCount}`);
  console.log(`servicelistings to verify: ${serviceCount}`);

  if (apply) {
    const v = await Venue.updateMany(venueFilter, { $set: { verified: true } });
    const s = await ServiceListing.updateMany(serviceFilter, { $set: { verified: true } });
    console.log(`\nvenues updated: ${v.modifiedCount}`);
    console.log(`servicelistings updated: ${s.modifiedCount}`);
  } else {
    console.log("\nRe-run with --apply to write.");
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
