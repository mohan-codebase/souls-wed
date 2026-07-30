/**
 * RATE LIMIT — the pure half.
 *
 * Limits, header parsing and the 429 response shape. Deliberately imports
 * NOTHING, so it can be unit-tested directly.
 *
 * The stateful half (`hit`, `reset`) lives in lib/rate-limit.ts because it has
 * to talk to Mongo — and once a module imports `@/lib/...`, Node's type
 * stripping can't resolve the path alias, so it stops being testable without a
 * bundler. Keeping the logic that has no I/O in its own file is what lets the
 * tests reach it.
 *
 * Import from `lib/rate-limit.ts` in application code; it re-exports all of
 * this, so call sites don't need to know about the split.
 */

export interface RateLimitResult {
  ok: boolean;
  /** Attempts left in the current window. */
  remaining: number;
  /** Seconds until the window resets — suitable for a Retry-After header. */
  retryAfter: number;
}

/**
 * Best-effort client IP. Behind a proxy or CDN the socket address is the proxy,
 * so we prefer the forwarding headers.
 *
 * NOTE: `x-forwarded-for` is spoofable unless a trusted proxy overwrites it.
 * Vercel does overwrite it, so this is sound there. On any other host, verify
 * before relying on it. The account-scoped limits don't depend on the IP and
 * are the real backstop either way.
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
  /**
   * Submitting a new password with a reset token. The token itself is 256-bit
   * and unguessable, so this is abuse-limiting rather than anti-brute-force —
   * generous enough that a real user fumbling the password rules isn't blocked.
   */
  RESET_PASSWORD: { limit: 10, windowMs: 15 * 60 * 1000 },
  /**
   * Anonymous page-view pings. Frequent by design (one per detail-page load),
   * so this is a high ceiling that only stops scripted flooding of the
   * PageView collection and analytics inflation.
   */
  VIEW_TRACK: { limit: 100, windowMs: 60 * 1000 },
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
