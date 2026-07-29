import { connectDB } from "@/lib/mongodb";
import { Booking } from "@/lib/models/Booking";
import { getVendorBlockedDates } from "@/lib/booking-access";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const providerId = searchParams.get("providerId");

    if (!providerId) {
      return NextResponse.json(
        { message: "Provider ID is required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Find all confirmed/pending bookings for this provider
    const bookings = await Booking.find({
      providerId,
      status: { $in: ["pending", "confirmed"] },
    });

    const bookedDates: string[] = [];

    bookings.forEach((booking) => {
      if (booking.bookingType === "room" && booking.checkIn && booking.checkOut) {
        let currentDate = new Date(booking.checkIn);
        const endDate = new Date(booking.checkOut);
        
        while (currentDate <= endDate) {
          bookedDates.push(currentDate.toISOString().split("T")[0]);
          currentDate.setDate(currentDate.getDate() + 1);
        }
      } else {
        if (booking.eventDates && booking.eventDates.length > 0) {
          booking.eventDates.forEach((d: Date) => {
            if (d) bookedDates.push(new Date(d).toISOString().split("T")[0]);
          });
        } else if (booking.eventDate) {
          bookedDates.push(new Date(booking.eventDate).toISOString().split("T")[0]);
        }
      }
    });

    // Dates the owning vendor has blocked out manually. Resolved via the
    // listing, because providerId is a venue slug or service id rather than a
    // Vendor._id — the old direct findById always failed silently, so the
    // calendar never greyed these out.
    const unavailableDates = await getVendorBlockedDates(providerId);

    const allBlockedDates = Array.from(new Set([...bookedDates, ...unavailableDates]));

    return NextResponse.json({ blockedDates: allBlockedDates }, { status: 200 });
  } catch (error: unknown) {
    console.error("Failed to fetch availability:", error);
    return NextResponse.json(
      { message: "Failed to fetch availability" },
      { status: 500 }
    );
  }
}
