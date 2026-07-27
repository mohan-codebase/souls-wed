"use client";

import { useState } from "react";
import Link from "next/link";
import { Star, BadgeCheck, Image as ImageIcon, PenSquare, Share2 } from "lucide-react";
import { MapPinIcon } from "@/components/ui/map-pin";
import { ChevronLeftIcon } from "@/components/ui/chevron-left";
import { PhoneIcon } from "@/components/ui/phone";
import { HeartIcon } from "@/components/ui/heart";
import { CheckIcon } from "@/components/ui/check";
import type { Venue, VenueReview } from "@/lib/venues-data";
import { useWishlistStore } from "@/lib/store/useWishlistStore";
import ReviewFormModal from "@/components/shared/ReviewFormModal";

interface VenueHeroProps {
  venue: Venue;
  /** Number of photographs in the collage above, for the "N Photos" jump. */
  photoCount?: number;
  onReviewSubmitted?: (review: VenueReview) => void;
}

export default function VenueHero({ venue, photoCount, onReviewSubmitted }: VenueHeroProps) {
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const { items, addItem, removeItem } = useWishlistStore();
  const isSaved = items.some((item) => item.id === venue.id);

  const toggleWishlist = () => {
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

  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full flex flex-col relative">
      {/* Back Link */}
      <div className="mb-4">
        <Link
          href="/venues"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ChevronLeftIcon className="w-4 h-4" />
          Back to Venues
        </Link>
      </div>

      {/* Info Section - Editorial Style */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-slate-200">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[10px] font-bold uppercase tracking-wider bg-primary-100 text-primary-800 px-2.5 py-1 rounded-md">
              {venue.type || "Venue & Estate"}
            </span>
            {venue.verified && (
              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider bg-white text-slate-800 border border-slate-200 px-2.5 py-1 rounded-md">
                <BadgeCheck className="w-3.5 h-3.5 text-green-600" />
                Verified
              </span>
            )}
          </div>

          <h1
            className="text-4xl sm:text-5xl font-bold text-slate-900 leading-tight"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {venue.name}
          </h1>

          <div className="flex items-center gap-2 text-slate-500 text-sm font-medium pt-1">
            <MapPinIcon className="w-4 h-4 text-slate-400" />
            {venue.location}, {venue.country}
            {venue.mapLink ? (
              <a href={venue.mapLink} target="_blank" rel="noopener noreferrer" className="text-primary-600 font-semibold ml-2 hover:underline text-xs">
                (View on Map)
              </a>
            ) : (
              <span className="text-primary-600 font-semibold ml-2 hover:underline text-xs cursor-pointer">
                (View on Map)
              </span>
            )}
          </div>
        </div>

        {/* Rating and Contact */}
        <div className="flex flex-col items-start md:items-end gap-4 min-w-[200px]">
          {venue.rating > 0 && (
            <div className="flex flex-col items-start md:items-end gap-1.5">
              {/* bg-sw-navy / fill-sw-secondary are not real Tailwind classes —
                  they resolved to transparent, leaving white text on white. */}
              <div
                className="flex items-center gap-1.5 text-white px-4 py-2 rounded-xl"
                style={{ background: "var(--sw-navy)" }}
              >
                <Star
                  className="w-4 h-4"
                  style={{ color: "var(--sw-secondary)", fill: "var(--sw-secondary)" }}
                />
                <span className="font-bold text-lg leading-none">{venue.rating.toFixed(1)}</span>
              </div>
              <span className="text-xs font-semibold text-slate-500 underline decoration-slate-300 underline-offset-2">
                Based on {venue.reviewCount} reviews
              </span>
            </div>
          )}

          {venue.contactPhone ? (
            <a
              href={`tel:${venue.contactPhone}`}
              className="flex items-center justify-center gap-2 w-full md:w-auto bg-green-50 text-green-700 font-bold px-6 py-2.5 rounded-xl border border-green-200 hover:bg-green-100 transition-colors"
            >
              <PhoneIcon className="w-4 h-4" />
              {venue.contactPhone}
            </a>
          ) : (
            <button
              onClick={() => {
                const el = document.getElementById("booking-section");
                if (el) {
                  el.scrollIntoView({ behavior: "smooth" });
                }
              }}
              className="flex items-center justify-center gap-2 w-full md:w-auto bg-green-50 text-green-700 font-bold px-6 py-2.5 rounded-xl border border-green-200 hover:bg-green-100 transition-colors cursor-pointer"
            >
              <PhoneIcon className="w-4 h-4" />
              Contact Venue
            </button>
          )}
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-between sm:justify-start gap-4 sm:gap-8 py-5">
        <button
          onClick={() => document.getElementById('photos')?.scrollIntoView({ behavior: 'smooth' })}
          className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:opacity-70 transition-opacity"
        >
          <ImageIcon className="w-4 h-4" />
          {photoCount || 1} Photos
        </button>
        <button
          onClick={toggleWishlist}
          className={`flex items-center gap-2 text-sm font-semibold transition-opacity hover:opacity-70 ${isSaved ? "text-red-500" : "text-slate-600"}`}
        >
          <HeartIcon className="w-4 h-4" fill={isSaved ? "currentColor" : "none"} />
          {isSaved ? "Saved" : "Shortlist"}
        </button>
        <button
          onClick={() => setReviewModalOpen(true)}
          className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:opacity-70 transition-opacity"
        >
          <PenSquare className="w-4 h-4" />
          Write a Review
        </button>
        <button
          onClick={handleShare}
          className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:opacity-70 transition-opacity"
        >
          {copied ? <CheckIcon className="w-4 h-4 text-green-600" /> : <Share2 className="w-4 h-4" />}
          {copied ? <span className="text-green-600">Copied!</span> : "Share"}
        </button>
      </div>

      <ReviewFormModal
        open={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        endpoint={`/api/venues/${venue.id}/reviews`}
        onSubmitted={(review) => onReviewSubmitted?.(review)}
      />
    </div>
  );
}
