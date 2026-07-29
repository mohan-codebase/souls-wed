/**
 * SERVER-SIDE BOOKING PRICE AUTHORITY
 *
 * WHY THIS FILE EXISTS
 *
 * `POST /api/bookings` used to take `totalAmount` straight from the request body.
 * That meant anyone could book a ₹1,44,000 venue for ₹1 — and, because unpaid
 * "pending" bookings still block the calendar, squat a venue's dates for free.
 *
 * Prices must be derived from what's in the database, never from the client.
 * This module is the single source of truth for that calculation.
 *
 * IMPORTANT — KEEP IN SYNC WITH THE CLIENT
 *
 * The formulas below intentionally mirror `components/booking/BookingForm.tsx`
 * (the `priceBreakdown` useMemo) and the props fed to it by
 * `components/venues/VenueSidebar.tsx` and `components/vendors/VendorSidebar.tsx`.
 * The client still computes a price so the user sees a live total; the server
 * recomputes it and rejects the request if the two disagree. If you change a
 * pricing rule in one place, change it in both — the mismatch check will fail
 * loudly rather than silently overcharging, which is the intended behaviour.
 */

import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { Venue } from "@/lib/models/Venue";
import { ServiceListing } from "@/lib/models/ServiceListing";
import { Vendor } from "@/lib/models/Vendor";

/** Indian wedding venues typically take 20–50% up front; 30% is the platform default. */
export const DEFAULT_ADVANCE_PERCENTAGE = 30;

/**
 * Prices are stored inconsistently — sometimes `"₹38,000"`, sometimes `"38000"`,
 * sometimes a raw number. Same normalisation the client uses.
 */
export function parsePrice(priceStr?: string | number | null): number {
  if (typeof priceStr === "number") return Number.isFinite(priceStr) ? priceStr : 0;
  if (!priceStr) return 0;
  const cleaned = priceStr.toString().replace(/[^0-9]/g, "");
  return parseInt(cleaned, 10) || 0;
}

/** Nights between two dates, floored at 1 (a same-day check-in/out still costs one night). */
export function calculateNights(checkIn: string | Date, checkOut: string | Date): number {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const diff = end.getTime() - start.getTime();
  if (!Number.isFinite(diff)) return 1;
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export type BookingKind = "venue" | "room" | "vendor";

export interface QuoteRequest {
  bookingType: string;
  guestCount?: number;
  roomCount?: number;
  hours?: number;
  menuType?: "veg" | "nonveg";
  eventDates?: (string | Date)[];
  checkIn?: string | Date | null;
  checkOut?: string | Date | null;
}

export interface Quote {
  totalAmount: number;
  advanceAmount: number;
  advancePercentage: number;
  /** The booking type the provider actually supports — the client must match this. */
  expectedBookingType: BookingKind;
  providerName: string;
  /** Persist this as the booking's providerId — see ResolvedProvider.canonicalId. */
  canonicalProviderId: string;
  providerImage: string;
  providerKind: "venue" | "service" | "vendor";
  /** Guest bounds, so the caller can validate headcount against the listing. */
  minGuests: number;
  maxGuests: number;
}

export class PricingError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "PricingError";
    this.status = status;
  }
}

/**
 * The pricing inputs for a listing, normalised across the three ways a
 * bookable thing can be stored (Venue / ServiceListing / Vendor account).
 */
interface ResolvedProvider {
  name: string;
  /**
   * The id this listing should be referenced by everywhere — `Venue.venueId`
   * or `ServiceListing.serviceId`. Callers must persist THIS, not whatever the
   * client sent: seed data once stored a Venue's raw `_id` as providerId, which
   * made those bookings invisible to the vendor query and, worse, invisible to
   * the double-booking check (which matches providerId as an exact string).
   */
  canonicalId: string;
  /** Thumbnail, denormalised onto the booking so cards don't need a second lookup. */
  image: string;
  kind: "venue" | "service" | "vendor";
  expectedBookingType: BookingKind;
  advancePercentage: number;
  pricePerPlateVeg: number;
  pricePerPlateNonVeg: number;
  rentalCost: number;
  pricePerRoom: number;
  fixedPrice: number;
  hourlyPrice: number;
  minGuests: number;
  maxGuests: number;
}

