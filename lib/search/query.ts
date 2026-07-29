import { connectDB } from "@/lib/mongodb";
import { Vendor } from "@/lib/models/Vendor";
import { Venue } from "@/lib/models/Venue";
import { ServiceListing } from "@/lib/models/ServiceListing";
import { categoryBySlug, type SearchQuery } from "@/lib/config/search";
import type { PublicVendor } from "@/components/vendors/PublicVendorDirectory";
import {
  budgetFilter,
  cityFilter,
  escapeRegex,
  guestsFilter,
  mergeFilters,
  textFilter,
  unavailableProviderIds,
} from "./filters";
import {
  serviceToPublicVendor,
  venueToPublicVendor,
  venueToRoomListing,
  withinBudget,
  type ServiceDoc,
  type VenueDoc,
} from "./mappers";

// ─────────────────────────────────────────────────────────────────────────────
// THE search query.
//
// `/[category]`, `/vendors` and `/api/search/count` all call `findListings`, so
// the live count on the hero Search button is produced by exactly the same code
// that produces the results page. A count that can disagree with the page it
// promises is worse than no count at all.
// ─────────────────────────────────────────────────────────────────────────────

/** URLs that predate the current slugs. */
export const CATEGORY_ALIASES: Record<string, string> = {
  accommodation: "rooms",
  photographers: "photography",
  planner: "planners",
  caterer: "caterers",
  decorator: "decorators",
  venue: "venues",
};

/**
 * Legacy rows were written with the display name rather than the slug, and a
 * few with a singular form. Match generously on read.
 */
const LEGACY_CATEGORY_PATTERNS: Record<string, RegExp> = {
  planners: /^planner/i,
  caterers: /^cater/i,
  decorators: /^decor/i,
  photography: /^(photo|video)/i,
  rooms: /^(room|accommodation)/i,
  venues: /^venue/i,
};

export function resolveCategorySlug(segment: string): string {
  return CATEGORY_ALIASES[segment] ?? segment;
}

export function categoryPattern(slug: string): RegExp {
  return LEGACY_CATEGORY_PATTERNS[slug] ?? new RegExp(`^${escapeRegex(slug)}$`, "i");
}

/** Drops providers already booked across the requested dates. */
async function excludeBooked(
  listings: PublicVendor[],
  query: SearchQuery,
): Promise<PublicVendor[]> {
  if (!query.start) return listings;
  const booked = await unavailableProviderIds(query.start, query.end);
  if (booked.size === 0) return listings;
  return listings.filter((l) => !booked.has(l._id));
}

async function findVenues(query: SearchQuery): Promise<PublicVendor[]> {
  const dbVenues = await Venue.find(
    mergeFilters(
      { active: true },
      cityFilter(query.city),
      guestsFilter(query.guests),
      textFilter(query.q),
    ),
  )
    .sort({ featured: -1, rating: -1, createdAt: -1 })
    .lean<VenueDoc[]>();

  return excludeBooked(withinBudget(dbVenues.map(venueToPublicVendor), query.budget), query);
}

async function findRooms(query: SearchQuery): Promise<PublicVendor[]> {
  const city = cityFilter(query.city);
  const guests = guestsFilter(query.guests);
  const text = textFilter(query.q);

  // Rooms come from three places: venues that have rooms, vendor accounts
  // registered under Rooms, and Rooms service listings from the dashboards.
  const [dbVenues, dbVendors, dbServices] = await Promise.all([
    Venue.find(mergeFilters({ active: true, rooms: { $gt: 0 } }, city, text)).lean<VenueDoc[]>(),
    Vendor.find(mergeFilters({ category: "Rooms", verified: true, available: true }, city))
      .select("-passwordHash")
      .lean(),
    ServiceListing.find(
      mergeFilters(
        { category: categoryPattern("rooms"), active: true },
        city,
        guests,
        text,
        budgetFilter(query.budget),
      ),
    ).lean<ServiceDoc[]>(),
  ]);

  const fromVendors = dbVendors.map((v) => ({
    ...v,
    _id: v._id.toString(),
  })) as unknown as PublicVendor[];

  const combined = [
    ...dbVenues.map(venueToRoomListing),
    ...fromVendors,
    ...dbServices.map((s) => serviceToPublicVendor(s, "Rooms")),
  ];

  return excludeBooked(withinBudget(combined, query.budget), query);
}

async function findServices(slug: string, query: SearchQuery): Promise<PublicVendor[]> {
  const services = await ServiceListing.find(
    mergeFilters(
      { active: true, category: categoryPattern(slug) },
      cityFilter(query.city),
      guestsFilter(query.guests),
      budgetFilter(query.budget),
      textFilter(query.q),
    ),
  )
    .sort({ featured: -1, rating: -1, createdAt: -1 })
    .limit(60)
    .lean<ServiceDoc[]>();

  const displayName = categoryBySlug(slug)?.name ?? slug;
  return excludeBooked(
    services.map((s) => serviceToPublicVendor(s, displayName)),
    query,
  );
}

/** No category chosen — the combined directory spans all three sources. */
async function findEverything(query: SearchQuery): Promise<PublicVendor[]> {
  const city = cityFilter(query.city);
  const guests = guestsFilter(query.guests);
  const text = textFilter(query.q);

  const [dbVendors, dbVenues, dbServices] = await Promise.all([
    Vendor.find(mergeFilters({ verified: true, available: true }, city))
      .select("-passwordHash")
      .lean(),
    Venue.find(mergeFilters({ active: true }, city, guests, text)).lean<VenueDoc[]>(),
    ServiceListing.find(
      mergeFilters({ active: true }, city, guests, budgetFilter(query.budget), text),
    )
      .limit(120)
      .lean<ServiceDoc[]>(),
  ]);

  const fromVendors = dbVendors.map((vendor) => ({
    ...vendor,
    _id: vendor._id.toString(),
    priceFrom: vendor.priceFrom ? Number(vendor.priceFrom) : undefined,
  })) as unknown as PublicVendor[];

  const combined = withinBudget(
    [
      ...fromVendors,
      ...dbVenues.map(venueToPublicVendor),
      ...dbServices.map((s) => serviceToPublicVendor(s)),
    ],
    query.budget,
  );

  const available = await excludeBooked(combined, query);

  return available.sort((a, b) => {
    if (a.featured && !b.featured) return -1;
    if (!a.featured && b.featured) return 1;
    return (b.rating || 0) - (a.rating || 0);
  });
}

/**
 * @param slug A category slug (aliases already resolved), or `null` for the
 *   combined directory.
 */
export async function findListings(
  slug: string | null,
  query: SearchQuery,
): Promise<PublicVendor[]> {
  await connectDB();
  if (!slug) return findEverything(query);
  if (slug === "venues") return findVenues(query);
  if (slug === "rooms") return findRooms(query);
  return findServices(slug, query);
}

/** Same query, count only — used by the hero's live result count. */
export async function countListings(
  slug: string | null,
  query: SearchQuery,
): Promise<number> {
  const listings = await findListings(slug, query);
  return listings.length;
}
