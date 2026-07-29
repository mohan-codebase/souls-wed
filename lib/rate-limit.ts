/**
 * RATE LIMITING
 *
 * The app previously had none. `POST /api/auth/login` accepted unlimited
 * attempts, so password brute-force and credential stuffing were wide open;
 * so were `/api/inquiries` and `/api/subscribe` (free outbound email via the
 * platform's own SMTP) and `/api/auth/forgot-password` (mail-bombing any
 * address). See AUDIT-REPORT.md #9.
 *
 * SCOPE AND LIMITATIONS — PLEASE READ
 *
 * This is a fixed-window counter held in the Node process's memory. That is
 * genuinely useful for a single long-running server (which is how this app is
 * deployed today) and costs nothing to run. It is NOT sufficient if you:
 *
 *   - run more than one instance / replica  → each keeps its own counters, so
 *     the effective limit multiplies by the number of instances
 *   - deploy to serverless (Vercel functions, Lambda) → memory is per-invocation
 *     and cold starts reset it, making the limiter close to useless
 *
 * If either becomes true, swap `hit()` for a Redis/Upstash-backed
 * implementation. The call sites don't need to change — only this file does.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Bound the map so a flood of unique keys can't exhaust memory. When we hit the
// ceiling we drop the entries closest to expiry, which are the least useful.
const MAX_TRACKED_KEYS = 20_000;

function evictIfNeeded() {
  if (buckets.size <= MAX_TRACKED_KEYS) return;
  const sorted = [...buckets.entries()].sort((a, b) => a[1].resetAt - b[1].resetAt);
  for (const [key] of sorted.slice(0, Math.ceil(MAX_TRACKED_KEYS * 0.1))) {
    buckets.delete(key);
  }
}

export interface RateLimitResult {
  ok: boolean;
  /** Attempts left in the current window. */
  remaining: number;
  /** Seconds until the window resets — suitable for a Retry-After header. */
  retryAfter: number;
}

/**
 * Record one attempt against `key` and report whether it's allowed.
 *
 * @param key    identity being limited, e.g. `login:ip:1.2.3.4`
 * @param limit  attempts permitted per window
 * @param windowMs  window length in milliseconds
 */
export function hit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    evictIfNeeded();
    return { ok: true, remaining: limit - 1, retryAfter: Math.ceil(windowMs / 1000) };
  }

  bucket.count += 1;
  const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));

  if (bucket.count > limit) {
    return { ok: false, remaining: 0, retryAfter };
  }

  return { ok: true, remaining: limit - bucket.count, retryAfter };
}

/** Clear a key's counter — call after a successful login so one bad day doesn't linger. */
export function reset(key: string): void {
  buckets.delete(key);
}

/**
 * Best-effort client IP. Behind a proxy or CDN the socket address is the proxy,
 * so we prefer the forwarding headers.
 *
 * NOTE: `x-forwarded-for` is trivially spoofable unless a trusted proxy sets it.
 * Make sure your host (Vercel, Cloudflare, nginx) overwrites rather than appends
 * it — otherwise an attacker can rotate the header to dodge IP limits. The
 * account-scoped limits below don't depend on the IP, and are the real backstop.
 */
export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return (
    req.headers.get("x-real-ip") ||
    req.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

/**
 * Shared limits, named so the intent is obvious at the call site.
 * Tuned to be invisible to a real person and painful for a script.
 */
export const LIMITS = {
  /** Password attempts per account. The primary brute-force defence. */
  LOGIN_PER_ACCOUNT: { limit: 5, windowMs: 15 * 60 * 1000 },
  /** Password attempts per IP — catches credential stuffing across many accounts. */
  LOGIN_PER_IP: { limit: 20, windowMs: 15 * 60 * 1000 },
  /** OTP guesses. Tight: a 6-digit code must not be gridable. */
  OTP_VERIFY: { limit: 5, windowMs: 15 * 60 * 1000 },
  /** Reset-link requests, to stop mail-bombing an address. */
  PASSWORD_RESET: { limit: 3, windowMs: 60 * 60 * 1000 },
  /** Account creation per IP. */
  SIGNUP: { limit: 5, windowMs: 60 * 60 * 1000 },
  /** Public forms that trigger outbound email. */
  PUBLIC_FORM: { limit: 5, windowMs: 60 * 60 * 1000 },
} as const;

/** Standard 429 body + Retry-After header. */
export function tooManyRequests(message: string, retryAfter: number): Response {
  return new Response(JSON.stringify({ message }), {
    status: 429,
    headers: {
      "Content-Type": "application/json",
      "Retry-After": String(retryAfter),
    },
  });
}