/**
 * Mirrors the category branching in `VendorSidebar.tsx` — a caterer is priced
 * per plate, a room listing per night, everything else a flat fee per day.
 */
function resolveServicePricing(
  name: string,
  canonicalId: string,
  image: string,
  category: string | undefined,
  priceFromRaw: unknown,
  advancePercentageRaw: unknown,
  kind: "service" | "vendor"
): ResolvedProvider {
  const cat = (category || "Vendor").toLowerCase();
  const isVenueLike = cat.includes("venue") || cat.includes("banquet");
  const isRoom = cat.includes("room") || cat.includes("accommodation");
  const isCaterer = cat.includes("cater");
  const isPerPlate = isVenueLike || isCaterer;

  const priceFrom = parsePrice(priceFromRaw as string | number);
  const advancePercentage =
    typeof advancePercentageRaw === "number" && advancePercentageRaw > 0
      ? advancePercentageRaw
      : DEFAULT_ADVANCE_PERCENTAGE;

  const base: ResolvedProvider = {
    name,
    canonicalId,
    image,
    kind,
    expectedBookingType: "vendor",
    advancePercentage,
    pricePerPlateVeg: 0,
    pricePerPlateNonVeg: 0,
    rentalCost: 0,
    pricePerRoom: 0,
    fixedPrice: 0,
    hourlyPrice: 0,
    // Service listings don't carry guest bounds; use permissive defaults.
    minGuests: 1,
    maxGuests: 100_000,
  };

  if (isPerPlate) {
    return {
      ...base,
      expectedBookingType: "venue",
      pricePerPlateVeg: priceFrom || 50000,
      pricePerPlateNonVeg: Math.round((priceFrom || 50000) * 1.2),
      rentalCost: priceFrom ? priceFrom * 5 : 250000,
    };
  }

  if (isRoom) {
    return {
      ...base,
      expectedBookingType: "room",
      pricePerRoom: priceFrom || 5000,
    };
  }

  return { ...base, expectedBookingType: "vendor", fixedPrice: priceFrom || 25000 };
}

/**
 * Find whatever `providerId` points at. The platform uses three id conventions:
 *   - `Venue.venueId`          e.g. "venue-refinery-1"
 *   - `ServiceListing.serviceId` e.g. "decorator-enchanted-1"
 *   - `Vendor._id`             a raw ObjectId (vendor account booked directly)
 */
async function resolveProvider(providerId: string): Promise<ResolvedProvider | null> {
  const isObjectId = mongoose.Types.ObjectId.isValid(providerId);

  const venue = await Venue.findOne({
    $or: [{ venueId: providerId }, ...(isObjectId ? [{ _id: providerId }] : [])],
  }).lean();

  if (venue) {
    // VenueSidebar falls back to `price` when `rentalCost` is blank.
    const rentalCost = parsePrice(venue.rentalCost || venue.price);
    return {
      name: venue.name,
      canonicalId: venue.venueId,
      image: venue.heroImage || venue.image || "",
      kind: "venue",
      // A venue can be booked as a venue or (if it has rooms) as accommodation.
      // The caller's bookingType decides; both are legitimate here.
      expectedBookingType: "venue",
      advancePercentage: DEFAULT_ADVANCE_PERCENTAGE,
      pricePerPlateVeg: parsePrice(venue.pricePerPlateVeg),
      pricePerPlateNonVeg: parsePrice(venue.pricePerPlateNonVeg),
      rentalCost,
      pricePerRoom: Math.round(rentalCost / (venue.rooms || 1)),
      fixedPrice: 0,
      hourlyPrice: 0,
      minGuests: venue.minGuests ?? 1,
      maxGuests: venue.maxGuests ?? 100_000,
    };
  }

  const service = await ServiceListing.findOne({ serviceId: providerId }).lean();
  if (service) {
    return resolveServicePricing(
      service.name,
      service.serviceId,
      service.image || "",
      service.category,
      service.priceFrom,
      (service as { advancePercentage?: number }).advancePercentage,
      "service"
    );
  }

  if (isObjectId) {
    const vendor = await Vendor.findById(providerId).lean();
    if (vendor) {
      return resolveServicePricing(
        vendor.businessName || vendor.name,
        String(vendor._id),
        vendor.profileImage || (Array.isArray(vendor.images) ? vendor.images[0] : "") || "",
        vendor.category,
        vendor.priceFrom,
        (vendor as { advancePercentage?: number }).advancePercentage,
        "vendor"
      );
    }
  }

  return null;
}

