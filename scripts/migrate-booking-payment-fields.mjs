/**
 * One-time data migration: split payment state out of booking status.
 *
 * WHY
 * ---
 * `Booking` used to have no record of whether money was actually collected.
 * Revenue and vendor payouts were derived from `advanceAmount` on any booking
 * whose `status` happened to be "confirmed" or "completed" — a status an admin
 * could set with a dropdown. Marking an unpaid booking "Confirmed" therefore
 * invented revenue and queued a real vendor payout.
 *
 * The schema now carries `paymentStatus` / `amountPaid` / `paidAt` /
 * `paidMethod`, written only by Stripe verification, the Stripe webhook, or an
 * explicit admin "record offline payment" action. This script backfills those
 * fields on bookings that predate the change.
 *
 * WHAT IT DOES
 * ------------
 * Bookings with a `stripeSessionId` are treated as genuinely paid through
 * Stripe. Everything else is ambiguous — the booking was confirmed by hand and
 * we have no payment record — so you choose how to treat them:
 *
 *   --mode=trust    confirmed/completed bookings become paid (method "offline",
 *                   amountPaid = advanceAmount). Keeps your existing revenue and
 *                   payout figures exactly as they are today.
 *
 *   --mode=strict   only bookings with a Stripe session become paid. Everything
 *                   else is marked unpaid, so revenue reflects only money you
 *                   can actually evidence. Existing `status` values are left
 *                   untouched — nothing is cancelled.
 *
 * USAGE
 * -----
 *   node scripts/migrate-booking-payment-fields.mjs --mode=trust --dry-run
 *   node scripts/migrate-booking-payment-fields.mjs --mode=trust
 *
 * Always run --dry-run first: it prints exactly what would change and writes
 * nothing. Re-running is safe; bookings already carrying a paymentStatus are
 * skipped unless you pass --force.
 */
import "dotenv/config";
import mongoose from "mongoose";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const force = args.includes("--force");
const modeArg = args.find((a) => a.startsWith("--mode="));
const mode = modeArg ? modeArg.split("=")[1] : null;

if (!mode || !["trust", "strict"].includes(mode)) {
  console.error(
    "Pick a mode:\n" +
      "  --mode=trust   confirmed/completed bookings count as paid (preserves current revenue)\n" +
      "  --mode=strict  only Stripe-verified bookings count as paid\n\n" +
      "Add --dry-run to preview without writing."
  );
  process.exit(1);
}

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI is not set. Run this from the project root so .env is picked up.");
  process.exit(1);
}

const loose = new mongoose.Schema({}, { strict: false });
const Booking = mongoose.model("Booking", loose);

const inr = (n) => `₹${(n || 0).toLocaleString("en-IN")}`;

async function main() {
  await mongoose.connect(uri);
  console.log(`Connected. Mode: ${mode}${dryRun ? " (DRY RUN — nothing will be written)" : ""}\n`);

  const query = force ? {} : { paymentStatus: { $exists: false } };
  const bookings = await Booking.find(query).lean();

  if (bookings.length === 0) {
    console.log("No bookings need migrating. (Use --force to re-evaluate all of them.)");
    await mongoose.disconnect();
    return;
  }

  console.log(`Found ${bookings.length} booking(s) to evaluate.\n`);

  let paidCount = 0;
  let unpaidCount = 0;
  let revenueBefore = 0;
  let revenueAfter = 0;

  for (const b of bookings) {
    const isLive = ["confirmed", "completed"].includes(b.status);
    const hasStripe = Boolean(b.stripeSessionId);

    // What the OLD code would have counted as revenue, for comparison.
    if (isLive) revenueBefore += b.advanceAmount || 0;

    let update;
    let reason;

    if (hasStripe) {
      update = {
        paymentStatus: "paid",
        amountPaid: b.advanceAmount || 0,
        paidAt: b.updatedAt || b.createdAt || new Date(),
        paidMethod: "stripe",
      };
      reason = "has Stripe session";
    } else if (mode === "trust" && isLive) {
      update = {
        paymentStatus: "paid",
        amountPaid: b.advanceAmount || 0,
        paidAt: b.updatedAt || b.createdAt || new Date(),
        paidMethod: "offline",
        paidRecordedBy: "migration",
        paidNote: "Backfilled by migrate-booking-payment-fields.mjs (--mode=trust)",
      };
      reason = `status "${b.status}", trusted by migration`;
    } else {
      update = { paymentStatus: "unpaid", amountPaid: 0 };
      reason = isLive ? `status "${b.status}" but no payment evidence` : `status "${b.status}"`;
    }

    if (update.paymentStatus === "paid") {
      paidCount++;
      revenueAfter += update.amountPaid;
    } else {
      unpaidCount++;
    }

    const shortId = String(b._id).slice(-8);
    console.log(
      `  ${shortId}  ${(b.providerName || "?").slice(0, 34).padEnd(34)} ` +
        `${inr(b.advanceAmount).padStart(12)}  →  ${update.paymentStatus.toUpperCase().padEnd(6)} (${reason})`
    );

    if (!dryRun) {
      await Booking.updateOne({ _id: b._id }, { $set: update });
    }
  }

  console.log(`\n${"─".repeat(76)}`);
  console.log(`  Marked paid:    ${paidCount}`);
  console.log(`  Marked unpaid:  ${unpaidCount}`);
  console.log(`  Revenue under old (status-based) rule:  ${inr(revenueBefore)}`);
  console.log(`  Revenue under new (payment-based) rule: ${inr(revenueAfter)}`);
  if (revenueAfter !== revenueBefore) {
    console.log(
      `\n  ⚠ Dashboard revenue will change by ${inr(revenueAfter - revenueBefore)}.\n` +
        `    That difference is booking value that was never actually collected.`
    );
  }
  console.log(`${"─".repeat(76)}`);

  if (dryRun) {
    console.log("\nDRY RUN — nothing was written. Re-run without --dry-run to apply.");
  } else {
    console.log("\nDone.");
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
