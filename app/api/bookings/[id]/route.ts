/**
 * BOOKING DETAILS API — GET /api/bookings/[id]
 * 
 * Fetches details for a single booking and validates that the 
 * logged-in user is authorized to view it (either they created it
 * or they are the vendor).
 */

import { connectDB } from "@/lib/mongodb";
import { Booking } from "@/lib/models/Booking";
import { Venue } from "@/lib/models/Venue";
import { ServiceListing } from "@/lib/models/ServiceListing";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { SessionData, sessionOptions } from "@/lib/session";
import { vendorOwnsProvider, getVendorEmailForProvider } from "@/lib/booking-access";
import { sendBookingCancelledEmails, dispatch } from "@/lib/mail";

/**
 * `Booking.providerId` holds a `Venue.venueId` for venue/room bookings and a
 * `ServiceListing.serviceId` for every other category (same convention used
 * by create-order and the search pipeline — see lib/search/filters.ts). The
 * checkout page wants the listing's photos/description/features, which live
 * on that record, not on the booking itself, so look it up here rather than
 * duplicating the data onto every booking.
 */
async function findProvider(providerId: string) {
  const isObjectId = /^[0-9a-fA-F]{24}$/.test(providerId);

  const venue = await Venue.findOne(
    { $or: [{ venueId: providerId }, ...(isObjectId ? [{ _id: providerId }] : [])] },
    "name city country description features image heroImage gallery"
  ).lean();
  if (venue) {
    return {
      name: venue.name,
      city: venue.city,
      country: venue.country,
      description: venue.description,
      features: venue.features ?? [],
      images: [venue.heroImage, venue.image, ...(venue.gallery ?? [])].filter(
        (url, i, arr): url is string => Boolean(url) && arr.indexOf(url) === i
      ),
    };
  }

  const service = await ServiceListing.findOne(
    { serviceId: providerId },
    "name city country description features image gallery"
  ).lean();
  if (service) {
    return {
      name: service.name,
      city: service.city,
      country: service.country,
      description: service.description,
      features: service.features ?? [],
      images: [service.image, ...(service.gallery ?? [])].filter(
        (url, i, arr): url is string => Boolean(url) && arr.indexOf(url) === i
      ),
    };
  }

  return null;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // ─── Authentication check ───
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

    await connectDB();
    const booking = await Booking.findById(id);

    if (!booking) {
      return NextResponse.json(
        { message: "Booking not found." },
        { status: 404 }
      );
    }

    // ─── Authorization check ───
    // The customer who booked it, an admin, or the vendor who owns the listing.
    //
    // The vendor case used to be missing — the old comment claimed vendors
    // "aren't linked to venues in DB", but they are, via Venue.vendorId and
    // ServiceListing.vendorId. The result was a vendor getting 403 on their own
    // booking. See AUDIT-REPORT.md #5.
    const isOwner = booking.userId.toString() === session.userId;
    const isAdmin = session.role === "admin";
    const isVendorForBooking =
      session.role === "vendor" &&
      (await vendorOwnsProvider(session.userId!, booking.providerId));

    if (!isOwner && !isAdmin && !isVendorForBooking) {
      return NextResponse.json(
        { message: "You don't have permission to view this booking." },
        { status: 403 }
      );
    }

    const provider = await findProvider(booking.providerId);

    return NextResponse.json({ booking, provider });
  } catch (error: unknown) {
    console.error("Booking GET error:", error);
    return NextResponse.json(
      { message: "Failed to fetch booking details." },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/bookings/[id] — act on a booking.
 *
 * Before this existed, the only way to change a booking's status was
 * `PATCH /api/admin/bookings`, which is admin-only. A vendor looking at a
 * double-booked date had no way to decline it and no way to mark a finished
 * event complete — they had to phone an admin. See AUDIT-REPORT.md #5.
 *
 * Permitted actions, by role:
 *
 *   vendor (owns the listing)   decline  → cancelled
 *                               complete → completed   (event date must have passed)
 *   user   (made the booking)   cancel   → cancelled
 *
 * Deliberately NOT permitted: moving a booking to "confirmed". Confirmation
 * follows payment, not opinion — it's set by Stripe verification, the webhook,
 * or an admin explicitly recording an offline payment. Letting a vendor confirm
 * would reintroduce the "revenue without money" bug fixed in AUDIT-REPORT.md #2.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const session = await getIronSession<SessionData>(
      await cookies(),
      sessionOptions
    );

    if (!session.isLoggedIn) {
      return NextResponse.json({ message: "Authentication required." }, { status: 401 });
    }

    const { action, reason } = await req.json();

    await connectDB();
    const booking = await Booking.findById(id);
    if (!booking) {
      return NextResponse.json({ message: "Booking not found." }, { status: 404 });
    }

    const isOwner = booking.userId.toString() === session.userId;
    const isVendorForBooking =
      session.role === "vendor" &&
      (await vendorOwnsProvider(session.userId!, booking.providerId));

    if (!isOwner && !isVendorForBooking && session.role !== "admin") {
      return NextResponse.json(
        { message: "You don't have permission to change this booking." },
        { status: 403 }
      );
    }

    if (booking.status === "cancelled") {
      return NextResponse.json(
        { message: "This booking has already been cancelled." },
        { status: 409 }
      );
    }

    // ── Decline (vendor) / Cancel (customer) ──
    if (action === "decline" || action === "cancel") {
      if (action === "decline" && !isVendorForBooking && session.role !== "admin") {
        return NextResponse.json(
          { message: "Only the vendor can decline a booking." },
          { status: 403 }
        );
      }
      if (action === "cancel" && !isOwner && session.role !== "admin") {
        return NextResponse.json(
          { message: "Only the customer can cancel their booking." },
          { status: 403 }
        );
      }

      booking.status = "cancelled";
      booking.cancelledBy = isVendorForBooking ? "vendor" : isOwner ? "user" : "admin";
      booking.cancellationReason = String(reason || "").slice(0, 500);
      booking.cancelledAt = new Date();
      await booking.save();

      dispatch(
        getVendorEmailForProvider(booking.providerId).then((vendorEmail) =>
          sendBookingCancelledEmails(booking.toObject(), vendorEmail ?? undefined)
        ),
        "booking-cancelled"
      );

      // A cancelled booking releases its dates — the conflict check in
      // POST /api/bookings only counts pending and confirmed.
      return NextResponse.json({
        success: true,
        message:
          booking.paymentStatus === "paid"
            ? "Booking cancelled. A refund needs to be issued for the advance already paid."
            : "Booking cancelled.",
        refundDue: booking.paymentStatus === "paid" ? booking.amountPaid : 0,
        booking,
      });
    }

    // ── Mark the event delivered (vendor) ──
    if (action === "complete") {
      if (!isVendorForBooking && session.role !== "admin") {
        return NextResponse.json(
          { message: "Only the vendor can mark a booking complete." },
          { status: 403 }
        );
      }
      if (booking.status !== "confirmed") {
        return NextResponse.json(
          { message: "Only a confirmed booking can be marked complete." },
          { status: 409 }
        );
      }

      // Guard against marking a future event delivered — "completed" unlocks
      // the customer's ability to leave a review.
      const eventDate =
        booking.eventDate ||
        (booking.eventDates && booking.eventDates[booking.eventDates.length - 1]) ||
        booking.checkOut;
      if (eventDate && new Date(eventDate) > new Date()) {
        return NextResponse.json(
          { message: "This event hasn't happened yet." },
          { status: 409 }
        );
      }

      booking.status = "completed";
      await booking.save();

      return NextResponse.json({ success: true, message: "Booking marked complete.", booking });
    }

    return NextResponse.json(
      { message: `Unknown action "${action}". Expected "decline", "cancel" or "complete".` },
      { status: 400 }
    );
  } catch (error: unknown) {
    console.error("Booking PATCH error:", error);
    return NextResponse.json(
      { message: "Failed to update booking." },
      { status: 500 }
    );
  }
}
