import { connectDB } from "@/lib/mongodb";
import { Booking } from "@/lib/models/Booking";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { SessionData, sessionOptions } from "@/lib/session";

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

export async function GET(req: Request) {
  try {
    if (!(await checkAdminSession())) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    await connectDB();

    // Only bookings where money was ACTUALLY collected can generate a payout.
    // This previously keyed off `status: confirmed|completed`, which an admin
    // could set by hand — so flipping a dropdown on an unpaid booking queued a
    // real bank transfer to a vendor. Payouts now follow `paymentStatus`.
    const bookings = await Booking.find({
      paymentStatus: "paid",
      status: { $in: ["confirmed", "completed"] },
    }).sort({ createdAt: -1 });

    const COMMISSION_RATE = 0.15; // 15% platform commission

    let totalGrossVolume = 0;   // headline booking value (GMV), for reporting
    let totalCollected = 0;     // what actually landed in the platform account
    let totalCommission = 0;
    let pendingPayoutsAmount = 0;
    let releasedPayoutsAmount = 0;

    const payouts = bookings.map((b) => {
      const gross = b.totalAmount || 0;
      const collected = b.amountPaid || 0;

      // Commission and payout are both derived from what we COLLECTED, not from
      // the headline booking value. The platform only ever holds the advance —
      // the balance is settled by the customer directly at the venue — so
      // paying out `gross - commission` would transfer money we never received.
      const commission = Math.round(collected * COMMISSION_RATE);
      const netVendorPayout = collected - commission;
      const balanceDueAtVenue = Math.max(0, gross - collected);
      const payoutStatus = b.payoutStatus || "pending";

      totalGrossVolume += gross;
      totalCollected += collected;
      totalCommission += commission;

      if (payoutStatus === "released") {
        releasedPayoutsAmount += netVendorPayout;
      } else {
        pendingPayoutsAmount += netVendorPayout;
      }

      return {
        bookingId: b._id,
        providerName: b.providerName,
        userName: b.userName,
        bookingType: b.bookingType,
        totalAmount: gross,
        advanceAmount: b.advanceAmount,
        amountPaid: collected,
        balanceDueAtVenue,
        commissionAmount: commission,
        netVendorPayout: netVendorPayout,
        payoutStatus: payoutStatus,
        payoutRef: b.payoutRef || "",
        createdAt: b.createdAt,
        eventDate: b.eventDate || (b.eventDates && b.eventDates[0]) || b.checkIn,
      };
    });

    return NextResponse.json({
      success: true,
      stats: {
        totalGrossVolume,
        totalCollected,
        totalCommission,
        pendingPayoutsAmount,
        releasedPayoutsAmount,
        commissionRate: COMMISSION_RATE,
      },
      payouts,
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

    const updateFields: Record<string, any> = { payoutStatus };
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
