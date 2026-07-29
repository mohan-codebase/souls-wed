"use client";

import Image from "@/components/shared/CustomImage";
import Link from "next/link";
import { Star, BedDouble, Crown } from "lucide-react";
import { MapPinIcon } from "@/components/ui/map-pin";
import { UsersIcon } from "@/components/ui/users";
import { HeartIcon } from "@/components/ui/heart";
import type { Venue } from "@/lib/venues-data";
import { useCurrency } from "@/lib/CurrencyContext";
import { convertPriceString } from "@/lib/currency";
import { useWishlistStore } from "@/lib/store/useWishlistStore";
import VendorCard from "@/components/vendors/VendorCard";

interface VenueCardProps {
  venue: Venue;
  view?: "grid" | "list";
}

export default function VenueCard({ venue, view = "grid" }: VenueCardProps) {
  const { currency } = useCurrency();
  const { items, addItem, removeItem } = useWishlistStore();
  const isSaved = items.some((item) => item.id === venue.id);

  const toggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isSaved) {
      removeItem(venue.id);
    } else {
      addItem({
        id: venue.id,
        name: venue.name,
        location: venue.location,
        price: venue.price,
        unit: venue.priceUnit,
        rating: venue.rating,
        reviewCount: venue.reviewCount,
        image: venue.image,
        category: "venue"
      });
    }
  };
  if (view === "list") {
    return (
      <Link href={`/venues/${venue.id}?type=venue`} className="group block">
        <div className="bg-white dark:bg-[var(--sw-surface)] rounded-[32px] border border-slate-200 dark:border-white/10 overflow-hidden flex flex-col sm:flex-row">
          <div className="relative w-full sm:w-[280px] h-[220px] sm:h-auto flex-shrink-0">
            <Image src={venue.image} alt={venue.name} fill sizes="(max-width: 640px) 100vw, 280px" className="object-cover" />
            {venue.featured && (
              <div
                className="absolute top-3 left-3 z-20 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-white"
                style={{ background: "var(--sw-primary)" }}
              >
                <Crown className="w-3.5 h-3.5" />
                Featured
              </div>
            )}
            <button 
              className={`absolute top-3 right-3 p-2 rounded-full bg-white/90 transition-opacity hover:opacity-70 ${isSaved ? "text-red-500" : "text-slate-400"}`}
              onClick={toggleWishlist} 
              aria-label="Shortlist"
            >
              <HeartIcon className="w-4 h-4" fill={isSaved ? "currentColor" : "none"} />
            </button>
          </div>
          <div className="p-6 flex flex-col justify-between flex-grow">
            <div>
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-xl font-bold text-slate-900 dark:text-stone-100 line-clamp-1" style={{ fontFamily: "var(--font-heading)" }}>{venue.name}</h3>
                {venue.rating > 0 && (
                  <div className="flex items-center gap-1 px-2 py-1 rounded-full" style={{ background: "var(--sw-chip-bg-hover)" }}>
                    <Star className="w-3.5 h-3.5" style={{ color: "var(--sw-secondary)" }} fill="var(--sw-secondary)" />
                    <span className="text-sm font-bold text-slate-800 dark:text-stone-200">{venue.rating.toFixed(1)}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1.5 mb-4">
                <MapPinIcon className="w-4 h-4 text-slate-500 dark:text-stone-400" />
                <span className="text-sm text-slate-600 dark:text-stone-300">{venue.location}, {venue.country}</span>
              </div>
              <div className="flex flex-wrap gap-4 mb-4 sm:mb-0">
                <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-stone-300">
                  <UsersIcon className="w-4 h-4 text-slate-400 dark:text-stone-500" />
                  <span>{venue.minGuests}-{venue.maxGuests} pax</span>
                </div>
                {venue.rooms > 0 && (
                  <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-stone-300">
                    <BedDouble className="w-4 h-4 text-slate-400 dark:text-stone-500" />
                    <span>{venue.rooms} Rooms</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-end justify-between pt-4 border-t border-slate-50 dark:border-white/10">
              <div>
                <span className="text-xs font-medium text-slate-500 dark:text-stone-400 block mb-0.5">Starting from</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-bold text-slate-900 dark:text-stone-100">{convertPriceString(venue.price, currency)}</span>
                  <span className="text-sm text-slate-500 dark:text-stone-400 capitalize">{venue.priceUnit}</span>
                </div>
              </div>
              <span className="px-5 py-2.5 bg-slate-50 dark:bg-white/10 text-slate-900 dark:text-stone-100 text-sm font-bold rounded-full border border-slate-200 dark:border-white/10">
                Book +
              </span>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  /* ── Grid view: full-bleed image + bottom frosted-glass overlay ── */
  return (
    <Link href={`/venues/${venue.id}?type=venue`} className="block group">
      <div className="h-[460px] sm:h-[500px] lg:h-[540px]">
        <VendorCard
          id={venue.id}
          name={venue.name}
          location={`${venue.location}, ${venue.country}`}
          price={venue.price}
          unit={venue.priceUnit}
          rating={venue.rating}
          reviewCount={venue.reviewCount}
          image={venue.image}
          badge={
            venue.featured ? (
              <div
                className="absolute top-3 left-3 z-20 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-white"
                style={{ background: "var(--sw-primary)" }}
              >
                <Crown className="w-3.5 h-3.5" />
                Featured
              </div>
            ) : undefined
          }
          tags={
            <>
              <div className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-full bg-white text-slate-700">
                <UsersIcon className="w-3.5 h-3.5 text-slate-500" />
                {venue.minGuests}-{venue.maxGuests} pax
              </div>
              {venue.rooms > 0 && (
                <div className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-full bg-white text-slate-700">
                  <BedDouble className="w-3.5 h-3.5 text-slate-500" />
                  {venue.rooms} Rooms
                </div>
              )}
              <div
                className="flex items-center text-[11px] font-bold px-3 py-1.5 rounded-full bg-white"
                style={{ color: "var(--sw-primary)" }}
              >
                {venue.type}
              </div>
            </>
          }
        />
      </div>
    </Link>
  );
}
