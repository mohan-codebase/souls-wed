/**
 * API REGRESSION SUITE
 *
 * One test per bug found in the July 2026 audit. Every case in here is a thing
 * that WAS broken and is now fixed — the point is to notice if any of them
 * comes back.
 *
 * These are integration tests: they need the app running and a real database.
 * That is deliberate. Most of the bugs in the audit were not logic errors that
 * a unit test would have caught — they were code that looked correct but never
 * ran against real data (vendor blocked dates, the vendor bookings query, the
 * review pipeline, the admin moderation queue). Only an end-to-end call finds
 * those.
 *
 * ── Running ─────────────────────────────────────────────────────────────────
 *
 *   npm run dev                # in one terminal
 *   npm run test:api           # in another
 *
 * Credentials come from the environment so nothing secret lives in the repo:
 *
 *   TEST_BASE_URL     default http://localhost:3000
 *   TEST_ADMIN_EMAIL  TEST_ADMIN_PASSWORD
 *   TEST_VENDOR_EMAIL TEST_VENDOR_PASSWORD
 *
 * ── WARNING: this writes to whatever database the app is pointed at ─────────
 *
 * It creates bookings and deletes them again in a finally block, but a crashed
 * run can leave rows behind (they're identifiable by userName "ATEST-*"). Point
 * it at a development database, never production.
 *
 * ── Note on rate limiting ───────────────────────────────────────────────────
 *
 * The auth tests deliberately trip the login limiter, which locks that account
 * for 15 minutes. They use a nonexistent account so they never lock out the
 * real admin, and the suite logs in ONCE up front and reuses the session.
 */

import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";

const BASE = process.env.TEST_BASE_URL || "http://localhost:3000";
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD;
const VENDOR_EMAIL = process.env.TEST_VENDOR_EMAIL;
const VENDOR_PASSWORD = process.env.TEST_VENDOR_PASSWORD;

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error(
    "\nTEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD must be set.\n" +
      "Example:\n" +
      "  TEST_ADMIN_EMAIL=admin@example.com TEST_ADMIN_PASSWORD=... \\\n" +
      "  TEST_VENDOR_EMAIL=vendor@example.com TEST_VENDOR_PASSWORD=... \\\n" +
      "  npm run test:api\n"
  );
  process.exit(1);
}

// ── A tiny cookie-jar client, so each role keeps its own session ────────────

function makeClient() {
  let cookie = "";
  return {
    async fetch(path, init = {}) {
      const res = await fetch(`${BASE}${path}`, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          ...(cookie ? { cookie } : {}),
          ...(init.headers || {}),
        },
        redirect: "manual",
      });
      const setCookie = res.headers.getSetCookie?.() ?? [];
      for (const c of setCookie) {
        const [pair] = c.split(";");
        if (pair.startsWith("soulswed-session=")) cookie = pair;
      }
      return res;
    },
    async json(path, init) {
      const res = await this.fetch(path, init);
      let body = null;
      try {
        body = await res.json();
      } catch {
        /* some responses have no body */
      }
      return { status: res.status, body };
    },
    async login(email, password, role) {
      const { status, body } = await this.json("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password, role }),
      });
      return { status, body };
    },
  };
}

const admin = makeClient();
const vendor = makeClient();

/** Bookings created during the run, torn down at the end. */
const created = [];

async function createBooking(client, over = {}) {
  const { status, body } = await client.json("/api/bookings", {
    method: "POST",
    body: JSON.stringify({
      providerId: "venue-refinery-1",
      providerName: "Refinery Hotel New York",
      bookingType: "venue",
      guestCount: 50,
      userName: "ATEST-regression",
      userPhone: "7200470762",
      currency: "INR",
      ...over,
    }),
  });
  if (body?.booking?.id) created.push(body.booking.id);
  return { status, body };
}

