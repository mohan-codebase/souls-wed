import { connectDB } from "@/lib/mongodb";
import { Vendor } from "@/lib/models/Vendor";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { SessionData, sessionOptions } from "@/lib/session";

async function checkAdminSession() {
  const session = await getIronSession<SessionData>(
    await cookies(),
    sessionOptions
  );
  if (!session.isLoggedIn || session.role !== "admin") {
    return false;
  }
  return true;
}

export async function GET() {
  try {
    if (!(await checkAdminSession())) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    await connectDB();
    const vendors = await Vendor.find({ "reviews.0": { $exists: true } }).select(
      "_id name businessName reviews rating"
    );

    const allReviews: any[] = [];
    vendors.forEach((v) => {
      if (v.reviews && Array.isArray(v.reviews)) {
        v.reviews.forEach((r: any) => {
          allReviews.push({
            reviewId: r._id || r.id,
            vendorId: v._id,
            vendorName: v.businessName || v.name,
            author: r.author || "Anonymous Couple",
            rating: r.rating || 5,
            text: r.text || "",
            date: r.date || r.createdAt,
            avatar: r.avatar || "",
          });
        });
      }
    });

    return NextResponse.json({ success: true, reviews: allReviews });
  } catch (error: unknown) {
    console.error("Error in GET /api/admin/reviews:", error);
    return NextResponse.json({ message: "Failed to fetch reviews." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    if (!(await checkAdminSession())) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    await connectDB();
    const { searchParams } = new URL(req.url);
    const vendorId = searchParams.get("vendorId");
    const reviewId = searchParams.get("reviewId");

    if (!vendorId || !reviewId) {
      return NextResponse.json(
        { message: "Vendor ID and Review ID are required." },
        { status: 400 }
      );
    }

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return NextResponse.json({ message: "Vendor not found." }, { status: 404 });
    }

    // Pull review
    vendor.reviews = vendor.reviews.filter(
      (r: any) => String(r._id || r.id) !== String(reviewId)
    );

    // Recalculate reviewCount & rating
    vendor.reviewCount = vendor.reviews.length;
    if (vendor.reviews.length > 0) {
      const sum = vendor.reviews.reduce((acc: number, curr: any) => acc + (curr.rating || 5), 0);
      vendor.rating = Number((sum / vendor.reviews.length).toFixed(1));
    } else {
      vendor.rating = 0;
    }

    await vendor.save();

    return NextResponse.json({
      success: true,
      message: "Review removed successfully.",
    });
  } catch (error: unknown) {
    console.error("Error in DELETE /api/admin/reviews:", error);
    return NextResponse.json({ message: "Failed to delete review." }, { status: 500 });
  }
}
