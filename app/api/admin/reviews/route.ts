/**
 * ADMIN REVIEW MODERATION
 *
 * Reviews live on the listing they describe, and there are three kinds of
 * listing: `Vendor`, `Venue` and `ServiceListing`. This route originally read
 * `Vendor.reviews` only — but customers review venues and services, whose
 * reviews are written by `POST /api/venues/[id]/reviews` and
 * `POST /api/vendors/[id]/reviews` onto `Venue.reviews` / `ServiceListing.reviews`.
 * The moderation queue therefore could not see any real review, and reported
 * "No reviews found" no matter how many existed.
 *
 * Each review is returned with the `sourceType` it came from so DELETE can find
 * it again without guessing.
 */

import { connectDB } from "@/lib/mongodb";
import { Vendor } from "@/lib/models/Vendor";
import { Venue } from "@/lib/models/Venue";
import { ServiceListing } from "@/lib/models/ServiceListing";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { SessionData, sessionOptions } from "@/lib/session";

type SourceType = "vendor" | "venue" | "service";

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

/** The model and display name for each kind of listing that can hold reviews. */
const SOURCES = {
  vendor: { model: Vendor, label: (d: any) => d.businessName || d.name },
  venue: { model: Venue, label: (d: any) => d.name },
  service: { model: ServiceListing, label: (d: any) => d.name },
} as const;

export async function GET() {
  try {
    if (!(await checkAdminSession())) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    await connectDB();

    const allReviews: any[] = [];

    for (const [sourceType, cfg] of Object.entries(SOURCES) as [
      SourceType,
      (typeof SOURCES)[SourceType],
    ][]) {
      const docs = await (cfg.model as any)
        .find({ "reviews.0": { $exists: true } })
        .select("_id name businessName reviews rating")
        .lean();

      for (const d of docs) {
        for (const r of d.reviews ?? []) {
          allReviews.push({
            reviewId: r._id || r.id,
            sourceType,
            // Kept as `vendorId` for backwards compatibility with the existing
            // admin UI, which passes it straight back to DELETE.
            vendorId: d._id,
            vendorName: cfg.label(d),
            author: r.author || "Anonymous Couple",
            rating: r.rating || 5,
            text: r.text || "",
            date: r.date || r.createdAt,
            avatar: r.avatar || "",
          });
        }
      }
    }

    // Newest first where we have a usable date.
    allReviews.sort(
      (a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()
    );

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
    const sourceType = (searchParams.get("sourceType") || "") as SourceType | "";

    if (!vendorId || !reviewId) {
      return NextResponse.json(
        { message: "Listing ID and Review ID are required." },
        { status: 400 }
      );
    }

    // Prefer the sourceType the list handed back; fall back to trying each
    // collection, so an older client that doesn't send it still works.
    const order: SourceType[] = sourceType
      ? [sourceType]
      : ["vendor", "venue", "service"];

    for (const type of order) {
      const model = SOURCES[type].model as any;
      const doc = await model.findById(vendorId);
      if (!doc) continue;

      const before = (doc.reviews ?? []).length;
      doc.reviews = (doc.reviews ?? []).filter(
        (r: any) => String(r._id || r.id) !== String(reviewId)
      );
      if (doc.reviews.length === before) continue; // not this one

      // Keep the aggregate rating honest after removal.
      doc.reviewCount = doc.reviews.length;
      doc.rating = doc.reviews.length
        ? Number(
            (
              doc.reviews.reduce(
                (acc: number, r: any) => acc + (r.rating || 5),
                0
              ) / doc.reviews.length
            ).toFixed(1)
          )
        : 0;

      await doc.save();
      return NextResponse.json({
        success: true,
        message: "Review removed successfully.",
      });
    }

    return NextResponse.json({ message: "Review not found." }, { status: 404 });
  } catch (error: unknown) {
    console.error("Error in DELETE /api/admin/reviews:", error);
    return NextResponse.json({ message: "Failed to remove review." }, { status: 500 });
  }
}