/**
 * Compute the authoritative price for a booking request.
 *
 * Throws `PricingError` when the provider doesn't exist, the booking type
 * doesn't match what the provider supports, or the inputs are out of range.
 */
export async function quoteBooking(providerId: string, req: QuoteRequest): Promise<Quote> {
  await connectDB();

  const provider = await resolveProvider(providerId);
  if (!provider) {
    // Also guards against orphaned providerIds — see AUDIT-REPORT.md #13.
    throw new PricingError("That listing no longer exists. Please pick another.", 404);
  }

  const bookingType = req.bookingType as BookingKind;

  // A venue may legitimately be booked as "venue" or "room". Everything else
  // must match the single type its category implies, so a caterer can't be
  // booked as a flat-fee "vendor" to dodge per-plate pricing.
  const allowedTypes: BookingKind[] =
    provider.kind === "venue" ? ["venue", "room"] : [provider.expectedBookingType];

  if (!allowedTypes.includes(bookingType)) {
    throw new PricingError(
      `This listing cannot be booked as "${bookingType}".`,
      400
    );
  }

  const daysCount = Math.max(1, req.eventDates?.length ?? 0);
  let total = 0;

  if (bookingType === "venue") {
    const guestCount = Number(req.guestCount) || 0;

    if (provider.pricePerPlateVeg > 0 || provider.pricePerPlateNonVeg > 0) {
      if (guestCount <= 0) {
        throw new PricingError("A guest count is required for this booking.", 400);
      }
      if (guestCount < provider.minGuests || guestCount > provider.maxGuests) {
        throw new PricingError(
          `Guest count must be between ${provider.minGuests} and ${provider.maxGuests}.`,
          400
        );
      }
      const perPlate =
        req.menuType === "nonveg" ? provider.pricePerPlateNonVeg : provider.pricePerPlateVeg;
      total = guestCount * perPlate * daysCount;
    } else {
      // Flat rental — guest count doesn't affect price but must still be sane.
      if (guestCount > 0 && (guestCount < provider.minGuests || guestCount > provider.maxGuests)) {
        throw new PricingError(
          `Guest count must be between ${provider.minGuests} and ${provider.maxGuests}.`,
          400
        );
      }
      total = provider.rentalCost * daysCount;
    }
  } else if (bookingType === "room") {
    const roomCount = Number(req.roomCount) || 0;
    if (roomCount <= 0) {
      throw new PricingError("At least one room is required.", 400);
    }
    if (!req.checkIn || !req.checkOut) {
      throw new PricingError("Check-in and check-out dates are required.", 400);
    }
    const nights = calculateNights(req.checkIn, req.checkOut);
    total = roomCount * provider.pricePerRoom * nights;
  } else {
    // Flat-fee vendor categories (planners, decorators, photographers…).
    if (provider.hourlyPrice > 0) {
      const hours = Math.max(1, Number(req.hours) || 0);
      total = hours * provider.hourlyPrice * daysCount;
    } else {
      total = provider.fixedPrice * daysCount;
    }
  }

  total = Math.round(total);

  if (!Number.isFinite(total) || total <= 0) {
    throw new PricingError(
      "This listing has no price configured yet. Please contact support.",
      409
    );
  }

  const advanceAmount = Math.round(total * (provider.advancePercentage / 100));

  return {
    totalAmount: total,
    advanceAmount,
    advancePercentage: provider.advancePercentage,
    expectedBookingType: provider.expectedBookingType,
    providerName: provider.name,
    canonicalProviderId: provider.canonicalId,
    providerImage: provider.image,
    providerKind: provider.kind,
    minGuests: provider.minGuests,
    maxGuests: provider.maxGuests,
  };
}
