import { connectDB } from "@/lib/mongodb";
import { Booking } from "@/lib/models/Booking";
import { getStripe } from "@/lib/stripe";
import { getVendorEmailForProvider } from "@/lib/booking-access";
import { sendBookingConfirmedEmails, dispatch } from "@/lib/mail";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const sig = req.headers.get("stripe-signature");

    if (!sig) {
      return NextResponse.json({ message: "No signature found" }, { status: 400 });
    }

    const stripe = getStripe();
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err.message);
      return NextResponse.json({ message: `Webhook Error: ${err.message}` }, { status: 400 });
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as any;
      const bookingId = session.metadata?.bookingId;

      if (bookingId) {
        await connectDB();
        const booking = await Booking.findById(bookingId);

        // The webhook is signature-verified, so this is our most trustworthy
        // signal that money moved — but only act on a session Stripe reports
        // as actually paid. `checkout.session.completed` also fires for
        // unpaid/async payment methods.
        if (booking && session.payment_status === "paid" && booking.paymentStatus !== "paid") {
          booking.status = "confirmed";
          booking.stripeSessionId = session.id;
          booking.paymentStatus = "paid";
          booking.amountPaid = (session.amount_total ?? 0) / 100;
          booking.paidAt = new Date();
          booking.paidMethod = "stripe";
          await booking.save();
          console.log(
            `Booking ${bookingId} confirmed via Stripe webhook (${booking.amountPaid} ${booking.currency})`
          );

          // The webhook fires even if the customer closed the tab before the
          // redirect, so this is often the only chance to send confirmations.
          // `sendBookingConfirmedEmails` is idempotent from Stripe's point of
          // view because we only get here when paymentStatus wasn't already
          // "paid" — so the redirect path won't double-send.
          dispatch(
            getVendorEmailForProvider(booking.providerId).then((vendorEmail) =>
              sendBookingConfirmedEmails(booking.toObject(), vendorEmail ?? undefined)
            ),
            "booking-confirmed (webhook)"
          );
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
