import { connectDB } from "@/lib/mongodb";
import { Venue } from "@/lib/models/Venue";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { SessionData, sessionOptions } from "@/lib/session";
import { sanitizeMediaList, toVideoEmbedUrl } from "@/lib/media";
import { escapeRegex, guestsFilter, mergeFilters, unavailableProviderIds } from "@/lib/search/filters";

// ─────────────────────────────────────────────────────────────────────────────
// GET — public (active only); vendors/admins see all including inactive
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);

    const query: Record<string, unknown> = {};

    // Check auth to determine if we show inactive venues
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
        // Vendor sees their own inactive venues
      } else {
        query.active = true;
      }
    }

    const country   = searchParams.get("country");
    const city      = searchParams.get("city");
    const featured  = searchParams.get("featured");
    const verified  = searchParams.get("verified");
    const search    = searchParams.get("search");
    const id        = searchParams.get("id");

    // User-supplied values are escaped before reaching $regex — see the note in
    // app/api/vendors/route.ts. Raw interpolation allowed a filter bypass
    // (`?city=^.*$`), leaked driver errors as 500s, and opened a ReDoS vector.
    if (id)       query.venueId  = id;
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
        { type:     { $regex: safe, $options: "i" } },
      ];
    }

    // ── Hero-search filters (docs/hero-search-analysis.md §8) ──
    const toInt = (raw: string | null) => {
      const n = Number.parseInt(raw ?? "", 10);
      return Number.isFinite(n) && n > 0 ? n : null;
    };
    const guests = toInt(searchParams.get("guests"));
    const budget = toInt(searchParams.get("budget"));
    const start = searchParams.get("start");
    const end = searchParams.get("end");

    const filtered = mergeFilters(query, guestsFilter(guests));

    const limit = parseInt(searchParams.get("limit") ?? "100");
    const skip  = parseInt(searchParams.get("skip")  ?? "0");

    let venues = await Venue.find(filtered).limit(limit).skip(skip).lean();

    if (budget) {
      // Venue prices are free-text strings ("₹2,50,000"), so this bound has to
      // be applied after the query rather than inside it.
      const parsePrice = (value: unknown): number | null => {
        if (typeof value === "number") return value > 0 ? value : null;
        if (typeof value !== "string") return null;
        const n = Number.parseFloat(value.replace(/[₹,\s]/g, ""));
        return Number.isNaN(n) ? null : n;
      };
      venues = venues.filter((v: Record<string, unknown>) => {
        const price = parsePrice(v.price) ?? parsePrice(v.pricePerPlateVeg);
        return price == null || price <= budget;
      });
    }

    if (start) {
      const booked = await unavailableProviderIds(start, end);
      if (booked.size > 0) {
        venues = venues.filter((v: Record<string, unknown>) => !booked.has(String(v.venueId)));
      }
    }

    return NextResponse.json({ success: true, venues, total: venues.length });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ message: "Failed to fetch venues.", error: msg }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST — vendor or admin: create a new venue (starts inactive, pending admin)
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn || (session.role !== "admin" && session.role !== "vendor")) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    await connectDB();
    const body = await req.json();

    if (!body.name?.trim() || !body.city?.trim()) {
      return NextResponse.json({ message: "Venue name and city are required." }, { status: 400 });
    }

    const slug = (body.name as string)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const venueId = `venue-${slug}-${Date.now()}`;

    const venue = new Venue({
      vendorId:           session.userId,
      venueId,
      name:               body.name,
      location:           body.location   || body.city,
      city:               body.city,
      country:            body.country    || "India",
      type:               body.type       || "Banquet Hall",
      price:              body.price      || "0",
      priceUnit:          body.priceUnit  || "per day",
      pricePerPlateVeg:   body.pricePerPlateVeg    || "",
      pricePerPlateNonVeg:body.pricePerPlateNonVeg || "",
      rentalCost:         body.rentalCost || "",
      contactPhone:       body.contactPhone || "",
      mapLink:            body.mapLink || "",
      heroImage:          body.heroImage || "",
      videos:             sanitizeMediaList(body.videos).map(toVideoEmbedUrl),
      image:              body.image      || "",
      gallery:            sanitizeMediaList(body.gallery),
      minGuests:          parseInt(body.minGuests) || 50,
      maxGuests:          parseInt(body.maxGuests) || 500,
      rooms:              parseInt(body.rooms)     || 0,
      outdoor:            Boolean(body.outdoor),
      indoor:             body.indoor !== false,
      parking:            Boolean(body.parking),
      catering:           Boolean(body.catering),
      description:        body.description || "",
      features:           Array.isArray(body.features) ? body.features : [],
      verified: false,
      featured: false,
      active:   false, // admin must activate
    });

    await venue.save();
    return NextResponse.json({ success: true, venue }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ message: "Failed to create venue.", error: msg }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH — admin or vendor: update allowed venue fields
// ─────────────────────────────────────────────────────────────────────────────
export async function PATCH(req: Request) {
  try {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn || (session.role !== "admin" && session.role !== "vendor")) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    await connectDB();
    const body = await req.json();
    const { venueId, ...updates } = body;

    if (!venueId) {
      return NextResponse.json({ message: "venueId is required." }, { status: 400 });
    }

    const safeFields = [
      "verified", "featured", "active",
      "name", "city", "location", "country", "type", "description",
      "contactPhone", "mapLink",
      "price", "priceUnit", "pricePerPlateVeg", "pricePerPlateNonVeg", "rentalCost",
      "minGuests", "maxGuests", "rooms",
      "outdoor", "indoor", "parking", "catering",
      "image", "heroImage", "gallery", "videos", "features",
    ];

    const existingVenue = await Venue.findOne({ venueId });
    if (!existingVenue) return NextResponse.json({ message: "Venue not found." }, { status: 404 });

    if (session.role === "vendor" && existingVenue.vendorId !== session.userId) {
      return NextResponse.json({ message: "Unauthorized to edit this venue." }, { status: 403 });
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

    const venue = await Venue.findOneAndUpdate({ venueId }, { $set: allowed }, { new: true });
    if (!venue) return NextResponse.json({ message: "Venue not found." }, { status: 404 });

    return NextResponse.json({ success: true, venue });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ message: "Failed to update venue.", error: msg }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE — admin or vendor: permanently delete a venue
// ─────────────────────────────────────────────────────────────────────────────
export async function DELETE(req: Request) {
  try {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn || (session.role !== "admin" && session.role !== "vendor")) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    await connectDB();
    const { searchParams } = new URL(req.url);
    const venueId = searchParams.get("venueId");

    if (!venueId) {
      return NextResponse.json({ message: "venueId query param is required." }, { status: 400 });
    }

    const existingVenue = await Venue.findOne({ venueId });
    if (!existingVenue) return NextResponse.json({ message: "Venue not found." }, { status: 404 });

    if (session.role === "vendor" && existingVenue.vendorId !== session.userId) {
      return NextResponse.json({ message: "Unauthorized to delete this venue." }, { status: 403 });
    }

    await Venue.deleteOne({ venueId });
    return NextResponse.json({ success: true, message: "Venue deleted." });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ message: "Failed to delete venue.", error: msg }, { status: 500 });
  }
}
