/**
 * The rate limiter that protects login, OTP verification and the public forms.
 *
 * Note these tests exercise the in-process implementation. If the limiter is
 * ever moved behind Redis (which it must be before running more than one
 * instance — see the header of lib/rate-limit.ts), these tests should keep
 * passing against the new implementation without modification.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { hit, reset, clientIp, LIMITS, tooManyRequests } from "../../lib/rate-limit.ts";

/** Unique key per test so the shared in-process map can't leak between them. */
const key = (name: string) => `test:${name}:${Math.random().toString(36).slice(2)}`;

describe("hit()", () => {
  test("allows exactly `limit` attempts, then blocks", () => {
    const k = key("basic");
    for (let i = 1; i <= 5; i++) {
      assert.equal(hit(k, 5, 60_000).ok, true, `attempt ${i} should be allowed`);
    }
    assert.equal(hit(k, 5, 60_000).ok, false, "6th attempt must be blocked");
  });

  test("reports how many attempts remain", () => {
    const k = key("remaining");
    assert.equal(hit(k, 3, 60_000).remaining, 2);
    assert.equal(hit(k, 3, 60_000).remaining, 1);
    assert.equal(hit(k, 3, 60_000).remaining, 0);
  });

  test("stays blocked once over the limit", () => {
    const k = key("stays-blocked");
    for (let i = 0; i < 10; i++) hit(k, 3, 60_000);
    const result = hit(k, 3, 60_000);
    assert.equal(result.ok, false);
    assert.equal(result.remaining, 0);
  });

  test("returns a positive Retry-After once blocked", () => {
    const k = key("retry-after");
    for (let i = 0; i < 6; i++) hit(k, 5, 60_000);
    const blocked = hit(k, 5, 60_000);
    assert.equal(blocked.ok, false);
    assert.ok(blocked.retryAfter > 0, "must tell the caller when to come back");
    assert.ok(blocked.retryAfter <= 60);
  });

  test("the window expires and access is restored", async () => {
    const k = key("window");
    assert.equal(hit(k, 1, 40).ok, true);
    assert.equal(hit(k, 1, 40).ok, false, "blocked inside the window");
    await new Promise((r) => setTimeout(r, 60));
    assert.equal(hit(k, 1, 40).ok, true, "allowed again after the window");
  });

  test("keys are independent — one account can't lock out another", () => {
    const a = key("iso-a");
    const b = key("iso-b");
    for (let i = 0; i < 6; i++) hit(a, 5, 60_000);
    assert.equal(hit(a, 5, 60_000).ok, false);
    assert.equal(hit(b, 5, 60_000).ok, true, "unrelated key must be unaffected");
  });
});

describe("reset()", () => {
  test("clears a counter, as a successful login does", () => {
    const k = key("reset");
    for (let i = 0; i < 6; i++) hit(k, 5, 60_000);
    assert.equal(hit(k, 5, 60_000).ok, false);

    reset(k);
    assert.equal(hit(k, 5, 60_000).ok, true, "a correct password shouldn't stay penalised");
  });
});

describe("clientIp()", () => {
  const req = (headers: Record<string, string>) => new Request("https://x.test", { headers });

  test("prefers x-forwarded-for and takes the first hop", () => {
    assert.equal(clientIp(req({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" })), "1.2.3.4");
  });

  test("falls back through the other proxy headers", () => {
    assert.equal(clientIp(req({ "x-real-ip": "9.9.9.9" })), "9.9.9.9");
    assert.equal(clientIp(req({ "cf-connecting-ip": "8.8.8.8" })), "8.8.8.8");
  });

  test("degrades to a constant rather than throwing", () => {
    // All requests then share one bucket, which is safe-by-default: it limits
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
});

describe("tooManyRequests()", () => {
  test("returns 429 with a Retry-After header", async () => {
    const res = tooManyRequests("Slow down.", 42);
    assert.equal(res.status, 429);
    assert.equal(res.headers.get("Retry-After"), "42");
    assert.deepEqual(await res.json(), { message: "Slow down." });
  });
});
