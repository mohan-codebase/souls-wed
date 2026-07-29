import { connectDB } from "@/lib/mongodb";
import { Venue } from "@/lib/models/Venue";
import { Booking } from "@/lib/models/Booking";
import { NextResponse } from "next/server";
import { canUserReview } from "@/lib/booking-lifecycle";
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { SessionData, sessionOptions } from "@/lib/session";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn) {
      return NextResponse.json({ message: "Please log in to write a review." }, { status: 401 });
    }

    await connectDB();
    const { id: venueId } = await params;
    const body = await req.json();
    const rating = Number(body.rating);
    const text = String(body.text || "").trim();

    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ message: "A rating between 1 and 5 is required." }, { status: 400 });
    }
    if (!text) {
      return NextResponse.json({ message: "Review text is required." }, { status: 400 });
    }

    const venue = await Venue.findOne({ venueId });
    if (!venue) {
      return NextResponse.json({ message: "Venue not found." }, { status: 404 });
    }

    const booking = await Booking.findOne({
      userId: session.userId,
      providerId: venueId,
      status: "completed",
    });
    if (!booking) {
      return NextResponse.json(
        { message: "You can only review a venue after a completed booking." },
        { status: 403 }
      );
    }

    const alreadyReviewed = venue.reviews.some(
      (r: { bookingId?: { toString(): string } }) => r.bookingId?.toString() === booking._id.toString()
    );
    if (alreadyReviewed) {
      return NextResponse.json({ message: "You've already reviewed this booking." }, { status: 409 });
    }

    const review = {
      id: Date.now(),
      author: session.name || booking.userName,
      avatar: (session.name || booking.userName || "?").charAt(0).toUpperCase(),
      date: new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long" }),
      rating,
      text,
      userId: session.userId,
      bookingId: booking._id,
    };

    venue.reviews.push(review);
    venue.reviewCount = venue.reviews.length;
    venue.rating =
      venue.reviews.reduce((sum: number, r: { rating: number }) => sum + r.rating, 0) / venue.reviews.length;
    await venue.save();

    return NextResponse.json({ message: "Review submitted.", review }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to submit review.";
    return NextResponse.json({ message }, { status: 500 });
  }
}


/**
 * GET — may the current user review this listing?
 *
 * The "Write a Review" button used to be shown to everyone, so most people who
 * clicked it hit a 403 from the POST handler. The UI now asks first.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    const result = await canUserReview(session.userId ?? "", id);
    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("Review eligibility error:", error);
    // Fail closed — hiding the button is better than promising a 403.
    return NextResponse.json({ canReview: false, reason: "" });
  }
}
