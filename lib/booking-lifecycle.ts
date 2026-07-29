/**
 * BOOKING LIFECYCLE
 *
 * `Booking.status` documents the flow `pending → confirmed → completed`, but
 * nothing in the app ever performed the second arrow. There was no scheduled
 * job and no post-event transition — only an admin manually changing a
 * dropdown. Since `POST /api/venues/[id]/reviews` requires a booking with
 * `status: "completed"`, and none ever reached it, the review system could not
 * produce a single review. The admin panel reads "No reviews found" and every
 * vendor shows "0 reviews" for exactly that reason. See AUDIT-REPORT.md #14.
 *
 * WHY LAZILY, NOT ON A CRON
 *
 * The project has no scheduler and no worker process. Rather than introduce
 * that infrastructure, the transition runs opportunistically whenever a
 * booking list is read — which in practice is often enough, because the people
 * who care about a booking being complete (the customer wanting to review, the
 * vendor, the admin) are exactly the people loading those lists.
 *
 * It's throttled per process so a burst of requests doesn't repeat the write,
 * and it's a single `updateMany`, so the cost is one indexed query per minute
 * rather than per request. If a scheduler ever exists, call
 * `settleCompletedBookings()` from it and drop the call sites.
 */

import { connectDB } from "@/lib/mongodb";
import { Booking } from "@/lib/models/Booking";

/** Don't re-run the sweep more than once per minute in a given process. */
const THROTTLE_MS = 60_000;
let lastRunAt = 0;

/**
 * Move every confirmed, paid booking whose event has finished to "completed".
 *
 * Only PAID bookings are eligible: `completed` is what unlocks the customer's
 * ability to leave a review, and it feeds the payout ledger, so a booking
 * nobody paid for must not drift into it.
 *
 * @param force skip the throttle (used by the backfill script)
 * @returns how many bookings were transitioned
 */
export async function settleCompletedBookings(force = false): Promise<number> {
  const now = Date.now();
  if (!force && now - lastRunAt < THROTTLE_MS) return 0;
  lastRunAt = now;

  try {
    await connectDB();

    const cutoff = new Date();

    const result = await Booking.updateMany(
      {
        status: "confirmed",
        paymentStatus: "paid",
        $expr: {
          $let: {
            vars: {
              // A booking's "end" is the last event date, or the single
              // eventDate, or the room check-out — whichever it actually has.
              // $max over an empty/missing array yields null, so the $ne guard
              // below stops date-less records being swept up (in MongoDB's
              // ordering null sorts BEFORE any date, so a bare $lt would
              // wrongly match them).
              lastDate: {
                $ifNull: [
                  { $max: "$eventDates" },
                  { $ifNull: ["$eventDate", "$checkOut"] },
                ],
              },
            },
            in: {
              $and: [
                { $ne: ["$$lastDate", null] },
                { $lt: ["$$lastDate", cutoff] },
              ],
            },
          },
        },
      },
      { $set: { status: "completed", updatedAt: cutoff } }
    );

    if (result.modifiedCount > 0) {
      console.log(`[lifecycle] completed ${result.modifiedCount} past booking(s)`);
    }
    return result.modifiedCount ?? 0;
  } catch (err) {
    // Never let this break the request it's piggybacking on.
    console.error("[lifecycle] settleCompletedBookings failed:", err);
    return 0;
  }
}

/**
 * Whether `userId` may review `providerId` — i.e. they have a completed booking
 * against it that they haven't already reviewed.
 *
 * Mirrors the authorization in the review POST handlers so the UI can hide the
 * CTA instead of letting people write a review and then get a 403.
 */
export async function canUserReview(
  userId: string,
  providerId: string
): Promise<{ canReview: boolean; reason: string }> {
  if (!userId) {
    return { canReview: false, reason: "Please sign in to write a review." };
  }

  await connectDB();

  const completed = await Booking.findOne({
    userId,
    providerId,
    status: "completed",
  })
    .select("_id")
    .lean();

  if (!completed) {
    return {
      canReview: false,
      reason: "You can review this once you've completed a booking here.",
    };
  }

  return { canReview: true, reason: "" };
}
