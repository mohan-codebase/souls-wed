/**
 * AVAILABILITY API — GET /api/venues/[id]/availability
 * 
 * This API answers: "Which dates are already booked for this venue?"
 * 
 * The calendar component calls this to know which dates to grey out.
 * 
 * QUERY PARAMS:
 *   ?month=2026-07  → returns booked dates for July 2026
 * 
 * HOW IT WORKS:
 * 1. Parse the venue ID from the URL and month from query params
 * 2. Calculate the first and last day of that month
 * 3. Query MongoDB: find all CONFIRMED bookings for this venue in this month
 * 4. For "venue" type bookings → return the eventDate
 * 5. For "room" type bookings → return EVERY date between checkIn and checkOut
 *    (because rooms are booked for multiple consecutive nights)
 * 6. Return array of date strings: ["2026-07-05", "2026-07-12", "2026-07-13"]
 * 
 * WHY QUERY BY MONTH?
 * If we returned ALL booked dates ever, it could be thousands of dates.
 * The calendar only shows one month at a time, so we filter server-side.
 * This keeps the response fast and small.
 */

import { connectDB } from "@/lib/mongodb";
import { Booking } from "@/lib/models/Booking";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: venueId } = await params;
    const { searchParams } = new URL(req.url);
    const monthParam = searchParams.get("month"); // e.g., "2026-07"

    if (!monthParam) {
      return NextResponse.json(
        { message: "Query param 'month' is required (format: YYYY-MM)" },
        { status: 400 }
      );
    }

    // Validate format strictly before parsing
    if (!/^\d{4}-\d{2}$/.test(monthParam)) {
      return NextResponse.json(
        { message: "Invalid 'month' format. Expected YYYY-MM (e.g. 2026-07)" },
        { status: 400 }
      );
    }

    // ─── Parse month into date range ───
    // "2026-07" → startOfMonth = July 1, endOfMonth = July 31
    const [year, month] = monthParam.split("-").map(Number);
    const startOfMonth = new Date(year, month - 1, 1);         // July 1
    const endOfMonth = new Date(year, month, 0, 23, 59, 59);   // July 31 23:59:59
    // Note: new Date(2026, 7, 0) gives "June 30" — the day BEFORE August 1
    // So new Date(year, month, 0) = last day of the requested month

    await connectDB();

    // ─── Query confirmed bookings that overlap this month ───
    // We use $or to find:
    //   - Venue bookings where eventDate falls in this month
    //   - Room bookings where the checkIn-checkOut range overlaps this month
    const bookings = await Booking.find({
      venueId,
      status: { $in: ["confirmed", "pending"] }, // Both block dates
      $or: [
        // Venue bookings: eventDates within the month
        {
          bookingType: "venue",
          eventDates: { $elemMatch: { $gte: startOfMonth, $lte: endOfMonth } },
        },
        // Venue bookings: eventDate within the month (backward compatibility)
        {
          bookingType: "venue",
          eventDate: { $gte: startOfMonth, $lte: endOfMonth },
        },
        // Room bookings: checkIn-checkOut range overlaps the month
        // A range overlaps if: checkIn <= endOfMonth AND checkOut >= startOfMonth
        {
          bookingType: "room",
          checkIn: { $lte: endOfMonth },
          checkOut: { $gte: startOfMonth },
        },
      ],
    });

    // ─── Collect all booked dates ───
    const bookedDates = new Set<string>();

    for (const booking of bookings) {
      if (booking.bookingType === "venue") {
        if (booking.eventDates && booking.eventDates.length > 0) {
          for (const d of booking.eventDates) {
            if (d) bookedDates.add(formatDate(d));
          }
        } else if (booking.eventDate) {
          bookedDates.add(formatDate(booking.eventDate));
        }
      } else if (booking.bookingType === "room" && booking.checkIn && booking.checkOut) {
        // Room: every date from checkIn to checkOut (exclusive of checkout day)
        // If someone checks in July 5 and checks out July 8,
        // rooms are occupied on July 5, 6, 7 (checkout day is free)
        const current = new Date(booking.checkIn);
        const end = new Date(booking.checkOut);
        while (current < end) {
          bookedDates.add(formatDate(current));
          current.setDate(current.getDate() + 1);
        }
      }
    }

    return NextResponse.json({
      venueId,
      month: monthParam,
      bookedDates: Array.from(bookedDates).sort(),
    });
  } catch (error: unknown) {
    console.error("Availability API error:", error);
    return NextResponse.json(
      { message: "Failed to fetch availability." },
      { status: 500 }
    );
  }
}

/**
 * Helper: Format a Date object as "YYYY-MM-DD"
 * 
 * We use this consistent format so the frontend can easily compare
 * dates. JavaScript Date objects have timezone issues, so we always
 * work with simple string comparisons for calendar dates.
 */
function formatDate(date: Date): string {
  const d = new Date(date);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
