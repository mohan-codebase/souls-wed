import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Venue } from "@/lib/models/Venue";
import { ServiceListing } from "@/lib/models/ServiceListing";
import { VENDOR_CATEGORIES } from "@/lib/config/categories";
import { categoryBySlug } from "@/lib/config/search";
import { escapeRegex } from "@/lib/search/filters";
import { categoryPattern, resolveCategorySlug } from "@/lib/search/query";

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/search/suggest?q=&category=&limit=
//
// Powers the hero search typeahead. Cities come from the listings that actually
// exist, so we can never again offer a destination with zero inventory
// (docs/hero-search-analysis.md §2.3).
//
// When a category is selected the city list narrows to that category — showing
// "Dubai, UAE · 2 listings" to someone shopping for caterers, when those two
// listings are room providers, is the same defect one level down.
//
// With no `q` this returns the top cities by listing count — the "popular
// destinations" state the dropdown shows before the user types.
// ─────────────────────────────────────────────────────────────────────────────

export const dynamic = "force-dynamic";
export const revalidate = 0;

export interface CitySuggestion {
  city: string;
  count: number;
}

export interface ListingSuggestion {
  name: string;
  city: string;
  category: string;
  href: string;
}

export interface CategorySuggestion {
  slug: string;
  name: string;
}

/** Which collections a category draws from, mirroring lib/search/query.ts. */
function sourcesFor(slug: string | null): { venues: boolean; services: boolean } {
  if (!slug) return { venues: true, services: true };
  if (slug === "venues") return { venues: true, services: false };
  if (slug === "rooms") return { venues: true, services: true };
  return { venues: false, services: true };
}

/** Counts listings per city across the relevant collections and merges tallies. */
async function topCities(
  match: string | null,
  slug: string | null,
  limit: number,
): Promise<CitySuggestion[]> {
  const { venues, services } = sourcesFor(slug);

  const cityMatch: Record<string, unknown> = {};
  if (match) cityMatch.city = { $regex: `^${escapeRegex(match)}`, $options: "i" };

  const group = [{ $group: { _id: { $trim: { input: "$city" } }, count: { $sum: 1 } } }];

  // `rooms` means venues that actually have rooms, not every venue.
  const venueMatch: Record<string, unknown> =
    slug === "rooms" ? { active: true, rooms: { $gt: 0 }, ...cityMatch } : { active: true, ...cityMatch };

  const serviceMatch: Record<string, unknown> = { active: true, ...cityMatch };
  if (slug) serviceMatch.category = categoryPattern(slug);

  const [venueCities, serviceCities] = await Promise.all([
    venues ? Venue.aggregate([{ $match: venueMatch }, ...group]) : Promise.resolve([]),
    services ? ServiceListing.aggregate([{ $match: serviceMatch }, ...group]) : Promise.resolve([]),
  ]);

  const tally = new Map<string, CitySuggestion>();
  for (const row of [...venueCities, ...serviceCities]) {
    const city = String(row._id ?? "").trim();
    if (!city) continue;
    const key = city.toLowerCase();
    const existing = tally.get(key);
    if (existing) existing.count += row.count;
    else tally.set(key, { city, count: row.count });
  }

  return [...tally.values()]
    .sort((a, b) => b.count - a.count || a.city.localeCompare(b.city))
    .slice(0, limit);
}

async function matchingListings(
  match: string,
  slug: string | null,
  limit: number,
): Promise<ListingSuggestion[]> {
  const regex = { $regex: escapeRegex(match), $options: "i" };
  const nameOrLocation = { $or: [{ name: regex }, { location: regex }] };
  const { venues, services } = sourcesFor(slug);

  // With no category chosen, also match a listing's own category — otherwise
  // "photo" surfaces the Photography category suggestion but not individual
  // photographers, whose names rarely contain the word.
  const serviceFilter: Record<string, unknown> = slug
    ? { active: true, category: categoryPattern(slug), ...nameOrLocation }
    : { active: true, $or: [{ name: regex }, { location: regex }, { category: regex }] };

  const [dbVenues, dbServices] = await Promise.all([
    venues
      ? Venue.find({ active: true, ...nameOrLocation }).select("venueId name city").limit(limit).lean()
      : Promise.resolve([]),
    services
      ? ServiceListing.find(serviceFilter).select("serviceId name city category").limit(limit).lean()
      : Promise.resolve([]),
  ]);

  const fromVenues: ListingSuggestion[] = dbVenues.map((v: Record<string, unknown>) => ({
    name: String(v.name ?? ""),
    city: String(v.city ?? ""),
    category: "Venues",
    href: `/venues/${String(v.venueId ?? "")}`,
  }));

  const fromServices: ListingSuggestion[] = dbServices.map((s: Record<string, unknown>) => ({
    name: String(s.name ?? ""),
    city: String(s.city ?? ""),
    category: String(s.category ?? ""),
    href: `/vendor/${String(s.serviceId ?? "")}`,
  }));

  return [...fromVenues, ...fromServices].slice(0, limit);
}

function matchingCategories(match: string, limit: number): CategorySuggestion[] {
  const needle = match.toLowerCase();
  return VENDOR_CATEGORIES.filter(
    (c) => c.name.toLowerCase().includes(needle) || c.tagline.toLowerCase().includes(needle),
  )
    .slice(0, limit)
    .map((c) => ({ slug: c.slug, name: c.name }));
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") ?? "").trim().slice(0, 60);
    const limit = Math.min(Math.max(Number.parseInt(searchParams.get("limit") ?? "6", 10) || 6, 1), 12);

    const rawCategory = searchParams.get("category");
    const resolved = rawCategory ? resolveCategorySlug(rawCategory) : null;
    // Ignore an unknown slug rather than narrowing to nothing.
    const slug = resolved && categoryBySlug(resolved) ? resolved : null;

    await connectDB();

    if (!q) {
      return NextResponse.json({
        success: true,
        query: "",
        cities: await topCities(null, slug, limit),
        listings: [],
        categories: [],
      });
    }

    const [cities, listings] = await Promise.all([
      topCities(q, slug, limit),
      matchingListings(q, slug, limit),
    ]);

    return NextResponse.json({
      success: true,
      query: q,
      cities,
      listings,
      // Only suggest switching category when one isn't already chosen.
      categories: slug ? [] : matchingCategories(q, 4),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    // A failing typeahead must never break the hero — return an empty result set.
    console.error("Search suggest failed:", message);
    return NextResponse.json(
      { success: false, cities: [], listings: [], categories: [] },
      { status: 200 },
    );
  }
}
