/**
 * VENUE SIDEBAR — Updated with BookingForm
 * 
 * BEFORE: Had a static enquiry form that didn't do anything
 * AFTER:  Integrates the real BookingForm with calendar + live pricing
 * 
 * The sidebar has two sections:
 * 1. Pricing Info Card — shows local and destination prices
 * 2. BookingForm — the interactive booking flow
 */

"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import type { Venue } from "@/lib/venues-data";
import BookingForm from "@/components/booking/BookingForm";
import { useCurrency } from "@/lib/CurrencyContext";
import { convertPriceString } from "@/lib/currency";

interface VenueSidebarProps {
  venue: Venue;
  type?: string | null;
}

export default function VenueSidebar({ venue, type }: VenueSidebarProps) {
  const { currency } = useCurrency();
  const [recentEnquiries, setRecentEnquiries] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/bookings/demand?providerId=${encodeURIComponent(venue.id)}`)
      .then((res) => res.json())
      .then((data) => setRecentEnquiries(typeof data.count === "number" ? data.count : null))
      .catch(() => setRecentEnquiries(null));
  }, [venue.id]);

  const bookingTypes = [];
  
  if (type === "room") {
    bookingTypes.push({ value: "room", label: "Book Rooms" });
  } else {
    // Default to venue booking only, completely removing the tab toggle
    bookingTypes.push({ value: "venue", label: "Book Venue" });
  }
  return (
    <div className="flex flex-col gap-6">

      {/* ─── BOOKING FORM ─── */}
      {/*
       * This is where the old static enquiry form used to be.
       * Now it's a real interactive booking form with:
       * - Calendar date picker
       * - Live price calculation
       * - Booking creation API call
       */}
      <div id="booking-section" className="bg-white border border-slate-200 rounded-lg p-6 scroll-mt-28">
        <h3 className="font-bold text-slate-900 text-lg mb-5">
          Book {venue.name}
        </h3>
        <BookingForm
          providerId={venue.id}
          providerName={venue.name}
          bookingTypes={bookingTypes}
          pricePerPlateVeg={venue.pricePerPlateVeg}
          pricePerPlateNonVeg={venue.pricePerPlateNonVeg}
          rentalCost={venue.rentalCost || venue.price}
          pricePerRoom={Math.round(
            (parseInt((venue.rentalCost || venue.price)?.toString().replace(/[^0-9]/g, "") || "0", 10) || 0) /
            (venue.rooms || 1)
          )}
          minGuests={venue.minGuests}
          maxGuests={venue.maxGuests}
          totalRooms={venue.rooms}
        />
      </div>

      {currency !== "INR" && (
        <p className="text-[11px] text-slate-400 text-center -mt-2">
          Prices shown in {currency} for reference — you&apos;ll be charged in INR at checkout.
        </p>
      )}

      {/* Demand badge — real count of bookings made in the last 7 days */}
      {recentEnquiries !== null && recentEnquiries > 0 && (
        <div className="flex items-center justify-center gap-2">
          <span className="bg-primary-100 text-primary-800 text-[10px] font-bold px-2 py-0.5 rounded border border-primary-200">
            In High Demand
          </span>
          <span className="text-xs font-semibold text-slate-600">
            {recentEnquiries} {recentEnquiries === 1 ? "enquiry" : "enquiries"} last week
          </span>
        </div>
      )}

      <a
        href={`mailto:hello@soulswed.com?subject=${encodeURIComponent(
          `Reporting an issue with ${venue.name}`
        )}&body=${encodeURIComponent(`Venue ID: ${venue.id}\n\nPlease describe the issue:\n`)}`}
        className="flex items-center justify-center gap-1.5 text-xs font-semibold text-red-500 hover:opacity-70 transition-opacity"
      >
        <AlertTriangle className="w-3.5 h-3.5" />
        Report an Issue
      </a>
    </div>
  );
}
