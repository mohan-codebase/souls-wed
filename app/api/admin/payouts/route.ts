import { connectDB } from "@/lib/mongodb";
import { Booking } from "@/lib/models/Booking";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { SessionData, sessionOptions } from "@/lib/session";
import {
  toPayoutRow,
  summarisePayouts,
  PAYABLE_BOOKING_FILTER,
} from "@/lib/payouts";
import { getVendorIdForProvider } from "@/lib/booking-access";

async function checkAdminSession() {
  const session = await getIronSession<SessionData>(
    await cookies(),
    sessionOptions
  );
  if (!session.isLoggedIn || session.role !== "admin") {
    return false;
  }
  return true;
}

export async function GET() {
  try {
    if (!(await checkAdminSession())) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    await connectDB();

    // Only bookings where money was ACTUALLY collected can generate a payout.
    // This previously keyed off `status: confirmed|completed`, which an admin
    // could set by hand — so flipping a dropdown on an unpaid booking queued a
    // real bank transfer to a vendor. Payouts now follow `paymentStatus`.
    const bookings = await Booking.find(PAYABLE_BOOKING_FILTER)
      .sort({ createdAt: -1 })
      .lean();

    // Commission maths lives in lib/payouts.ts so this ledger and the vendor's
    // own earnings screen can never disagree about what a partner is owed.
    const payouts = bookings.map(toPayoutRow);
    const totals = summarisePayouts(payouts);

    // Group by the vendor ACCOUNT, not the listing. The ledger's "Vendor
    // Partner" column showed listing names ("Refinery Hotel New York"), so
    // payouts weren't actually grouped by the party you'd pay.
    const vendorIdByProvider = new Map<string, string>();
    await Promise.all(
      [...new Set(payouts.map((p) => p.providerId))].map(async (pid) => {
        const vid = await getVendorIdForProvider(pid);
        if (vid) vendorIdByProvider.set(pid, vid);
      })
    );

    const byVendor: Record<string, { vendorId: string; rows: string[]; net: number }> = {};
    for (const p of payouts) {
      const vid = vendorIdByProvider.get(p.providerId) || "unassigned";
      byVendor[vid] ??= { vendorId: vid, rows: [], net: 0 };
      byVendor[vid].rows.push(p.bookingId);
      if (p.payoutStatus === "pending") byVendor[vid].net += p.netVendorPayout;
    }

    return NextResponse.json({
      success: true,
      stats: {
        // Legacy key kept so the existing admin UI doesn't break.
        totalGrossVolume: totals.grossBookingVolume,
        ...totals,
      },
      payouts: payouts.map((p) => ({
        ...p,
        vendorAccountId: vendorIdByProvider.get(p.providerId) || null,
      })),
      byVendor: Object.values(byVendor),
    });
  } catch (error: unknown) {
    console.error("Error in GET /api/admin/payouts:", error);
    return NextResponse.json({ message: "Failed to fetch payouts." }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    if (!(await checkAdminSession())) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    await connectDB();
    const body = await req.json();
    const { bookingId, payoutStatus, payoutRef } = body;

    if (!bookingId || !payoutStatus) {
      return NextResponse.json({ message: "Booking ID and payout status are required." }, { status: 400 });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return NextResponse.json({ message: "Booking not found." }, { status: 404 });
    }

    // Last line of defence: never release funds for a booking we were never
    // paid for, however the UI got into this state.
    if (payoutStatus === "released" && booking.paymentStatus !== "paid") {
      return NextResponse.json(
        {
          message:
            "This booking has no recorded payment, so a payout can't be released. Record the payment first.",
        },
        { status: 409 }
      );
    }

    const updateFields: Record<string, unknown> = { payoutStatus };
    if (payoutRef !== undefined) {
      updateFields.payoutRef = payoutRef;
    }

    const updatedBooking = await Booking.findByIdAndUpdate(
      bookingId,
      { $set: updateFields },
      { new: true }
    );

    if (!updatedBooking) {
      return NextResponse.json({ message: "Booking not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, booking: updatedBooking });
  } catch (error: unknown) {
    console.error("Error in PATCH /api/admin/payouts:", error);
    return NextResponse.json({ message: "Failed to update payout status." }, { status: 500 });
  }
}