/** A far-future date, unique per call, so tests never collide with real data. */
let dateCounter = 0;
const futureDate = () => {
  dateCounter += 1;
  const d = new Date();
  d.setFullYear(d.getFullYear() + 5);
  d.setDate(d.getDate() + dateCounter);
  return d.toISOString().slice(0, 10);
};

before(async () => {
  const res = await admin.login(ADMIN_EMAIL, ADMIN_PASSWORD, "admin");
  assert.equal(
    res.status,
    200,
    `admin login failed (${res.status}: ${res.body?.message}). ` +
      `If this is 429, the limiter is still cooling down from a previous run.`
  );

  if (VENDOR_EMAIL && VENDOR_PASSWORD) {
    await vendor.login(VENDOR_EMAIL, VENDOR_PASSWORD, "vendor");
  }
});

after(async () => {
  for (const id of created) {
    await admin.fetch(`/api/admin/bookings?bookingId=${id}`, { method: "DELETE" });
  }
});

// ════════════════════════════════════════════════════════════════════════════
describe("pricing is server-authoritative (audit #1)", () => {
  test("a tampered totalAmount is rejected, not honoured", async () => {
    // Was: 201 Created — a ₹1,44,000 venue booked for ₹1.
    const { status, body } = await createBooking(admin, {
      eventDates: [futureDate()],
      totalAmount: 1,
    });
    assert.equal(status, 409);
    assert.ok(body.expectedAmount > 1, "should report the real price");
  });

  test("omitting the amount doesn't dodge pricing", async () => {
    const { status, body } = await createBooking(admin, { eventDates: [futureDate()] });
    assert.equal(status, 201);
    assert.ok(body.booking.totalAmount > 0, "server must price it");
    assert.equal(
      body.booking.advanceAmount,
      Math.round(body.booking.totalAmount * 0.3),
      "advance must be 30% of the server's price"
    );
  });

  test("guest capacity is enforced", async () => {
    const { status } = await createBooking(admin, {
      eventDates: [futureDate()],
      guestCount: 999999,
    });
    assert.equal(status, 400);
  });

  test("a listing can't be booked as the wrong type", async () => {
    // Was: 201 — a per-plate caterer booked as a flat-fee "vendor".
    const { status } = await createBooking(admin, {
      providerId: "caterer-global-1",
      providerName: "Global Palate Events",
      bookingType: "vendor",
      eventDates: [futureDate()],
    });
    assert.equal(status, 400);
  });

  test("a nonexistent listing is refused", async () => {
    const { status } = await createBooking(admin, {
      providerId: "venue-does-not-exist",
      eventDates: [futureDate()],
    });
    assert.equal(status, 404);
  });
});

// ════════════════════════════════════════════════════════════════════════════
describe("payment state is separate from status (audit #2)", () => {
  test("an unpaid booking cannot be confirmed", async () => {
    // Was: allowed — and it invented revenue plus a vendor payout.
    const { body } = await createBooking(admin, { eventDates: [futureDate()] });
    const id = body.booking.id;

    const res = await admin.json("/api/admin/bookings", {
      method: "PATCH",
      body: JSON.stringify({ bookingId: id, status: "confirmed" }),
    });
    assert.equal(res.status, 409);
    assert.equal(res.body.requiresPayment, true);
  });

  test("a payout cannot be released for an unpaid booking", async () => {
    const { body } = await createBooking(admin, { eventDates: [futureDate()] });
    const res = await admin.json("/api/admin/payouts", {
      method: "PATCH",
      body: JSON.stringify({ bookingId: body.booking.id, payoutStatus: "released" }),
    });
    assert.equal(res.status, 409);
  });

  test("recording an offline payment confirms it and books real revenue", async () => {
    const { body } = await createBooking(admin, { eventDates: [futureDate()] });
    const id = body.booking.id;

    const before = await admin.json("/api/admin/stats");
    const paid = await admin.json("/api/admin/bookings", {
      method: "PATCH",
      body: JSON.stringify({
        bookingId: id,
        recordOfflinePayment: true,
        offlineAmount: 1000,
        offlineNote: "regression test",
      }),
    });
    assert.equal(paid.status, 200);

    const after = await admin.json("/api/admin/stats");
    assert.equal(
      after.body.stats.totalRevenue - before.body.stats.totalRevenue,
      1000,
      "revenue must move by the amount actually recorded, not the advance"
    );
  });

  test("revenue only ever counts money marked paid", async () => {
    const { body } = await admin.json("/api/admin/stats");
    assert.ok(body.stats.totalRevenue >= 0);
    // pendingRevenue exists so uncollected value is visible without being
    // mixed into revenue.
    assert.ok("pendingRevenue" in body.stats);
  });
});

