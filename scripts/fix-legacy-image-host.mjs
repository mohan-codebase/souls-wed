/**
 * Second fix to scripts/import-legacy-listings.mjs's image URLs: the first
 * version used OLD_IMAGE_BASE = "https://soulswed.com", which is wrong on two
 * counts — that's the *new* app's own domain (currently in full maintenance
 * mode, which is why a plain HTTP-200 check looked fine), and it's missing
 * the "/uploads" prefix the old Angular app actually used. Correct base,
 * confirmed by real image/jpeg content-type: "https://api.soulswed.com/uploads".
 *
 * Rewrites image/heroImage on every legacy-imported document from the old
 * (wrong) host to the new (correct, already percent-encoded) one.
 *
 * USAGE
 *   node scripts/fix-legacy-image-host.mjs                         # dry run, soulswed-dev
 *   node scripts/fix-legacy-image-host.mjs --apply                 # write, soulswed-dev
 *   node scripts/fix-legacy-image-host.mjs --apply --target=production
 */
import "dotenv/config";
import mongoose from "mongoose";

const apply = process.argv.includes("--apply");
const targetArg = process.argv.find((a) => a.startsWith("--target="));
const target = targetArg ? targetArg.split("=")[1] : "dev";

const OLD_BASE = "https://soulswed.com";
const NEW_BASE = "https://api.soulswed.com/uploads";

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

async function fixCollection(Model, idField) {
  const docs = await Model.find({ [idField]: /^legacy-/, image: { $regex: `^${OLD_BASE.replace(/[.]/g, "\\.")}` } })
    .select(`${idField} image heroImage`)
    .lean();
  if (apply) {
    for (const doc of docs) {
      const newImage = doc.image.replace(OLD_BASE, NEW_BASE);
      const newHero = (doc.heroImage || "").startsWith(OLD_BASE) ? doc.heroImage.replace(OLD_BASE, NEW_BASE) : doc.heroImage;
      await Model.updateOne({ _id: doc._id }, { $set: { image: newImage, heroImage: newHero } });
    }
  }
  return docs.length;
}

async function main() {
  await mongoose.connect(uri, { bufferCommands: false });
  console.log(`Connected to database: ${mongoose.connection.db.databaseName}`);
  console.log(apply ? "APPLY MODE — will write" : "DRY RUN — pass --apply to write");

  const v = await fixCollection(Venue, "venueId");
  console.log(`venues fixed: ${v}`);
  const s = await fixCollection(ServiceListing, "serviceId");
  console.log(`servicelistings fixed: ${s}`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
