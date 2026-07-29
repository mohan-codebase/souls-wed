import { connectDB } from "@/lib/mongodb";
import { Booking } from "@/lib/models/Booking";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { SessionData, sessionOptions } from "@/lib/session";
import { getVendorEmailForProvider } from "@/lib/booking-access";
import {
  sendBookingConfirmedEmails,
  sendBookingCancelledEmails,
  dispatch,
} from "@/lib/mail";

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
    const bookings = await Booking.find({}).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, bookings });
  } catch (error: unknown) {
    console.error("Error in GET /api/admin/bookings:", error);
    return NextResponse.json({ message: "Failed to fetch bookings." }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn || session.role !== "admin") {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    await connectDB();
    const body = await req.json();
    const { bookingId, status, recordOfflinePayment, offlineAmount, offlineNote } = body;

    if (!bookingId) {
      return NextResponse.json({ message: "Booking ID is required." }, { status: 400 });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return NextResponse.json({ message: "Booking not found." }, { status: 404 });
    }

    // ── Explicit "we were paid outside Stripe" action ──
    // This is the ONLY way an admin can mark a booking paid. It's deliberately
    // a separate, named operation rather than a side effect of changing status,
    // and it records who did it so the money has an audit trail.
    if (recordOfflinePayment) {
      const amount = Number(offlineAmount);
      if (!Number.isFinite(amount) || amount <= 0) {
        return NextResponse.json(
          { message: "A positive payment amount is required to record an offline payment." },
          { status: 400 }
        );
      }
      booking.paymentStatus = "paid";
      booking.amountPaid = amount;
      booking.paidAt = new Date();
      booking.paidMethod = "offline";
      booking.paidRecordedBy = session.email || session.userId || "admin";
      booking.paidNote = String(offlineNote || "").slice(0, 500);
      if (booking.status === "pending") booking.status = "confirmed";
      await booking.save();

      dispatch(
        getVendorEmailForProvider(booking.providerId).then((vendorEmail) =>
          sendBookingConfirmedEmails(booking.toObject(), vendorEmail ?? undefined)
        ),
        "booking-confirmed (offline payment)"
      );

      return NextResponse.json({
        success: true,
        message: `Offline payment of ${amount} recorded. Booking confirmed.`,
        booking,
      });
    }

    if (!status) {
      return NextResponse.json({ message: "A status is required." }, { status: 400 });
    }

    const validStatuses = ["pending", "confirmed", "completed", "cancelled"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ message: "Invalid status." }, { status: 400 });
    }

    // "Confirmed" and "completed" mean the booking is financially live — they
    // feed the payout ledger. Neither may be set on a booking we haven't been
    // paid for. Use the offline-payment action above if money arrived by bank
    // transfer or cash.
    if (
      (status === "confirmed" || status === "completed") &&
      booking.paymentStatus !== "paid"
    ) {
      return NextResponse.json(
        {
          message:
            "This booking hasn't been paid for yet. Record the payment first, or leave it pending.",
          requiresPayment: true,
        },
        { status: 409 }
      );
    }

    const previousStatus = booking.status;
    booking.status = status;
    if (status === "cancelled" && previousStatus !== "cancelled") {
      booking.cancelledBy = "admin";
      booking.cancelledAt = new Date();
    }
    await booking.save();

    if (status === "cancelled" && previousStatus !== "cancelled") {
      dispatch(
        getVendorEmailForProvider(booking.providerId).then((vendorEmail) =>
          sendBookingCancelledEmails(booking.toObject(), vendorEmail ?? undefined)
        ),
        "booking-cancelled (admin)"
      );
    }

    return NextResponse.json({
      success: true,
      message: `Booking status updated to ${status} successfully.`,
      booking,
    });
  } catch (error: unknown) {
    console.error("Error in PATCH /api/admin/bookings:", error);
    return NextResponse.json({ message: "Failed to update booking status." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    if (!(await checkAdminSession())) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    await connectDB();
    const { searchParams } = new URL(req.url);
    const bookingId = searchParams.get("bookingId");

    if (!bookingId) {
      return NextResponse.json({ message: "Booking ID is required." }, { status: 400 });
    }

    const deletedBooking = await Booking.findByIdAndDelete(bookingId);

    if (!deletedBooking) {
      return NextResponse.json({ message: "Booking not found." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Booking deleted successfully.",
    });
  } catch (error: unknown) {
    console.error("Error in DELETE /api/admin/bookings:", error);
    return NextResponse.json({ message: "Failed to delete booking." }, { status: 500 });
  }
}
