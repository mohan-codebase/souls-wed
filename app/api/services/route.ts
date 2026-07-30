import { connectDB } from "@/lib/mongodb";
import { ServiceListing } from "@/lib/models/ServiceListing";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { SessionData, sessionOptions } from "@/lib/session";
import { sanitizeMediaList, toVideoEmbedUrl } from "@/lib/media";
import { escapeRegex } from "@/lib/search/filters";

// ─────────────────────────────────────────────────────────────────────────────
// GET — public (active only); vendors/admins see all including inactive
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);

    const query: Record<string, unknown> = {};

    // Check auth to determine if we show inactive services
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
    
    const forVendorId = searchParams.get("vendorId");
    if (forVendorId) {
      query.vendorId = forVendorId;
    }

    if (!session.isLoggedIn) {
      query.active = true;
    } else if (session.role === "admin") {
      // Admin sees all
    } else if (session.role === "vendor") {
      if (forVendorId === session.userId) {
        // Vendor sees their own inactive services
      } else {
        query.active = true;
      }
    }

    const category = searchParams.get("category");
    if (category) query.category = category;

    const id = searchParams.get("id");
    const country = searchParams.get("country");
    const city = searchParams.get("city");
    const featured = searchParams.get("featured");
    const verified = searchParams.get("verified");
    const search = searchParams.get("search");

    // User-supplied values are escaped before reaching $regex — see the note in
    // app/api/vendors/route.ts. Raw interpolation allowed a filter bypass
    // (`?city=^.*$`), leaked driver errors as 500s, and opened a ReDoS vector.
    if (id)       query.serviceId  = id;
    if (country)  query.country  = { $regex: escapeRegex(country), $options: "i" };
    if (city)     query.city     = { $regex: escapeRegex(city), $options: "i" };
    if (featured) query.featured = true;
    if (verified) query.verified = true;
    if (search) {
      const safe = escapeRegex(search);
      query.$or = [
        { name:     { $regex: safe, $options: "i" } },
        { city:     { $regex: safe, $options: "i" } },
        { location: { $regex: safe, $options: "i" } },
      ];
    }

    const limit = parseInt(searchParams.get("limit") ?? "100");
    const skip  = parseInt(searchParams.get("skip")  ?? "0");

    const services = await ServiceListing.find(query).limit(limit).skip(skip).lean();
    return NextResponse.json({ success: true, services, total: services.length });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ message: "Failed to fetch services.", error: msg }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST — vendor or admin: create a new service (starts inactive, pending admin)
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn || (session.role !== "admin" && session.role !== "vendor")) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    await connectDB();
    const body = await req.json();

    if (!body.name?.trim() || !body.city?.trim() || !body.category?.trim()) {
      return NextResponse.json({ message: "Service name, category, and city are required." }, { status: 400 });
    }

    const slug = (body.name as string)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const serviceId = `${body.category}-${slug}-${Date.now()}`;

    const service = new ServiceListing({
      vendorId:           session.userId,
      serviceId,
      category:           body.category,
      name:               body.name,
      location:           body.location   || body.city,
      city:               body.city,
      country:            body.country    || "India",
      priceFrom:          parseFloat(body.priceFrom) || 0,
      priceUnit:          body.priceUnit  || "per event",
      pricePerPlateVeg:   body.pricePerPlateVeg || "",
      pricePerPlateNonVeg:body.pricePerPlateNonVeg || "",
      rentalCost:         body.rentalCost || "",
      minGuests:          parseInt(body.minGuests) || 0,
      maxGuests:          parseInt(body.maxGuests) || 0,
      rooms:              parseInt(body.rooms) || 0,
      outdoor:            Boolean(body.outdoor),
      indoor:             body.indoor !== false,
      parking:            Boolean(body.parking),
      catering:           Boolean(body.catering),
      contactPhone:       body.contactPhone || "",
      mapLink:            body.mapLink || "",
      heroImage:          body.heroImage || "",
      videos:             sanitizeMediaList(body.videos).map(toVideoEmbedUrl),
      image:              body.image      || "",
      gallery:            sanitizeMediaList(body.gallery),
      description:        body.description || "",
      features:           Array.isArray(body.features) ? body.features : [],
      verified: false,
      featured: false,
      active:   false, // admin must activate
    });

    await service.save();
    return NextResponse.json({ success: true, service }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ message: "Failed to create service.", error: msg }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH — admin or vendor: update allowed service fields
// ─────────────────────────────────────────────────────────────────────────────
export async function PATCH(req: Request) {
  try {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn || (session.role !== "admin" && session.role !== "vendor")) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    await connectDB();
    const body = await req.json();
    const { serviceId, ...updates } = body;

    if (!serviceId) {
      return NextResponse.json({ message: "serviceId is required." }, { status: 400 });
    }

    const safeFields = [
      "verified", "featured", "active",
      "name", "city", "country", "location", "category", "description",
      "contactPhone", "mapLink",
      "priceFrom", "priceUnit", "pricePerPlateVeg", "pricePerPlateNonVeg", "rentalCost",
      "minGuests", "maxGuests", "rooms", "outdoor", "indoor", "parking", "catering",
      "image", "heroImage", "gallery", "videos", "features",
    ];

    const existingService = await ServiceListing.findOne({ serviceId });
    if (!existingService) return NextResponse.json({ message: "Service not found." }, { status: 404 });

    if (session.role === "vendor" && existingService.vendorId !== session.userId) {
      return NextResponse.json({ message: "Unauthorized to edit this service." }, { status: 403 });
    }

    const allowed: Record<string, unknown> = {};
    for (const field of safeFields) {
      if (updates[field] !== undefined) allowed[field] = updates[field];
    }

    if (allowed.gallery !== undefined) allowed.gallery = sanitizeMediaList(allowed.gallery);
    if (allowed.videos !== undefined) allowed.videos = sanitizeMediaList(allowed.videos).map(toVideoEmbedUrl);

    // Vendors cannot flip admin-only flags
    if (session.role === "vendor") {
      delete allowed.verified;
      delete allowed.featured;
      delete allowed.active;
    }

    allowed.updatedAt = new Date();

    const service = await ServiceListing.findOneAndUpdate({ serviceId }, { $set: allowed }, { new: true });
    if (!service) return NextResponse.json({ message: "Service not found." }, { status: 404 });

    return NextResponse.json({ success: true, service });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ message: "Failed to update service.", error: msg }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// DELETE — admin or vendor: permanently delete a service
// ─────────────────────────────────────────────────────────────────────────────
export async function DELETE(req: Request) {
  try {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn || (session.role !== "admin" && session.role !== "vendor")) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    await connectDB();
    const { searchParams } = new URL(req.url);
    const serviceId = searchParams.get("serviceId");

    if (!serviceId) {
      return NextResponse.json({ message: "serviceId query param is required." }, { status: 400 });
    }

    const existingService = await ServiceListing.findOne({ serviceId });
    if (!existingService) return NextResponse.json({ message: "Service not found." }, { status: 404 });

    if (session.role === "vendor" && existingService.vendorId !== session.userId) {
      return NextResponse.json({ message: "Unauthorized to delete this service." }, { status: 403 });
    }

    await ServiceListing.deleteOne({ serviceId });
    return NextResponse.json({ success: true, message: "Service deleted." });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ message: "Failed to delete service.", error: msg }, { status: 500 });
  }
}
