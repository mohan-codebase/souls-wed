/**
 * The money maths. If any of these break, the platform pays out the wrong
 * amount — so this is the most important file in the suite.
 *
 * Run: npm run test:unit
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  COMMISSION_RATE,
  toPayoutRow,
  summarisePayouts,
  PAYABLE_BOOKING_FILTER,
} from "../../lib/payouts.ts";

/** A booking as the payout code expects to receive it. */
const booking = (over: Record<string, unknown> = {}) => ({
  _id: "booking-1",
  providerId: "venue-refinery-1",
  providerName: "Refinery Hotel New York",
  userName: "Test Customer",
  bookingType: "venue",
  currency: "INR",
  totalAmount: 100000,
  advanceAmount: 30000,
  amountPaid: 30000,
  payoutStatus: "pending",
  ...over,
});

describe("payout row", () => {
  test("commission comes off what was COLLECTED, not the headline value", () => {
    // The original bug: payouts were `totalAmount - commission`, which
    // scheduled a transfer larger than the money the platform was holding.
    const row = toPayoutRow(booking());

    assert.equal(row.amountPaid, 30000);
    assert.equal(row.commissionAmount, 4500); // 15% of 30,000 — NOT of 100,000
    assert.equal(row.netVendorPayout, 25500);

    // The payout must never exceed what we actually collected.
    assert.ok(
      row.netVendorPayout <= row.amountPaid,
      "payout must not exceed collected funds"
    );
  });

  test("the balance the customer still owes is reported, not paid out", () => {
    const row = toPayoutRow(booking());
    assert.equal(row.balanceDueAtVenue, 70000);
    // That 70k is settled directly with the venue — it must not appear in the
    // payout figure.
    assert.equal(row.netVendorPayout, 25500);
  });

  test("an unpaid booking yields a zero payout, never a negative one", () => {
    const row = toPayoutRow(booking({ amountPaid: 0 }));
    assert.equal(row.commissionAmount, 0);
    assert.equal(row.netVendorPayout, 0);
    assert.equal(row.balanceDueAtVenue, 100000);
  });

  test("overpayment doesn't produce a negative balance due", () => {
    const row = toPayoutRow(booking({ amountPaid: 120000 }));
    assert.equal(row.balanceDueAtVenue, 0, "clamped at zero, not -20000");
  });

  test("missing money fields are treated as zero, not NaN", () => {
    const row = toPayoutRow({ _id: "x" });
    assert.equal(row.totalAmount, 0);
    assert.equal(row.amountPaid, 0);
    assert.equal(row.commissionAmount, 0);
    assert.equal(row.netVendorPayout, 0);
    assert.ok(!Number.isNaN(row.netVendorPayout));
  });

  test("commission rounds rather than leaving fractional paise", () => {
    const row = toPayoutRow(booking({ amountPaid: 33333 }));
    assert.equal(row.commissionAmount, Math.round(33333 * COMMISSION_RATE));
    assert.ok(Number.isInteger(row.commissionAmount));
    // Commission + payout must reconstitute the collected amount exactly,
    // or money goes missing in the rounding.
    assert.equal(row.commissionAmount + row.netVendorPayout, 33333);
  });

  test("payoutStatus is normalised — anything unknown counts as pending", () => {
    assert.equal(toPayoutRow(booking({ payoutStatus: "released" })).payoutStatus, "released");
    assert.equal(toPayoutRow(booking({ payoutStatus: undefined })).payoutStatus, "pending");
    assert.equal(toPayoutRow(booking({ payoutStatus: "nonsense" })).payoutStatus, "pending");
  });
});

describe("payout totals", () => {
  test("pending and released are kept apart", () => {
    const rows = [
      toPayoutRow(booking({ _id: "a", amountPaid: 30000, payoutStatus: "pending" })),
      toPayoutRow(booking({ _id: "b", amountPaid: 10000, payoutStatus: "released" })),
    ];
    const totals = summarisePayouts(rows);

    assert.equal(totals.pendingPayoutsAmount, 30000 - 4500);
    assert.equal(totals.releasedPayoutsAmount, 10000 - 1500);
    assert.equal(totals.totalCollected, 40000);
    assert.equal(totals.totalCommission, 6000);
    assert.equal(totals.bookingCount, 2);
  });

  test("gross volume is reported separately from money collected", () => {
    // Conflating these is what produced revenue the platform never received.
    const totals = summarisePayouts([
      toPayoutRow(booking({ totalAmount: 100000, amountPaid: 30000 })),
    ]);
    assert.equal(totals.grossBookingVolume, 100000);
    assert.equal(totals.totalCollected, 30000);
    assert.notEqual(totals.grossBookingVolume, totals.totalCollected);
  });

  test("empty ledger totals to zero, not NaN", () => {
    const totals = summarisePayouts([]);
    assert.equal(totals.totalCollected, 0);
    assert.equal(totals.pendingPayoutsAmount, 0);
    assert.equal(totals.bookingCount, 0);
  });

  test("commission never exceeds what was collected across a whole ledger", () => {
    const rows = [1, 7, 999, 12345, 100000].map((amt, i) =>
      toPayoutRow(booking({ _id: `b${i}`, amountPaid: amt }))
    );
    const totals = summarisePayouts(rows);
    assert.ok(totals.totalCommission < totals.totalCollected);
    assert.equal(
      totals.totalCommission + totals.pendingPayoutsAmount + totals.releasedPayoutsAmount,
      totals.totalCollected,
      "commission + payouts must exactly equal collected"
    );
  });
});

describe("payable filter", () => {
  test("only paid bookings are payable", () => {
    // This is the guard that stops an admin flipping a status and queueing a
    // transfer for a booking nobody paid for.
    assert.equal(PAYABLE_BOOKING_FILTER.paymentStatus, "paid");
    assert.deepEqual(PAYABLE_BOOKING_FILTER.status, { $in: ["confirmed", "completed"] });
  });
});