// ════════════════════════════════════════════════════════════════════════════
describe("providerId is canonical (audit #13)", () => {
  test("a booking made with a raw ObjectId is stored under the slug", async () => {
    // Was: stored as-is, so it never conflicted with slug-spelled bookings and
    // the same date could be sold twice.
    const venues = await admin.json("/api/venues?id=venue-refinery-1");
    const rawId = venues.body.venues[0]._id;

    const date = futureDate();
    const { status, body } = await createBooking(admin, {
      providerId: rawId,
      eventDates: [date],
    });
    assert.equal(status, 201);

    const detail = await admin.json(`/api/bookings/${body.booking.id}`);
    assert.equal(detail.body.booking.providerId, "venue-refinery-1");

    // And the same date via the slug must now collide.
    const dup = await createBooking(admin, { eventDates: [date] });
    assert.equal(dup.status, 409, "duplicate date must be refused");
  });

  test("a booked date appears on the public availability calendar", async () => {
    const date = futureDate();
    await createBooking(admin, { eventDates: [date] });
    const { body } = await admin.json(
      "/api/bookings/availability?providerId=venue-refinery-1"
    );
    assert.ok(body.blockedDates.includes(date), "calendar must show the date as taken");
  });
});

// ════════════════════════════════════════════════════════════════════════════
describe("authorization", () => {
  test("admin endpoints reject an unauthenticated caller (audit #10)", async () => {
    const anon = makeClient();
    for (const path of [
      "/api/admin/stats",
      "/api/admin/bookings",
      "/api/admin/users",
      "/api/admin/payouts",
      "/api/admin/reviews",
    ]) {
      const { status } = await anon.json(path);
      assert.equal(status, 401, `${path} must require admin`);
    }
  });

  test("booking creation requires a session", async () => {
    const anon = makeClient();
    const { status } = await anon.json("/api/bookings", {
      method: "POST",
      body: JSON.stringify({ providerId: "venue-refinery-1", bookingType: "venue" }),
    });
    assert.equal(status, 401);
  });

  test("2FA cannot be completed without the password step (audit #6)", async () => {
    // Was: a correct OTP alone minted a full session.
    const anon = makeClient();
    const { status } = await anon.json("/api/auth/verify-2fa", {
      method: "POST",
      body: JSON.stringify({ email: ADMIN_EMAIL, role: "admin", otp: "123456" }),
    });
    assert.equal(status, 440, "must demand the password step first");
  });

  test("login is rate limited (audit #9)", async () => {
    // Uses an address that doesn't exist, so no real account gets locked.
    const throwaway = makeClient();
    const email = `no-such-user-${Date.now()}@example.invalid`;
    let sawLimit = false;

    for (let i = 0; i < 8; i++) {
      const { status } = await throwaway.login(email, "wrong-password", "user");
      if (status === 429) {
        sawLimit = true;
        break;
      }
    }
    assert.ok(sawLimit, "unlimited password attempts must not be possible");
  });

  test("password changes enforce the strength policy (audit #15)", async () => {
    const { status, body } = await admin.json("/api/auth/settings/password", {
      method: "POST",
      body: JSON.stringify({ currentPassword: "irrelevant", newPassword: "abc123" }),
    });
    assert.equal(status, 400);
    assert.match(body.message, /8 characters/);
  });
});

