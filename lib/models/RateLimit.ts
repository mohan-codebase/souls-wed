/**
 * RATE LIMIT COUNTER
 *
 * One document per limited key ("login:acct:user:someone@example.com"), holding
 * the attempt count and when the current window ends.
 *
 * WHY THIS IS IN THE DATABASE
 *
 * The first version of the limiter kept counters in process memory. That works
 * on a single long-running Node server but is useless on Vercel, where every
 * invocation can get fresh memory — the counter resets constantly and the limit
 * never bites. Since this app deploys to Vercel, the counters have to live
 * somewhere shared.
 *
 * Mongo rather than Redis because the app already has Mongo: no extra service,
 * no extra credentials, nothing new to keep alive. Redis would be faster, but
 * these limits guard sign-in and public forms, not a hot read path, so one
 * extra round-trip on those endpoints is a fair trade.
 */

import mongoose, { Schema } from "mongoose";

const RateLimitSchema = new Schema(
  {
    // The limit key IS the primary key — no separate index needed, and it makes
    // the increment a single atomic upsert.
    _id: { type: String, required: true },
    count: { type: Number, required: true, default: 0 },
    resetAt: { type: Date, required: true },
  },
  { versionKey: false }
);

// Mongo deletes each document once `resetAt` passes, so expired windows clean
// themselves up and the collection can't grow without bound. (The background
// task runs about once a minute, so rows may linger briefly after expiry —
// harmless, because every read also checks `resetAt` itself.)
RateLimitSchema.index({ resetAt: 1 }, { expireAfterSeconds: 0 });

if (mongoose.models.RateLimit) {
  delete mongoose.models.RateLimit;
}

export const RateLimit = mongoose.model("RateLimit", RateLimitSchema);
