/**
 * One-off fix for scripts/import-legacy-listings.mjs having written image/heroImage
 * URLs with raw, unencoded spaces (e.g. ".../Screenshot 2024-10-29 195153.png"),
 * which 404/break in <img>/next/image. Re-encodes each path segment in place.
 *
 * USAGE
 *   node scripts/fix-legacy-image-encoding.mjs                         # dry run, soulswed-dev
 *   node scripts/fix-legacy-image-encoding.mjs --apply                 # write, soulswed-dev
 *   node scripts/fix-legacy-image-encoding.mjs --apply --target=production
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

function fixUrl(url) {
  if (!url) return url;
  const m = url.match(/^(https?:\/\/[^/]+)(\/.*)$/);
  if (!m) return url;
  const [, base, path] = m;
  const fixedPath = path
    .split("/")
    .map((seg) => (seg.includes("%") ? seg : encodeURIComponent(decodeURIComponent(seg))))
    .join("/");
  return base + fixedPath;
}

const loose = new mongoose.Schema({}, { strict: false });
const Venue = mongoose.model("Venue", loose);
const ServiceListing = mongoose.model("ServiceListing", loose);

async function fixCollection(Model, idField) {
  const docs = await Model.find({ [idField]: /^legacy-/ }).select(`${idField} image heroImage`).lean();
  let changed = 0;
  for (const doc of docs) {
    const newImage = fixUrl(doc.image);
    const newHero = fixUrl(doc.heroImage);
    if (newImage !== doc.image || newHero !== doc.heroImage) {
      changed++;
      if (apply) {
        await Model.updateOne({ _id: doc._id }, { $set: { image: newImage, heroImage: newHero } });
      }
    }
  }
  return { total: docs.length, changed };
}

async function main() {
  await mongoose.connect(uri, { bufferCommands: false });
  console.log(`Connected to database: ${mongoose.connection.db.databaseName}`);
  console.log(apply ? "APPLY MODE — will write" : "DRY RUN — pass --apply to write");

  const v = await fixCollection(Venue, "venueId");
  console.log(`venues: ${v.changed} of ${v.total} needed fixing`);
  const s = await fixCollection(ServiceListing, "serviceId");
  console.log(`servicelistings: ${s.changed} of ${s.total} needed fixing`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
