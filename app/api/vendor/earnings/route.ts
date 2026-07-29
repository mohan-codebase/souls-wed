/**
 * VENDOR EARNINGS — GET /api/vendor/earnings
 *
 * The admin has always had a full payout ledger; the partner portal had no
 * equivalent, so a vendor could not see what they had earned, what the platform
 * had deducted, or what had been paid out. See AUDIT-REPORT.md #11.
 *
 * The figures come from `lib/payouts.ts`, the same module the admin ledger
 * uses, so the two views cannot disagree about what a vendor is owed.
 *
 * Read-only by design: a vendor can see their earnings but cannot release their
 * own payout — that stays with the admin.
 */

import { connectDB } from "@/lib/mongodb";
import { Booking } from "@/lib/models/Booking";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { SessionData, sessionOptions } from "@/lib/session";
import { getVendorProviderIds } from "@/lib/booking-access";
import {
  toPayoutRow,
  summarisePayouts,
  PAYABLE_BOOKING_FILTER,
} from "@/lib/payouts";

export async function GET() {
  try {
    const session = await getIronSession<SessionData>(
      await cookies(),
      sessionOptions
    );

    if (!session.isLoggedIn || session.role !== "vendor") {
      return NextResponse.json(
        { message: "Partner access required." },
        { status: 401 }
      );
    }

    await connectDB();

    // Scope to this vendor's listings only — venues AND service listings.
    const providerIds = await getVendorProviderIds(session.userId!);

    const bookings = await Booking.find({
      ...PAYABLE_BOOKING_FILTER,
      providerId: { $in: providerIds },
    })
      .sort({ createdAt: -1 })
      .lean();

    const rows = bookings.map(toPayoutRow);
    const totals = summarisePayouts(rows);

    // What the vendor still has to collect in person, across all their
    // bookings — money the platform never touches.
    const balanceDueAtVenue = rows.reduce((sum, r) => sum + r.balanceDueAtVenue, 0);

    // A simple per-listing breakdown so a partner with several venues can see
    // which ones are actually earning.
    const byListing: Record<
      string,
      { providerId: string; providerName: string; bookings: number; collected: number; net: number }
    > = {};
    for (const r of rows) {
      byListing[r.providerId] ??= {
        providerId: r.providerId,
        providerName: r.providerName,
        bookings: 0,
        collected: 0,
        net: 0,
      };
      byListing[r.providerId].bookings += 1;
      byListing[r.providerId].collected += r.amountPaid;
      byListing[r.providerId].net += r.netVendorPayout;
    }

    return NextResponse.json({
      success: true,
      stats: { ...totals, balanceDueAtVenue },
      earnings: rows,
      byListing: Object.values(byListing).sort((a, b) => b.net - a.net),
    });
  } catch (error: unknown) {
    console.error("Error in GET /api/vendor/earnings:", error);
    return NextResponse.json(
      { message: "Failed to fetch earnings." },
      { status: 500 }
    );
  }
}
