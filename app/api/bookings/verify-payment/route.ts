import { connectDB } from "@/lib/mongodb";
import { Booking } from "@/lib/models/Booking";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { SessionData, sessionOptions } from "@/lib/session";
import { getStripe } from "@/lib/stripe";
import { convertINRTo } from "@/lib/currency";

export async function POST(req: Request) {
  try {
    const session = await getIronSession<SessionData>(
      await cookies(),
      sessionOptions
    );

    if (!session.isLoggedIn) {
      return NextResponse.json(
        { message: "Authentication required." },
        { status: 401 }
      );
    }

    const { stripe_session_id, bookingId } = await req.json();

    if (!bookingId) {
      return NextResponse.json(
        { message: "Booking ID is required." },
        { status: 400 }
      );
    }

    if (!stripe_session_id) {
      return NextResponse.json(
        { message: "Missing Stripe session ID." },
        { status: 400 }
      );
    }

    // Verify the payment with Stripe
    const stripe = getStripe();
    const stripeSession = await stripe.checkout.sessions.retrieve(stripe_session_id);

    if (stripeSession.payment_status !== "paid") {
      return NextResponse.json(
        { message: "Stripe payment not completed." },
        { status: 400 }
      );
    }

    // The session must have been created FOR THIS BOOKING. Without this check,
    // any paid session id from this Stripe account could be replayed to confirm
    // an unrelated booking (e.g. pay ₹500 once, reuse it to confirm a ₹5,00,000
    // venue). create-order stamps metadata.bookingId — require it to match.
    if (stripeSession.metadata?.bookingId !== bookingId) {
      console.warn(
        `[payment] session/booking mismatch: session=${stripe_session_id} claims=${stripeSession.metadata?.bookingId} requested=${bookingId}`
      );
      return NextResponse.json(
        { message: "This payment does not belong to that booking." },
        { status: 400 }
      );
    }

    await connectDB();

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return NextResponse.json(
        { message: "Booking not found." },
        { status: 404 }
      );
    }

    // Verify ownership
    if (booking.userId.toString() !== session.userId) {
      return NextResponse.json(
        { message: "Permission denied." },
        { status: 403 }
      );
    }

    // Cross-check: the session ID must match what we stored when creating the
    // order. This used to fail OPEN — `booking.stripeSessionId &&` meant a
    // booking that never went through create-order (so had no stored id) would
    // accept any session id at all. A missing id is now a hard failure.
    if (booking.stripeSessionId !== stripe_session_id) {
      return NextResponse.json(
        { message: "Session ID mismatch. Payment cannot be verified." },
        { status: 400 }
      );
    }

    // The customer must have paid the full advance, not merely *something*.
    // Stripe reports minor units (paise/cents) in the session's own currency,
    // which is what create-order charged after conversion from INR.
    const expectedMinorUnits = Math.round(
      convertINRTo(booking.advanceAmount, booking.currency || "INR") * 100
    );
    const paidMinorUnits = stripeSession.amount_total ?? 0;

    if (paidMinorUnits < expectedMinorUnits) {
      console.warn(
        `[payment] underpayment on ${bookingId}: paid=${paidMinorUnits} expected=${expectedMinorUnits}`
      );
      return NextResponse.json(
        { message: "The amount paid doesn't cover the booking advance." },
        { status: 400 }
      );
    }

    // Prevent double-confirmation
    if (booking.paymentStatus === "paid") {
      return NextResponse.json({
        success: true,
        message: "Booking is already confirmed.",
        booking: { id: booking._id, status: booking.status, providerName: booking.providerName },
      });
    }

    booking.stripeSessionId = stripe_session_id;
    booking.status = "confirmed";
    // Record the money separately from the fulfilment status — revenue and
    // vendor payouts read these fields, never `advanceAmount`.
    booking.paymentStatus = "paid";
    booking.amountPaid = paidMinorUnits / 100;
    booking.paidAt = new Date();
    booking.paidMethod = "stripe";
    await booking.save();

    return NextResponse.json({
      success: true,
      message: "Payment verified! Your booking is confirmed.",
      booking: {
        id: booking._id,
        status: booking.status,
        providerName: booking.providerName,
      },
    });
  } catch (error: unknown) {
    console.error("Payment verification error:", error);
    return NextResponse.json(
      { message: "Payment verification failed." },
      { status: 500 }
    );
  }
}
