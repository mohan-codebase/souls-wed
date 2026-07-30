import { connectDB } from "@/lib/mongodb";
import { PageView } from "@/lib/models/PageView";
import { Venue } from "@/lib/models/Venue";
import { ServiceListing } from "@/lib/models/ServiceListing";
import { hit, clientIp, LIMITS, tooManyRequests } from "@/lib/rate-limit";
import { NextResponse } from "next/server";

// POST — record one page view (public, fire-and-forget from detail pages)
export async function POST(req: Request) {
  try {
    // This endpoint is anonymous and writes a document per call. Without a cap
    // and an existence check, anyone can script unbounded inserts to bloat the
    // collection and inflate a chosen provider's view count and "demand" badge.
    const rl = await hit(`view:${clientIp(req)}`, LIMITS.VIEW_TRACK.limit, LIMITS.VIEW_TRACK.windowMs);
    if (!rl.ok) {
      return tooManyRequests("Too many requests.", rl.retryAfter);
    }

    await connectDB();
    const body = await req.json();
    const providerId = String(body.providerId || "").slice(0, 200);
    const providerType = body.providerType === "vendor" ? "vendor" : "venue";

    if (!providerId) {
      return NextResponse.json({ message: "providerId is required." }, { status: 400 });
    }

    // Only record views for a listing that actually exists, so the collection
    // can't be seeded with counts for arbitrary/garbage ids.
    const exists =
      (await Venue.exists({ venueId: providerId })) ||
      (await ServiceListing.exists({ serviceId: providerId }));
    if (!exists) {
      return NextResponse.json({ message: "Unknown provider." }, { status: 404 });
    }

    await new PageView({ providerId, providerType }).save();
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to record view.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

// GET — raw view timestamps for a provider, for charting real monthly trends
export async function GET(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const providerId = searchParams.get("providerId");
    if (!providerId) {
      return NextResponse.json({ message: "providerId is required." }, { status: 400 });
    }

    const views = await PageView.find({ providerId }).select("viewedAt -_id").limit(5000).lean();
    return NextResponse.json({ success: true, views });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch views.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
