/**
 * BOOKINGS API — POST + GET /api/bookings
 * 
 * POST: Create a new booking
 *   - Requires authenticated user (checks iron-session)
 *   - Validates all required fields
 *   - Calculates advance amount (30% of total)
 *   - Creates booking with status "pending"
 * 
 * GET: List bookings for the current user
 *   - Returns all bookings for the logged-in user
 *   - Sorted by creation date (newest first)
 *   - Used by the user dashboard to show their bookings
 * 
 * WHY 30% ADVANCE?
 * In the Indian wedding industry, venues typically charge 20-50% advance
 * to confirm a booking, with the rest paid on the event day.
 * 30% is a common middle ground.
 */

import { connectDB } from "@/lib/mongodb";
import { Booking } from "@/lib/models/Booking";
import { Vendor } from "@/lib/models/Vendor";
import { Venue } from "@/lib/models/Venue";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { SessionData, sessionOptions } from "@/lib/session";
import { quoteBooking, PricingError } from "@/lib/pricing";
import { getVendorProviderIds, getVendorEmailForProvider } from "@/lib/booking-access";
import { sendBookingCreatedEmails, dispatch } from "@/lib/mail";

/**
 * How far the client's displayed price may drift from the server's before we
 * reject the booking. Zero tolerance would be ideal, but a ₹1 allowance absorbs
 * float/rounding differences between the browser and Node without opening a gap
 * an attacker could drive anything through.
 */
const PRICE_TOLERANCE_INR = 1;

