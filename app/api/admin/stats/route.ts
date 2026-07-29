import { connectDB } from "@/lib/mongodb";
import { User } from "@/lib/models/User";
import { Vendor } from "@/lib/models/Vendor";
import { Booking } from "@/lib/models/Booking";
import { Admin } from "@/lib/models/Admin";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { SessionData, sessionOptions } from "@/lib/session";
import { customerFilter } from "@/lib/accounts";

export async function GET() {
  try {
    // 1. Verify admin session
    const session = await getIronSession<SessionData>(
      await cookies(),
      sessionOptions
    );

    if (!session.isLoggedIn || session.role !== "admin") {
      return NextResponse.json(
        { message: "Unauthorized. Admin privileges required." },
        { status: 401 }
      );
    }

    // 2. Connect to Database
    await connectDB();

    // 3. Fetch statistics in parallel
    const [totalUsers, totalVendors, totalBookings, totalAdmins] = await Promise.all([
      // Shares one definition with /api/admin/users — see customerFilter().
      // These were two hand-written filters that had drifted apart, so the
      // tile read 6 while the table below it listed 5.
      User.countDocuments(customerFilter()),
      Vendor.countDocuments(),
      Booking.countDocuments(),
      Admin.countDocuments(),
    ]);

    // 4. Calculate total revenue — money we ACTUALLY collected.
    //
    // This used to sum `advanceAmount` for any booking whose status happened to
    // be confirmed/completed. Because an admin can set status by hand, marking
    // an unpaid booking "Confirmed" invented revenue out of nothing. Revenue is
    // now the sum of `amountPaid` on bookings Stripe (or a recorded offline
    // payment) confirmed as paid.
    const revenueResult = await Booking.aggregate([
      { $match: { paymentStatus: "paid" } },
      { $group: { _id: null, total: { $sum: "$amountPaid" } } },
    ]);

    const totalRevenue = revenueResult[0]?.total || 0;

    // Surfaced separately so the dashboard can show committed-but-uncollected
    // value without mixing it into revenue.
    const pendingResult = await Booking.aggregate([
      { $match: { paymentStatus: { $ne: "paid" }, status: { $ne: "cancelled" } } },
      { $group: { _id: null, total: { $sum: "$advanceAmount" } } },
    ]);

    const pendingRevenue = pendingResult[0]?.total || 0;

    return NextResponse.json({
      success: true,
      stats: {
        totalUsers,
        totalVendors,
        totalBookings,
        totalAdmins,
        totalRevenue,
        pendingRevenue,
      },
    });
  } catch (error: unknown) {
    console.error("Error in GET /api/admin/stats:", error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { message: "Failed to fetch stats.", error: errMsg },
      { status: 500 }
    );
  }
}
