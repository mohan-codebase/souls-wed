/**
 * BOOKING ACCESS HELPERS
 *
 * Answers one question in one place: which bookings does a vendor own?
 *
 * `Booking.providerId` is a union of three id conventions, which is what made
 * this easy to get wrong:
 *
 *   - `Vendor._id`               — the vendor account booked directly
 *   - `Venue.venueId`            — e.g. "venue-refinery-1"
 *   - `ServiceListing.serviceId` — e.g. "decorator-enchanted-1"
 *
 * The bookings list query originally resolved only the venue case, so every
 * planner / caterer / decorator / photographer / room booking was invisible to
 * the vendor who owned it. Anything that needs to authorize a vendor against a
 * booking should go through here rather than re-deriving the rule.
 */

import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { Venue } from "@/lib/models/Venue";
import { ServiceListing } from "@/lib/models/ServiceListing";
import { Vendor } from "@/lib/models/Vendor";

/**
 * Every `providerId` value that belongs to this vendor — their account id plus
 * all of their venue and service listings.
 */
export async function getVendorProviderIds(vendorId: string): Promise<string[]> {
  await connectDB();

  const [venues, services] = await Promise.all([
    Venue.find({ vendorId }).select("venueId").lean(),
    ServiceListing.find({ vendorId }).select("serviceId").lean(),
  ]);

  return [
    vendorId,
    ...venues.map((v) => v.venueId).filter(Boolean),
    ...services.map((s) => s.serviceId).filter(Boolean),
  ];
}

/** Whether `providerId` is a listing (or account) belonging to this vendor. */
export async function vendorOwnsProvider(
  vendorId: string,
  providerId: string
): Promise<boolean> {
  if (!vendorId || !providerId) return false;
  if (vendorId === providerId) return true;

  await connectDB();

  const [venue, service] = await Promise.all([
    Venue.findOne({ venueId: providerId, vendorId }).select("_id").lean(),
    ServiceListing.findOne({ serviceId: providerId, vendorId }).select("_id").lean(),
  ]);

  return Boolean(venue || service);
}

/**
 * The email address of the vendor who owns a listing, so booking notifications
 * can reach them. Returns null when the listing is orphaned or the vendor has
 * no address on file — callers should treat that as "skip the vendor email",
 * never as an error.
 */
export async function getVendorEmailForProvider(providerId: string): Promise<string | null> {
  if (!providerId) return null;

  await connectDB();

  let vendorId: string | null = null;

  const venue = await Venue.findOne({ venueId: providerId }).select("vendorId").lean();
  if (venue?.vendorId) {
    vendorId = String(venue.vendorId);
  } else {
    const service = await ServiceListing.findOne({ serviceId: providerId })
      .select("vendorId")
      .lean();
    if (service?.vendorId) vendorId = String(service.vendorId);
  }

  // The provider may be a vendor account booked directly.
  if (!vendorId && mongoose.Types.ObjectId.isValid(providerId)) {
    vendorId = providerId;
  }

  if (!vendorId || !mongoose.Types.ObjectId.isValid(vendorId)) return null;

  const vendor = await Vendor.findById(vendorId).select("email").lean();
  return vendor?.email || null;
}
