/**
 * Rate limiter — the parts that don't touch the database.
 *
 * `hit()` and `reset()` are NOT tested here. They were, while the limiter kept
 * counters in process memory; they now read and write Mongo, because in-memory
 * counters are useless on Vercel (each serverless invocation gets fresh memory,
 * so the limit never accumulates). Testing them needs a live database, so their
 * behaviour is covered end-to-end instead — see the "login is rate limited"
 * case in tests/api/regression.test.mjs, which hammers the real endpoint and
 * asserts it starts returning 429.
 *
 * What's left here is genuinely pure: header parsing, the configured limits,
 * and the 429 response shape.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { clientIp, LIMITS, tooManyRequests } from "../../lib/rate-limit-config.ts";

describe("clientIp()", () => {
  const req = (headers: Record<string, string>) => new Request("https://x.test", { headers });

  test("prefers x-forwarded-for and takes the first hop", () => {
    // The first entry is the original client; later ones are proxies.
    assert.equal(clientIp(req({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" })), "1.2.3.4");
  });

  test("trims whitespace around the address", () => {
    assert.equal(clientIp(req({ "x-forwarded-for": "  1.2.3.4  , 5.6.7.8" })), "1.2.3.4");
  });

  test("falls back through the other proxy headers", () => {
    assert.equal(clientIp(req({ "x-real-ip": "9.9.9.9" })), "9.9.9.9");
    assert.equal(clientIp(req({ "cf-connecting-ip": "8.8.8.8" })), "8.8.8.8");
  });

  test("degrades to a constant rather than throwing", () => {
    // All callers then share one bucket, which is safe-by-default: it limits
    // more aggressively, never less.
    assert.equal(clientIp(req({})), "unknown");
  });
});

describe("configured limits", () => {
  test("login and OTP limits are tight enough to matter", () => {
    assert.ok(LIMITS.LOGIN_PER_ACCOUNT.limit <= 10, "brute-force window too generous");
    assert.ok(LIMITS.OTP_VERIFY.limit <= 10, "a 6-digit code must not be gridable");
    assert.ok(LIMITS.LOGIN_PER_ACCOUNT.windowMs >= 5 * 60_000);
  });

  test("per-IP login allowance is looser than per-account", () => {
    // Several people can share an office IP; one account is one person.
    assert.ok(LIMITS.LOGIN_PER_IP.limit > LIMITS.LOGIN_PER_ACCOUNT.limit);
  });

  test("every limit is a positive number with a real window", () => {
    for (const [name, cfg] of Object.entries(LIMITS)) {
      assert.ok(cfg.limit > 0, `${name} limit must be positive`);
      assert.ok(cfg.windowMs > 0, `${name} window must be positive`);
    }
  });
});

describe("tooManyRequests()", () => {
  test("returns 429 with a Retry-After header", async () => {
    const res = tooManyRequests("Slow down.", 42);
    assert.equal(res.status, 429);
    assert.equal(res.headers.get("Retry-After"), "42");
    assert.equal(res.headers.get("Content-Type"), "application/json");
    assert.deepEqual(await res.json(), { message: "Slow down." });
  });
});
