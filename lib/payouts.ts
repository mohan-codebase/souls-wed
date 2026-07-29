/**
 * PAYOUT MATHS — ONE DEFINITION, TWO AUDIENCES
 *
 * The admin ledger and the vendor's earnings screen must never disagree about
 * what a vendor is owed. Rather than compute commission in two places and hope
 * they stay in step, both read this file.
 *
 * THE MODEL
 *
 * The platform collects only the advance (30% by default); the balance is
 * settled by the customer directly with the venue. So:
 *
 *   collected          = booking.amountPaid          (what actually reached us)
 *   commission         = 15% of collected            (the platform's cut)
 *   netVendorPayout    = collected − commission      (what we owe the vendor)
 *   balanceDueAtVenue  = totalAmount − collected     (the vendor collects this themselves)
 *
 * Commission is deliberately taken from what was COLLECTED, not from the
 * headline booking value. The earlier implementation paid out
 * `totalAmount − commission`, which scheduled transfers larger than the money
 * the platform was actually holding. See AUDIT-REPORT.md fix log 1.
 *
 * NOTE: this is a commercial rule, not just arithmetic. If the business decides
 * commission should be charged on gross booking value (GMV) rather than on the
 * advance, change COMMISSION_RATE's application here — and only here.
 */

/** Platform commission, taken from the amount collected. */
export const COMMISSION_RATE = 0.15;

export interface PayoutRow {
  bookingId: string;
  providerId: string;
  providerName: string;
  userName: string;
  bookingType: string;
  currency: string;
  /** Headline booking value. */
  totalAmount: number;
  /** The advance we asked for. */
  advanceAmount: number;
  /** What the customer actually paid us. */
  amountPaid: number;
  /** Still owed to the vendor directly by the customer, at the venue. */
  balanceDueAtVenue: number;
  commissionAmount: number;
  netVendorPayout: number;
  payoutStatus: "pending" | "released";
  payoutRef: string;
  paidMethod?: string;
  createdAt?: Date;
  eventDate?: Date;
}

export interface PayoutTotals {
  /** Sum of headline booking values — GMV, for reporting only. */
  grossBookingVolume: number;
  /** Money that actually reached the platform. */
  totalCollected: number;
  totalCommission: number;
  pendingPayoutsAmount: number;
  releasedPayoutsAmount: number;
  commissionRate: number;
  bookingCount: number;
}

/** The minimum shape of a Booking this module needs. */
interface BookingLike {
  _id: unknown;
  providerId?: string | null;
  providerName?: string | null;
  userName?: string | null;
  bookingType?: string | null;
  currency?: string | null;
  totalAmount?: number | null;
  advanceAmount?: number | null;
  amountPaid?: number | null;
  payoutStatus?: string | null;
  payoutRef?: string | null;
  paidMethod?: string | null;
  createdAt?: Date;
  eventDate?: Date | null;
  eventDates?: (Date | string)[] | null;
  checkIn?: Date | null;
}

/** Turn one paid booking into a ledger row. */
export function toPayoutRow(b: BookingLike): PayoutRow {
  const totalAmount = b.totalAmount || 0;
  const collected = b.amountPaid || 0;
  const commissionAmount = Math.round(collected * COMMISSION_RATE);

  return {
    bookingId: String(b._id),
    providerId: b.providerId || "",
    providerName: b.providerName || "—",
    userName: b.userName || "—",
    bookingType: b.bookingType || "",
    currency: b.currency || "INR",
    totalAmount,
    advanceAmount: b.advanceAmount || 0,
    amountPaid: collected,
    balanceDueAtVenue: Math.max(0, totalAmount - collected),
    commissionAmount,
    netVendorPayout: collected - commissionAmount,
    payoutStatus: b.payoutStatus === "released" ? "released" : "pending",
    payoutRef: b.payoutRef || "",
    paidMethod: b.paidMethod || undefined,
    createdAt: b.createdAt,
    eventDate:
      (b.eventDate as Date) ||
      ((b.eventDates?.[0] as Date) ?? undefined) ||
      (b.checkIn as Date) ||
      undefined,
  };
}

/** Roll a set of rows up into headline figures. */
export function summarisePayouts(rows: PayoutRow[]): PayoutTotals {
  const totals: PayoutTotals = {
    grossBookingVolume: 0,
    totalCollected: 0,
    totalCommission: 0,
    pendingPayoutsAmount: 0,
    releasedPayoutsAmount: 0,
    commissionRate: COMMISSION_RATE,
    bookingCount: rows.length,
  };

  for (const r of rows) {
    totals.grossBookingVolume += r.totalAmount;
    totals.totalCollected += r.amountPaid;
    totals.totalCommission += r.commissionAmount;
    if (r.payoutStatus === "released") {
      totals.releasedPayoutsAmount += r.netVendorPayout;
    } else {
      totals.pendingPayoutsAmount += r.netVendorPayout;
    }
  }

  return totals;
}

/**
 * The query that decides which bookings are payable at all.
 *
 * Only money we actually received can be paid out — this is what stops an
 * admin flipping a status and queueing a transfer for a booking nobody paid
 * for. Callers add their own scoping (e.g. a vendor's providerIds).
 */
export const PAYABLE_BOOKING_FILTER = {
  paymentStatus: "paid",
  status: { $in: ["confirmed", "completed"] },
} as const;
