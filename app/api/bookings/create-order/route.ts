import { connectDB } from "@/lib/mongodb";
import { Booking } from "@/lib/models/Booking";
import { Venue } from "@/lib/models/Venue";
import { getStripe } from "@/lib/stripe";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { SessionData, sessionOptions } from "@/lib/session";
import { convertINRTo, formatAsCurrency } from "@/lib/currency";

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

    const { bookingId } = await req.json();
    if (!bookingId) {
      return NextResponse.json(
        { message: "Booking ID is required." },
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

    // Verify the booking belongs to this user
    if (booking.userId.toString() !== session.userId) {
      return NextResponse.json(
        { message: "You don't have permission to pay for this booking." },
        { status: 403 }
      );
    }

    if (booking.status !== "pending") {
      return NextResponse.json(
        { message: `Booking is already ${booking.status}. Cannot create a new payment.` },
        { status: 400 }
      );
    }

    const currency = booking.currency || "INR";
    const origin = new URL(req.url).origin;

    const stripe = getStripe();
    const convertedAmount = convertINRTo(booking.advanceAmount, currency);

    // Determine if the provider is a Venue or Vendor to set the correct redirect URL.
    // We also pull the image so Stripe Checkout can show the venue thumbnail.
    let returnUrlPath = "";
    let venueImage: string | undefined;
    try {
      const venue = await Venue.findOne(
        {
          $or: [
            { venueId: booking.providerId },
            ...(booking.providerId.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: booking.providerId }] : [])
          ]
        },
        { image: 1 }
      );
      returnUrlPath = venue ? `venues/${booking.providerId}` : `vendor/${booking.providerId}`;
      // Stripe only accepts publicly reachable absolute URLs
      if (venue?.image?.startsWith("http")) venueImage = venue.image;
    } catch (e) {
      returnUrlPath = `vendor/${booking.providerId}`; // fallback to vendor path
    }

    // ─── Build the customer-facing summary shown on the Stripe Checkout page ───
    const fmtDate = (d: Date | string) =>
      new Date(d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

    const eventDatesLabel = booking.eventDates?.length
      ? `${booking.eventDates.map(fmtDate).join(", ")}, ${new Date(booking.eventDates[0]).getFullYear()}`
      : booking.eventDate
        ? new Date(booking.eventDate).toLocaleDateString("en-US", {
            weekday: "short", month: "short", day: "numeric", year: "numeric",
          })
        : booking.checkIn && booking.checkOut
          ? `${fmtDate(booking.checkIn)} — ${fmtDate(booking.checkOut)}`
          : "";

    // Stripe renders raw text, so casing has to be applied here (our own page uses CSS `capitalize`)
    const titleCase = (s?: string | null) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "");

    const remainingBalance = booking.totalAmount - booking.advanceAmount;
    const summaryParts = [
      eventDatesLabel && `Dates: ${eventDatesLabel}`,
      booking.guestCount && `${booking.guestCount} guests`,
      booking.roomCount && `${booking.roomCount} rooms`,
      [titleCase(booking.functionType), titleCase(booking.functionTime)].filter(Boolean).join(" · "),
      `Total ${formatAsCurrency(booking.totalAmount, currency)}`,
      remainingBalance > 0 &&
        `${formatAsCurrency(remainingBalance, currency)} balance payable at the venue`,
    ].filter(Boolean);

    const bookingRef = booking._id.toString().slice(-8).toUpperCase();

    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      // Prefills the email field so the customer doesn't retype it
      customer_email: booking.userEmail,
      // Lets us reconcile this session against the booking in the Stripe dashboard
      client_reference_id: booking._id.toString(),
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: `${booking.bookingType === "room" ? "Room" : "Booking"} advance — ${booking.providerName}`,
              description: summaryParts.join(" · "),
              ...(venueImage ? { images: [venueImage] } : {}),
            },
            unit_amount: Math.round(convertedAmount * 100), // cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/${returnUrlPath}?success=true&session_id={CHECKOUT_SESSION_ID}&booking_id=${booking._id}`,
      cancel_url: `${origin}/${returnUrlPath}?canceled=true`,
      payment_intent_data: {
        description: `Advance for booking #${bookingRef} — ${booking.providerName}`,
        receipt_email: booking.userEmail,
        metadata: { bookingId: booking._id.toString(), bookingRef },
      },
      // Surfaced on the payment in the Stripe dashboard for support/reconciliation
      metadata: {
        bookingId: booking._id.toString(),
        bookingRef,
        bookingType: booking.bookingType,
        provider: booking.providerName,
        customerName: booking.userName,
        customerEmail: booking.userEmail,
        customerPhone: booking.userPhone || "",
        eventDates: eventDatesLabel,
        guestCount: booking.guestCount ? String(booking.guestCount) : "",
        roomCount: booking.roomCount ? String(booking.roomCount) : "",
        functionType: booking.functionType || "",
        functionTime: booking.functionTime || "",
        totalAmountINR: String(booking.totalAmount),
        advanceAmountINR: String(booking.advanceAmount),
        balanceDueINR: String(remainingBalance),
        specialRequests: (booking.specialRequests || "").slice(0, 490),
      },
    });

    // Store the Stripe Checkout Session ID for later verification
    booking.stripeSessionId = checkoutSession.id;
    await booking.save();

    return NextResponse.json({
      url: checkoutSession.url,
    });
  } catch (error: unknown) {
    console.error("Create order error:", error);
    return NextResponse.json(
      { message: "Failed to create payment order." },
      { status: 500 }
    );
  }
}
