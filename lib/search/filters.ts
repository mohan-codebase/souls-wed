import { Booking } from "@/lib/models/Booking";
import type { SearchQuery } from "@/lib/config/search";

// ─────────────────────────────────────────────────────────────────────────────
// Turns the hero search URL contract into Mongo query fragments.
//
// Kept in one place so `/[category]`, `/vendors` and `/venues` cannot disagree
// about what `?guests=250` means. See docs/hero-search-analysis.md §8.
// ─────────────────────────────────────────────────────────────────────────────

// Lives in its own import-free module so it can be unit-tested; re-exported here
// so existing call sites keep importing it from "@/lib/search/filters".
export { escapeRegex } from "./escape-regex";
import { escapeRegex } from "./escape-regex";

/** Case-insensitive substring match on `city`. */
export function cityFilter(city: string | null | undefined): Record<string, unknown> {
  if (!city?.trim()) return {};
  return { city: { $regex: escapeRegex(city.trim()), $options: "i" } };
}

/**
 * `minGuests <= guests <= maxGuests`, treating a missing or zero bound as
 * "unconstrained" — most listings only fill in one side, and dropping them
 * would empty the results for no good reason.
 */
export function guestsFilter(guests: number | null | undefined): Record<string, unknown> {
  if (!guests || guests <= 0) return {};
  const unbounded = (field: string, comparison: Record<string, number>) => ({
    $or: [
      { [field]: comparison },
      { [field]: { $exists: false } },
      { [field]: null },
      { [field]: 0 },
    ],
  });
  return { $and: [unbounded("minGuests", { $lte: guests }), unbounded("maxGuests", { $gte: guests })] };
}

/** Upper bound on `priceFrom`. Listings with no price set are kept. */
export function budgetFilter(budget: number | null | undefined): Record<string, unknown> {
  if (!budget || budget <= 0) return {};
  return {
    $or: [
      { priceFrom: { $lte: budget } },
      { priceFrom: { $exists: false } },
      { priceFrom: null },
      { priceFrom: 0 },
    ],
  };
}

/** Free-text match across the fields a couple would actually type. */
export function textFilter(q: string | null | undefined): Record<string, unknown> {
  if (!q?.trim()) return {};
  const regex = { $regex: escapeRegex(q.trim()), $options: "i" };
  return { $or: [{ name: regex }, { city: regex }, { location: regex }, { description: regex }] };
}

/**
 * Merges fragments, collecting every `$or` into a single `$and` so that two
 * filters both using `$or` don't silently overwrite each other.
 */
export function mergeFilters(...fragments: Record<string, unknown>[]): Record<string, unknown> {
  const merged: Record<string, unknown> = {};
  const conjunctions: Record<string, unknown>[] = [];

  for (const fragment of fragments) {
    for (const [key, value] of Object.entries(fragment)) {
      if (key === "$or") conjunctions.push({ $or: value });
      else if (key === "$and" && Array.isArray(value)) conjunctions.push(...value);
      else merged[key] = value;
    }
  }

  if (conjunctions.length === 1) Object.assign(merged, conjunctions[0]);
  else if (conjunctions.length > 1) merged.$and = conjunctions;

  return merged;
}

/**
 * Provider IDs with a pending or confirmed booking overlapping [start, end].
 *
 * `Booking.providerId` holds `Venue.venueId` for venues and
 * `ServiceListing.serviceId` for services, so the returned set can be matched
 * against either collection.
 */
export async function unavailableProviderIds(
  start: string | null | undefined,
  end: string | null | undefined,
): Promise<Set<string>> {
  if (!start) return new Set();

  const from = new Date(`${start}T00:00:00.000Z`);
  const to = new Date(`${end || start}T23:59:59.999Z`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return new Set();

  const bookings = await Booking.find({
    status: { $in: ["pending", "confirmed"] },
    $or: [
      { eventDates: { $elemMatch: { $gte: from, $lte: to } } },
      { eventDate: { $gte: from, $lte: to } },
      // Room stays overlap the window if they start before it ends and end
      // after it starts.
      { checkIn: { $lte: to }, checkOut: { $gte: from } },
    ],
  })
    .select("providerId")
    .lean();

  return new Set(
    bookings
      .map((b) => (b as { providerId?: unknown }).providerId)
      .filter((id): id is string => typeof id === "string" && id.length > 0),
  );
}

/** True when any field of the search query is actually set. */
export function hasActiveFilters(query: SearchQuery): boolean {
  return Boolean(query.city || query.q || query.guests || query.budget || query.start);
}

/** Human-readable summary of the applied filters, for the results heading. */
export function describeFilters(query: SearchQuery): string[] {
  const parts: string[] = [];
  if (query.city) parts.push(query.city);
  if (query.guests) parts.push(`${query.guests.toLocaleString("en-IN")} guests`);
  if (query.start) {
    parts.push(query.end && query.end !== query.start ? `${query.start} → ${query.end}` : query.start);
  }
  if (query.budget) parts.push(`under ₹${query.budget.toLocaleString("en-IN")}`);
  if (query.q) parts.push(`“${query.q}”`);
  return parts;
}