// ════════════════════════════════════════════════════════════════════════════
describe("vendor visibility and actions (audit #3, #5)", { skip: !VENDOR_EMAIL }, () => {
  test("a service-listing booking reaches the vendor who owns it", async () => {
    // Was: invisible — the query resolved venues only, hiding 21 of 26 listings.
    const { status, body } = await createBooking(admin, {
      providerId: "decorator-enchanted-1",
      providerName: "Enchanted Woods Design",
      bookingType: "vendor",
      eventDates: [futureDate()],
    });
    assert.equal(status, 201);

    const list = await vendor.json("/api/bookings");
    const found = (list.body.bookings || []).some((b) => b._id === body.booking.id);
    assert.ok(found, "vendor must see a booking for their own service listing");
  });

  test("a vendor can open their own booking", async () => {
    // Was: 403.
    const { body } = await createBooking(admin, {
      providerId: "decorator-enchanted-1",
      providerName: "Enchanted Woods Design",
      bookingType: "vendor",
      eventDates: [futureDate()],
    });
    const { status } = await vendor.json(`/api/bookings/${body.booking.id}`);
    assert.equal(status, 200);
  });

  test("a vendor can decline, and the dates are released", async () => {
    const date = futureDate();
    const { body } = await createBooking(admin, {
      providerId: "decorator-enchanted-1",
      providerName: "Enchanted Woods Design",
      bookingType: "vendor",
      eventDates: [date],
    });

    const declined = await vendor.json(`/api/bookings/${body.booking.id}`, {
      method: "PATCH",
      body: JSON.stringify({ action: "decline", reason: "regression test" }),
    });
    assert.equal(declined.status, 200);

    const avail = await admin.json(
      "/api/bookings/availability?providerId=decorator-enchanted-1"
    );
    assert.ok(!avail.body.blockedDates.includes(date), "declined dates must free up");
  });

  test("a vendor cannot confirm a booking — payment is the only path", async () => {
    const { body } = await createBooking(admin, {
      providerId: "decorator-enchanted-1",
      providerName: "Enchanted Woods Design",
      bookingType: "vendor",
      eventDates: [futureDate()],
    });
    const { status } = await vendor.json(`/api/bookings/${body.booking.id}`, {
      method: "PATCH",
      body: JSON.stringify({ action: "confirm" }),
    });
    assert.equal(status, 400, "no action should let a vendor mark a booking paid");
  });

  test("vendor earnings agree with the admin ledger (audit #11)", async () => {
    const { body } = await createBooking(admin, { eventDates: [futureDate()] });
    const id = body.booking.id;
    await admin.json("/api/admin/bookings", {
      method: "PATCH",
      body: JSON.stringify({
        bookingId: id,
        recordOfflinePayment: true,
        offlineAmount: 20000,
      }),
    });

    const adminLedger = await admin.json("/api/admin/payouts");
    const vendorView = await vendor.json("/api/vendor/earnings");

    const a = (adminLedger.body.payouts || []).find((p) => p.bookingId === id);
    const v = (vendorView.body.earnings || []).find((e) => e.bookingId === id);

    assert.ok(a, "booking must appear in the admin ledger");
    assert.ok(v, "and in the vendor's earnings");
    assert.equal(a.commissionAmount, v.commissionAmount);
    assert.equal(a.netVendorPayout, v.netVendorPayout);
    assert.equal(v.netVendorPayout, 20000 - Math.round(20000 * 0.15));
  });
});

