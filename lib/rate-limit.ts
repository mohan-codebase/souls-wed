/**
 * RATE LIMITING
 *
 * The app previously had none. `POST /api/auth/login` accepted unlimited
 * attempts, so password brute-force and credential stuffing were open; so were
 * the endpoints that send email, which doubled as a free spam relay and a way
 * to mail-bomb any address. See AUDIT-REPORT.md #9.
 *
 * ── Why this talks to the database ──────────────────────────────────────────
 *
 * The first implementation held counters in process memory. That is fine on one
 * long-running Node server, and useless on Vercel: serverless invocations don't
 * share memory, so counters reset constantly and the limit never actually
 * bites. Since this app deploys to Vercel, the state has to be shared, and it
 * lives in Mongo (see lib/models/RateLimit.ts for why not Redis).
 *
 * Consequence: `hit()` and `reset()` are **async**. Every call site must await
 * them, or the limit silently does nothing.
 *
 * ── Accuracy ────────────────────────────────────────────────────────────────
 *
 * This is a fixed-window counter, not a sliding window, so a burst straddling a
 * window boundary can briefly exceed the nominal rate. Two simultaneous
 * requests that both find an expired window can also both open a new one,
 * costing one extra attempt. Both are acceptable here: the job is to make
 * brute-force impractical, not to meter billing.
 *
 * If the limiter ever fails (Mongo unreachable), it **fails open** — the
 * request is allowed. That is deliberate: a database blip should not lock
 * everyone out of signing in. It does mean the limiter is not a defence
 * against an attacker who can also take Mongo down, at which point you have a
 * larger problem.
 */

import { connectDB } from "@/lib/mongodb";
import { RateLimit } from "@/lib/models/RateLimit";
import type { RateLimitResult } from "@/lib/rate-limit-config";

// The pure half lives in its own import-free module so it can be unit-tested;
// re-exported here so call sites only ever import from "@/lib/rate-limit".
export { clientIp, LIMITS, tooManyRequests } from "@/lib/rate-limit-config";
export type { RateLimitResult } from "@/lib/rate-limit-config";

/**
 * Record one attempt against `key` and report whether it's allowed.
 *
 * @param key       identity being limited, e.g. `login:ip:1.2.3.4`
 * @param limit     attempts permitted per window
 * @param windowMs  window length in milliseconds
 */
export async function hit(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const windowSeconds = Math.ceil(windowMs / 1000);

  try {
    await connectDB();
    const now = new Date();

    // Increment inside a window that is still live. The `resetAt > now` guard
    // means an expired row simply doesn't match, and we fall through to
    // starting a fresh window below.
    const existing = await RateLimit.findOneAndUpdate(
      { _id: key, resetAt: { $gt: now } },
      { $inc: { count: 1 } },
      { new: true }
    ).lean();

    if (existing) {
      const retryAfter = Math.max(
        1,
        Math.ceil((new Date(existing.resetAt).getTime() - now.getTime()) / 1000)
      );
      if (existing.count > limit) {
        return { ok: false, remaining: 0, retryAfter };
      }
      return { ok: true, remaining: Math.max(0, limit - existing.count), retryAfter };
    }

    // No live window — open a new one. Overwrites any expired row for this key.
    await RateLimit.updateOne(
      { _id: key },
      { $set: { count: 1, resetAt: new Date(now.getTime() + windowMs) } },
      { upsert: true }
    );

    return { ok: true, remaining: limit - 1, retryAfter: windowSeconds };
  } catch (err) {
    // Fail open — see the note at the top of this file.
    console.error("[rate-limit] check failed, allowing request:", err);
    return { ok: true, remaining: limit, retryAfter: windowSeconds };
  }
}

/** Clear a key's counter — call after a successful login so typos don't linger. */
export async function reset(key: string): Promise<void> {
  try {
    await connectDB();
    await RateLimit.deleteOne({ _id: key });
  } catch (err) {
    console.error("[rate-limit] reset failed:", err);
  }
}
