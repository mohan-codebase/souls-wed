/**
 * BOOKING DETAILS API — GET /api/bookings/[id]
 * 
 * Fetches details for a single booking and validates that the 
 * logged-in user is authorized to view it (either they created it
 * or they are the vendor).
 */

import { connectDB } from "@/lib/mongodb";
import { Booking } from "@/lib/models/Booking";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { SessionData, sessionOptions } from "@/lib/session";

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
    // Only the user who booked it or an admin can view it.
    // (If vendors were tied to specific venue IDs, we'd check that too, 
    // but right now vendors aren't linked to venues in DB)
    if (booking.userId.toString() !== session.userId && session.role !== "admin") {
      return NextResponse.json(
        { message: "You don't have permission to view this booking." },
        { status: 403 }
      );
    }

    return NextResponse.json({ booking });
  } catch (error: unknown) {
    console.error("Booking GET error:", error);
    return NextResponse.json(
      { message: "Failed to fetch booking details." },
      { status: 500 }
    );
  }
}