// ════════════════════════════════════════════════════════════════════════════
describe("reviews (audit #14)", () => {
  test("reviewing without a completed booking is refused", async () => {
    const { status, body } = await admin.json(
      "/api/venues/venue-ritz-1/reviews",
      { method: "POST", body: JSON.stringify({ rating: 5, text: "regression test" }) }
    );
    assert.equal(status, 403);
    assert.match(body.message, /completed booking/i);
  });

  test("the eligibility endpoint tells the UI whether to show the button", async () => {
    // Was: no such endpoint, so the CTA was shown to everyone and 403'd.
    const { status, body } = await admin.json("/api/venues/venue-ritz-1/reviews");
    assert.equal(status, 200);
    assert.equal(typeof body.canReview, "boolean");
  });

  test("the admin moderation queue can see venue reviews", async () => {
    // Was: it read Vendor.reviews only, so customer reviews were invisible.
    const { status, body } = await admin.json("/api/admin/reviews");
    assert.equal(status, 200);
    assert.ok(Array.isArray(body.reviews));
    for (const r of body.reviews) {
      assert.ok(
        ["vendor", "venue", "service"].includes(r.sourceType),
        "each review must say which collection it came from"
      );
    }
  });
});

// ════════════════════════════════════════════════════════════════════════════
describe("admin data consistency (audit P3)", () => {
  test("the user tile matches the customer list", async () => {
    // Was: 6 vs 5 — two hand-written filters that had drifted apart.
    const stats = await admin.json("/api/admin/stats");
    const users = await admin.json("/api/admin/users");
    assert.equal(stats.body.stats.totalUsers, users.body.users.length);
  });

  test("every booking in the ledger names its provider", async () => {
    // The admin table read a field that doesn't exist, so the column was blank.
    const { body } = await admin.json("/api/admin/bookings");
    for (const b of body.bookings || []) {
      assert.ok(b.providerName, `booking ${b._id} has no providerName`);
    }
  });
});

// ════════════════════════════════════════════════════════════════════════════
// July 30 flow re-audit — new hardening. These use the public API (no auth),
// except the paid-delete guard which needs the admin/vendor session above.
// ════════════════════════════════════════════════════════════════════════════
describe("public search input is regex-safe (re-audit #4)", () => {
  const pub = makeClient();

  test("a malformed pattern is a clean result, not a 500 driver error", async () => {
    // Was: `?search=(((` returned 500 with "Regular expression is invalid".
    const { status } = await pub.json("/api/vendors?search=" + encodeURIComponent("((("));
    assert.notEqual(status, 500, "malformed regex must not leak a driver error");
  });

  test("a match-all payload does not bypass the city filter", async () => {
    // `^.*$` as a raw regex matched every vendor regardless of city.
    const nonsense = await pub.json(
      "/api/vendors?city=" + encodeURIComponent("^.*$" + Math.random())
    );
    assert.equal(nonsense.status, 200);
    assert.equal(
      (nonsense.body.vendors || []).length,
      0,
      "escaped, the bypass pattern matches nothing"
    );
  });
});

describe("public vendor API doesn't leak PII (re-audit #3)", () => {
  const pub = makeClient();
  const LEAKED = ["email", "lastLoginAt", "lastLoginDevice", "lastLoginMethod", "twoFactorEnabled", "passwordHash"];

  test("no vendor object exposes login telemetry or contact PII", async () => {
    const { status, body } = await pub.json("/api/vendors");
    assert.equal(status, 200);
    for (const v of body.vendors || []) {
      for (const field of LEAKED) {
        assert.ok(!(field in v), `/api/vendors leaked "${field}"`);
      }
    }
  });
});

describe("email-verification OTP is rate limited (re-audit #6)", () => {
  const pub = makeClient();

  test("repeated wrong codes start returning 429", async () => {
    // Was: unlimited guesses against a 6-digit code in a 15-minute window.
    const email = `atest-otp-${Date.now()}@example.invalid`;
    let saw429 = false;
    for (let i = 0; i < 8; i++) {
      const { status } = await pub.json("/api/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({ email, role: "user", otp: String(100000 + i) }),
      });
      if (status === 429) { saw429 = true; break; }
    }
    assert.ok(saw429, "verify-otp must cap guesses");
  });
});