// ════════════════════════════════════════════════════════════
// POST — Create a new booking
// ════════════════════════════════════════════════════════════
export async function POST(req: Request) {
  try {
    // ─── Step 1: Check authentication ───
    const session = await getIronSession<SessionData>(
      await cookies(),
      sessionOptions
    );

    // STRICT LOGIN REQUIREMENT
    if (!session.isLoggedIn) {
      return NextResponse.json(
        { message: "You must be logged in to make a booking." },
        { status: 401 }
      );
    }

    // ─── Step 2: Parse request body ───
    const body = await req.json();
    const {
      providerId,
      providerName,
      bookingType,
      eventDate,
      eventDates,
      checkIn,
      checkOut,
      guestCount,
      roomCount,
      hours,
      menuType,
      totalAmount,
      functionType,
      functionTime,
      specialRequests,
      notifyWhatsapp,
      userName,
      userPhone,
      currency,
    } = body;

    // ─── Step 3: Validate required fields ───
    // NOTE: `totalAmount` is deliberately NOT required here — it is advisory
    // only. The real figure comes from quoteBooking() in Step 4.5.
    if (!providerId || !providerName || !bookingType) {
      return NextResponse.json(
        { message: "Missing required booking fields." },
        { status: 400 }
      );
    }

    if (specialRequests && specialRequests.length > 1000) {
      return NextResponse.json(
        { message: "Special requests must be 1000 characters or fewer." },
        { status: 400 }
      );
    }

    // Validate booking-type-specific dates
    if (bookingType !== "room" && (!eventDates || eventDates.length === 0)) {
      return NextResponse.json(
        { message: "At least one event date is required for this booking." },
        { status: 400 }
      );
    }

    if (bookingType === "room" && (!checkIn || !checkOut)) {
      return NextResponse.json(
        { message: "Check-in and check-out dates are required for room bookings." },
        { status: 400 }
      );
    }

    // ─── Step 4: Check for conflicts ───
    // Make sure the requested date(s) aren't already booked
    await connectDB();

    let conflictQuery: Record<string, unknown> = {
      providerId,
      status: { $in: ["pending", "confirmed"] },
    };

    if (bookingType === "room") {
      // A room range conflicts if: existing.checkIn < new.checkOut AND existing.checkOut > new.checkIn
      conflictQuery.bookingType = "room";
      conflictQuery.checkIn = { $lt: new Date(checkOut) };
      conflictQuery.checkOut = { $gt: new Date(checkIn) };
    } else {
      const datesAsObjects = eventDates.map((d: string) => new Date(d));
      conflictQuery.$or = [
        { eventDate: { $in: datesAsObjects } },
        { eventDates: { $in: datesAsObjects } }
      ];
    }


    const existingBooking = await Booking.findOne(conflictQuery);
    if (existingBooking) {
      return NextResponse.json(
        { message: "This date is already booked. Please select a different date." },
        { status: 409 }
      );
    }

    // Also check the vendor's own unavailableDates (days blocked outside the platform)
    try {
      const vendor = await Vendor.findById(providerId);
      if (vendor?.unavailableDates?.length) {
        const blocked = new Set(
          vendor.unavailableDates.map((d: Date) => new Date(d).toISOString().split("T")[0])
        );

        let requestedDates: string[] = [];
        if (bookingType === "room") {
          let currentDate = new Date(checkIn);
          const endDate = new Date(checkOut);
          while (currentDate <= endDate) {
            requestedDates.push(currentDate.toISOString().split("T")[0]);
            currentDate.setDate(currentDate.getDate() + 1);
          }
        } else {
          requestedDates = eventDates.map((d: string) => new Date(d).toISOString().split("T")[0]);
        }

        if (requestedDates.some((d) => blocked.has(d))) {
          return NextResponse.json(
            { message: "This date is unavailable. Please select a different date." },
            { status: 409 }
          );
        }
      }
    } catch {
      // providerId might be a static venue string id, not an ObjectId — ignore
    }

    // ─── Step 5: Price the booking SERVER-SIDE ───
    //
    // Everything above this line came from the client and is untrusted.
    // quoteBooking() re-derives the price from the listing in MongoDB, so a
    // tampered `totalAmount` can't get anyone a ₹1,44,000 venue for ₹1.
    let quote;
    try {
      quote = await quoteBooking(providerId, {
        bookingType,
        guestCount,
        roomCount,
        hours,
        menuType,
        eventDates,
        checkIn,
        checkOut,
      });
    } catch (err) {
      if (err instanceof PricingError) {
        return NextResponse.json({ message: err.message }, { status: err.status });
      }
      throw err;
    }

    // If the browser showed the customer a different number than we just
    // calculated, something is out of sync (or being tampered with). Fail
    // rather than silently charging a price they never agreed to.
    const clientTotal = Number(totalAmount);
    if (
      Number.isFinite(clientTotal) &&
      clientTotal > 0 &&
      Math.abs(clientTotal - quote.totalAmount) > PRICE_TOLERANCE_INR
    ) {
      console.warn(
        `[pricing] mismatch on ${providerId}: client=${clientTotal} server=${quote.totalAmount} user=${session.userId}`
      );
      return NextResponse.json(
        {
          message:
            "The price changed while you were booking. Please refresh the page and try again.",
          expectedAmount: quote.totalAmount,
        },
        { status: 409 }
      );
    }

    const finalTotalAmount = quote.totalAmount;
    const advanceAmount = quote.advanceAmount;

    // ─── Step 6: Create the booking ───
    const newBooking = new Booking({
      userId: session.userId,
      userName: userName || session.name || "Guest",
      userEmail: session.email,
      userPhone: userPhone || "",
      providerId,
      // Use the name from the DB, not the client's — otherwise a booking can be
      // filed against one listing while displaying another listing's name.
      providerName: quote.providerName || providerName,
      providerImage: quote.providerImage || "",
      bookingType,
      eventDates: bookingType !== "room" ? eventDates.map((d: string) => new Date(d)) : undefined,
      eventDate: bookingType !== "room" && eventDates.length > 0 ? new Date(eventDates[0]) : undefined,
      checkIn: bookingType === "room" ? new Date(checkIn) : undefined,
      checkOut: bookingType === "room" ? new Date(checkOut) : undefined,
      guestCount,
      roomCount,
      totalAmount: finalTotalAmount,
      advanceAmount,
      status: "pending",
      // A new booking has never been paid. Only verify-payment, the Stripe
      // webhook, or an explicit admin offline-payment action may change this.
      paymentStatus: "unpaid",
      amountPaid: 0,
      functionType,
      functionTime,
      specialRequests,
      notifyWhatsapp: notifyWhatsapp || false,
      currency: currency || "INR",
    });

    await newBooking.save();

    // Notify customer, vendor and admin. Fire-and-forget: a slow SMTP server
    // must never delay (or fail) the booking itself.
    dispatch(
      getVendorEmailForProvider(providerId).then((vendorEmail) =>
        sendBookingCreatedEmails(newBooking.toObject(), vendorEmail ?? undefined)
      ),
      "booking-created"
    );

    return NextResponse.json(
      {
        message: "Booking created successfully.",
        booking: {
          id: newBooking._id,
          status: newBooking.status,
          totalAmount: newBooking.totalAmount,
          advanceAmount: newBooking.advanceAmount,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Booking creation error:", error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { message: "Failed to create booking.", error: errMsg },
      { status: 500 }
    );
  }
}

// ════════════════════════════════════════════════════════════
// GET — List bookings for current user
// ════════════════════════════════════════════════════════════
export async function GET() {
  try {
    // ─── Check authentication ───
    const session = await getIronSession<SessionData>(
      await cookies(),
      sessionOptions
    );

    if (!session.isLoggedIn) {
      return NextResponse.json(
        { message: "You must be logged in to view bookings." },
        { status: 401 }
      );
    }

    await connectDB();

    // Users see bookings they made. Vendors see bookings received — either
    // against their own account id (service vendors) or against a venue they
    // own (providerId is the venue's slug id, not the vendor's account id).
    // Admins see everything.
    let query: Record<string, unknown> = { userId: session.userId };
    if (session.role === "vendor") {
      // A vendor's bookings can arrive under three different id conventions:
      //   - their own account _id      (vendor booked directly)
      //   - Venue.venueId              (venue/banquet listings)
      //   - ServiceListing.serviceId   (planners, caterers, decorators,
      //                                 photographers, rooms)
      //
      // ServiceListing used to be missing here, so every non-venue booking was
      // invisible to the vendor who owned it — 21 of 26 listings on the current
      // catalogue could never deliver a lead. See AUDIT-REPORT.md #3.
      const providerIds = await getVendorProviderIds(session.userId!);
      query = { providerId: { $in: providerIds } };
    } else if (session.role === "admin") {
      query = {};
    }

    const bookings = await Booking.find(query)
      .sort({ createdAt: -1 })
      .limit(50);

    return NextResponse.json({ bookings });
  } catch (error: unknown) {
    console.error("Bookings list error:", error);
    return NextResponse.json(
      { message: "Failed to fetch bookings." },
      { status: 500 }
    );
  }
}

// ════════════════════════════════════════════════════════════
// DELETE — Delete/Cancel a pending booking
// ════════════════════════════════════════════════════════════
export async function DELETE(req: Request) {
  try {
    const session = await getIronSession<SessionData>(
      await cookies(),
      sessionOptions
    );

    if (!session.isLoggedIn) {
      return NextResponse.json(
        { message: "You must be logged in to delete a booking." },
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

    // Security check: Only the booking creator or an admin can delete it
    if (
      booking.userId.toString() !== session.userId &&
      session.role !== "admin"
    ) {
      return NextResponse.json(
        { message: "You don't have permission to delete this booking." },
        { status: 403 }
      );
    }

    // Remove from database
    await Booking.findByIdAndDelete(bookingId);

    return NextResponse.json({
      success: true,
      message: "Booking deleted successfully.",
    });
  } catch (error: unknown) {
    console.error("Booking deletion error:", error);
    return NextResponse.json(
      { message: "Failed to delete booking." },
      { status: 500 }
    );
  }
}

