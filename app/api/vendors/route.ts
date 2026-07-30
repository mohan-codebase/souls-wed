import { connectDB } from "@/lib/mongodb";
import mongoose from "mongoose";
import { Vendor } from "@/lib/models/Vendor";
import { ServiceListing } from "@/lib/models/ServiceListing";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { SessionData, sessionOptions } from "@/lib/session";
import { escapeRegex } from "@/lib/search/escape-regex";

// Fields safe to expose on the public vendor discovery API. An explicit
// allow-list, NOT a `-passwordHash` deny-list: the deny-list returned every
// other field, leaking the vendor's `email` plus login telemetry
// (`lastLoginAt` / `lastLoginDevice` / `lastLoginMethod`) and
// `twoFactorEnabled` — the last of which advertises which accounts lack 2FA.
// `reviews` is deliberately omitted; the detail page fetches it from
// /api/vendors/[id]/reviews, and it can carry the reviewer's identity.
const PUBLIC_VENDOR_FIELDS =
  "name businessName category categories city country description website instagram rating reviewCount advancePercentage unavailableDates profileImage images featured verified available faqs createdAt";

export async function GET(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const country = searchParams.get("country");
    const city = searchParams.get("city");
    const featured = searchParams.get("featured");
    const search = searchParams.get("search");
    const id = searchParams.get("id");

    if (id) {
      let vendor: any = null;
      if (mongoose.Types.ObjectId.isValid(id)) {
        vendor = await Vendor.findById(id).select(PUBLIC_VENDOR_FIELDS).lean();
      }

      if (!vendor) {
        // Fallback to check if this is a serviceId
        const service = await ServiceListing.findOne({ serviceId: id }).lean();
        if (service) {
          vendor = {
            _id: service.serviceId,
            name: service.name,
            businessName: service.name,
            category: service.category,
            city: service.city,
            country: service.country,
            priceFrom: service.priceFrom,
            rating: service.rating || 0,
            reviewCount: service.reviewCount || 0,
            images: service.image ? [service.image, ...(Array.isArray(service.gallery) ? service.gallery : [])] : [],
            featured: service.featured,
            verified: service.verified,
            description: service.description,
            features: service.features,
            heroImage: service.heroImage,
            gallery: Array.isArray(service.gallery) ? service.gallery : [],
            videos: Array.isArray(service.videos) ? service.videos : [],
            contactPhone: service.contactPhone,
            mapLink: service.mapLink
          };
        }
      }

      if (!vendor) {
        return NextResponse.json({ success: false, message: "Vendor not found." }, { status: 404 });
      }
      return NextResponse.json({ success: true, vendors: [vendor], vendor });
    }

    const query: Record<string, unknown> = {
      verified: true,
      available: true,
    };

    // Every user-supplied value is escaped before it reaches $regex. Without
    // this, `?city=^.*$` matches every document (filter bypass) and a malformed
    // pattern like `?search=(((` throws a driver error that leaked straight to
    // the client as a 500 — and a catastrophic pattern is a ReDoS vector.
    if (category) query.category = { $regex: `^${escapeRegex(category)}$`, $options: "i" };
    if (country) query.country = { $regex: escapeRegex(country), $options: "i" };
    if (city) query.city = { $regex: escapeRegex(city), $options: "i" };
    if (featured) query.featured = true;
    if (search) {
      const safe = escapeRegex(search);
      query.$or = [
        { businessName: { $regex: safe, $options: "i" } },
        { name: { $regex: safe, $options: "i" } },
        { category: { $regex: safe, $options: "i" } },
        { city: { $regex: safe, $options: "i" } },
      ];
    }

    const vendors = await Vendor.find(query)
      .select(PUBLIC_VENDOR_FIELDS)
      .sort({ featured: -1, rating: -1, createdAt: -1 })
      .limit(60)
      .lean();

    return NextResponse.json({ success: true, vendors });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch vendors.";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getIronSession<SessionData>(
      await cookies(),
      sessionOptions
    );

    if (!session.isLoggedIn || session.role !== "vendor") {
      return NextResponse.json({ message: "Vendor login required." }, { status: 401 });
    }

    await connectDB();
    const body = await req.json();

    const allowed: Record<string, unknown> = {};
    const listingFields = [
      "businessName",
      "name",
      "phone",
      "category",
      "city",
      "country",
      "description",
      "website",
      "instagram",
      "priceFrom",
      "images",
    ];

    // profileImage is safe to update without triggering re-approval
    if (body.profileImage !== undefined) {
      allowed.profileImage = typeof body.profileImage === "string" ? body.profileImage.trim().slice(0, 500) : "";
    }

    for (const field of listingFields) {
      if (body[field] !== undefined) allowed[field] = sanitizeVendorField(field, body[field]);
    }

    if (body.available !== undefined) {
      allowed.available = Boolean(body.available);
    }

    if (body.unavailableDates !== undefined) {
      allowed.unavailableDates = sanitizeUnavailableDates(body.unavailableDates);
    }

    const hasListingChanges = listingFields.some((field) => body[field] !== undefined);
    if (hasListingChanges) {
      allowed.verified = false;
      allowed.featured = false;
    }

    const vendor = await Vendor.findByIdAndUpdate(
      session.userId,
      { $set: allowed },
      { new: true, runValidators: true }
    ).select("-passwordHash");

    if (!vendor) {
      return NextResponse.json({ message: "Vendor profile not found." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: hasListingChanges
        ? "Profile saved and sent back to admin approval."
        : "Availability updated.",
      vendor,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update vendor profile.";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

function sanitizeVendorField(field: string, value: unknown) {
  if (field === "priceFrom") {
    const price = Number(value);
    return Number.isFinite(price) && price >= 0 ? price : undefined;
  }

  if (field === "images") {
    if (Array.isArray(value)) {
      return value.map(String).map((item) => item.trim()).filter(Boolean).slice(0, 6);
    }
    if (typeof value === "string") {
      return value.split("\n").map((item) => item.trim()).filter(Boolean).slice(0, 6);
    }
    return [];
  }

  return typeof value === "string" ? value.trim().slice(0, field === "description" ? 600 : 120) : value;
}

function sanitizeUnavailableDates(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => new Date(item as string))
    .filter((date) => !Number.isNaN(date.getTime()))
    .slice(0, 200);
}
