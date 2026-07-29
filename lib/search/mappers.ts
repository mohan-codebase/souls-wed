import type { PublicVendor } from "@/components/vendors/PublicVendorDirectory";

// ─────────────────────────────────────────────────────────────────────────────
// Mongo documents → the shape the public directory renders.
//
// `/[category]`, `/vendors` and the venue loaders all used to carry their own
// near-identical copy of this mapping, which is how `/vendors` ended up
// returning `_id: v._id` for venues while `/[category]` returned `venueId` —
// two different ids for the same listing, only one of which matches
// `Booking.providerId`.
// ─────────────────────────────────────────────────────────────────────────────

export interface VenueDoc {
  _id?: unknown;
  venueId?: string;
  name?: string;
  city?: string;
  description?: string;
  rating?: number;
  reviewCount?: number;
  price?: string;
  pricePerPlateVeg?: string;
  rentalCost?: string;
  pricePerRoom?: number;
  rooms?: number;
  image?: string;
  gallery?: string[];
  featured?: boolean;
  verified?: boolean;
}

export interface ServiceDoc {
  serviceId?: string;
  name?: string;
  city?: string;
  category?: string;
  description?: string;
  rating?: number;
  reviewCount?: number;
  priceFrom?: number;
  image?: string;
  gallery?: string[];
  featured?: boolean;
  verified?: boolean;
}

/** Venue prices are free-text ("₹2,50,000 onwards"), so they need parsing. */
export function parsePrice(value: unknown): number | undefined {
  if (typeof value === "number") return value > 0 ? value : undefined;
  if (typeof value !== "string") return undefined;
  const parsed = Number.parseFloat(value.replace(/[₹,\s]/g, ""));
  return Number.isNaN(parsed) || parsed <= 0 ? undefined : parsed;
}

function images(doc: { image?: string; gallery?: string[] }): string[] {
  return doc.image ? [doc.image, ...(doc.gallery ?? [])] : (doc.gallery ?? []);
}

/**
 * `venueId` becomes `_id` so links and `Booking.providerId` lookups line up
 * with what the venue detail page and booking form use.
 */
export function venueToPublicVendor(v: VenueDoc): PublicVendor {
  return {
    _id: String(v.venueId ?? v._id ?? ""),
    businessName: v.name ?? "",
    name: v.name ?? "",
    category: "Venues",
    city: v.city ?? "",
    description: v.description ?? "",
    rating: v.rating ?? 0,
    reviewCount: v.reviewCount ?? 0,
    priceFrom: parsePrice(v.price) ?? parsePrice(v.pricePerPlateVeg),
    images: images(v),
    featured: v.featured ?? false,
    verified: v.verified ?? false,
  };
}

/** A venue presented as room inventory, priced per room where we can derive it. */
export function venueToRoomListing(v: VenueDoc): PublicVendor {
  const rental = parsePrice(v.rentalCost);
  const rooms = v.rooms ?? 0;
  const perRoom =
    typeof v.pricePerRoom === "number" && v.pricePerRoom > 0
      ? v.pricePerRoom
      : rental && rooms > 0
        ? Math.round(rental / rooms)
        : undefined;

  return {
    ...venueToPublicVendor(v),
    businessName: `${v.name ?? "Venue"} (Rooms)`,
    name: `${v.name ?? "Venue"} (Rooms)`,
    category: "Rooms",
    description: `Premium accommodation rooms available at ${v.name ?? "this venue"}. Total rooms: ${rooms}.`,
    priceFrom: perRoom ?? 5000,
  };
}

/**
 * `serviceId` becomes `_id` so the card's `/vendor/{_id}` link resolves via the
 * ServiceListing fallback in /api/vendors.
 *
 * @param categoryName Display name to show on the card; defaults to whatever
 *   the document itself stores.
 */
export function serviceToPublicVendor(s: ServiceDoc, categoryName?: string): PublicVendor {
  return {
    _id: String(s.serviceId ?? ""),
    businessName: s.name ?? "",
    name: s.name ?? "",
    category: categoryName ?? s.category ?? "",
    city: s.city ?? "",
    description: s.description ?? "",
    rating: s.rating ?? 0,
    reviewCount: s.reviewCount ?? 0,
    priceFrom: s.priceFrom,
    images: images(s),
    featured: s.featured ?? false,
    verified: s.verified ?? false,
  };
}

/** Upper price bound applied after mapping, since venue prices are strings. */
export function withinBudget(listings: PublicVendor[], budget: number | null | undefined): PublicVendor[] {
  if (!budget || budget <= 0) return listings;
  return listings.filter((l) => !l.priceFrom || l.priceFrom <= budget);
}
