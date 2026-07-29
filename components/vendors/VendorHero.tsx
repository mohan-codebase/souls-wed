"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Star, BadgeCheck, Image as ImageIcon, PenSquare, Share2 } from "lucide-react";
import { MapPinIcon } from "@/components/ui/map-pin";
import { ChevronLeftIcon } from "@/components/ui/chevron-left";
import { PhoneIcon } from "@/components/ui/phone";
import { HeartIcon } from "@/components/ui/heart";
import { CheckIcon } from "@/components/ui/check";
import type { PublicVendor, PublicVendorReview } from "@/components/vendors/PublicVendorDirectory";
import { useWishlistStore } from "@/lib/store/useWishlistStore";
import ReviewFormModal from "@/components/shared/ReviewFormModal";

interface VendorHeroProps {
  vendor: PublicVendor;
  /** Number of photographs in the collage above, for the "N Photos" jump. */
  photoCount?: number;
  onReviewSubmitted?: (review: PublicVendorReview) => void;
}

export default function VendorHero({ vendor, photoCount, onReviewSubmitted }: VendorHeroProps) {
  const [reviewModalOpen, setReviewModalOpen] = useState(false);

  // "Write a Review" used to be shown to everyone, but the POST handler only
  // accepts a review from someone with a COMPLETED booking here — so for almost
  // every visitor the button led straight to a 403. Ask first, and only offer
  // it to people who can actually use it.
  const [canReview, setCanReview] = useState(false);
  const [reviewBlockedReason, setReviewBlockedReason] = useState("");

  useEffect(() => {
    if (!vendor._id) return;
    let cancelled = false;
    fetch(`/api/vendors/${vendor._id}/reviews`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setCanReview(Boolean(d?.canReview));
        setReviewBlockedReason(d?.reason || "");
      })
      .catch(() => {
        if (!cancelled) setCanReview(false);
      });
    return () => {
      cancelled = true;
    };
  }, [vendor._id]);
  const { items, addItem, removeItem } = useWishlistStore();
  const isSaved = items.some((item) => item.id === vendor._id);

  const toggleWishlist = () => {
    if (isSaved) {
      removeItem(vendor._id);
    } else {
      addItem({
        id: vendor._id,
        name: vendor.businessName || vendor.name,
        location: vendor.city || "Various Locations",
        price: vendor.priceFrom || 0,
        unit: "event",
        rating: vendor.rating || 0,
        reviewCount: vendor.reviewCount || 0,
        image: vendor.images && vendor.images.length > 0 ? vendor.images[0] : "/soulswed/vendors/1128.webp",
        category: vendor.category
      });
    }
  };

  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const name = vendor.businessName || vendor.name;
  const rating = vendor.rating || 0;
  const reviewCount = vendor.reviewCount || 0;

  // `city` on ServiceListing-backed vendors is free text a vendor typed into
  // a form field, so it's often already a full "City, Country" string (e.g.
  // "Jaipur, India", "Bali, Indonesia") — appending `country` unconditionally
  // produced "Jaipur, India, India" or, worse, "Bali, Indonesia, India" when
  // `country` was unset and fell back to the "India" default.
  const cityLabel = vendor.city?.includes(",")
    ? vendor.city
    : [vendor.city, vendor.country || "India"].filter(Boolean).join(", ");

  return (
    <div className="w-full flex flex-col relative">
      {/* Back Link */}
      <div className="mb-4">
        <Link
          href={`/${(vendor.category || "vendors").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ChevronLeftIcon className="w-4 h-4" />
          Back to {vendor.category || "Vendors"}
        </Link>
      </div>

      {/* Info Card */}
      <div className="bg-white border border-slate-200 rounded-lg relative z-10 p-6 flex flex-col gap-5">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-2">
            {vendor.verified && (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider bg-white text-slate-800 border border-slate-200 px-2.5 py-1 rounded-md mb-1">
                <BadgeCheck className="w-3.5 h-3.5 text-green-600" />
                Verified Partner
              </span>
            )}

            <h1
              className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {name}
            </h1>

            <div className="flex items-center gap-1.5 text-slate-600 text-sm font-medium">
              <MapPinIcon className="w-4 h-4 text-slate-400" />
              {cityLabel}
              {vendor.mapLink && (
                <a href={vendor.mapLink} target="_blank" rel="noopener noreferrer" className="text-primary-600 font-semibold ml-2 hover:underline text-xs">
                  (View on Map)
                </a>
              )}
            </div>

            <p className="text-xs text-slate-500 max-w-lg mt-1">
              Premium {vendor.category || "wedding"} services in {vendor.city}
            </p>
          </div>

          {/* Rating Badge */}
          {rating > 0 && (
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-1 bg-green-600 text-white px-3 py-1.5 rounded-lg">
                <Star className="w-4 h-4 fill-current" />
                <span className="font-bold">{rating.toFixed(1)}</span>
              </div>
              <span className="text-xs font-semibold text-slate-500 underline decoration-slate-300 underline-offset-2">
                {reviewCount} reviews
              </span>
            </div>
          )}
        </div>

        {/* Contact Strip */}
        <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-slate-100">
          {vendor.contactPhone || vendor.phone ? (
            <a href={`tel:${vendor.contactPhone || vendor.phone}`} className="flex items-center gap-2 text-green-600 font-semibold text-sm">
              <PhoneIcon className="w-4 h-4" />
              {vendor.contactPhone || vendor.phone || "Contact"}
            </a>
          ) : (
            <button className="flex items-center gap-2 text-green-600 font-semibold text-sm">
              <PhoneIcon className="w-4 h-4" />
              Contact
            </button>
          )}
          {vendor.featured && (
            <span className="text-[10px] font-bold uppercase tracking-wider bg-primary-500 text-white px-2 py-0.5 rounded">
              Featured Partner
            </span>
          )}
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-between sm:justify-start gap-4 sm:gap-8 border-b border-slate-200 py-4 px-2 mt-2">
        <button
          onClick={() => document.getElementById('photos')?.scrollIntoView({ behavior: 'smooth' })}
          className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:opacity-70 transition-opacity"
        >
          <ImageIcon className="w-4 h-4" />
          {photoCount || vendor.images?.length || 1} Photos
        </button>
        <button
          onClick={toggleWishlist}
          className={`flex items-center gap-2 text-sm font-semibold transition-opacity hover:opacity-70 ${isSaved ? "text-red-500" : "text-slate-600"}`}
        >
          <HeartIcon className="w-4 h-4" fill={isSaved ? "currentColor" : "none"} />
          {isSaved ? "Saved" : "Shortlist"}
        </button>
        {canReview ? (
          <button
            onClick={() => setReviewModalOpen(true)}
            className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:opacity-70 transition-opacity"
          >
            <PenSquare className="w-4 h-4" />
            Write a Review
          </button>
        ) : reviewBlockedReason ? (
          <span
            title={reviewBlockedReason}
            className="flex items-center gap-2 text-sm font-semibold text-slate-300 cursor-not-allowed"
          >
            <PenSquare className="w-4 h-4" />
            Write a Review
          </span>
        ) : null}
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
        endpoint={`/api/vendors/${vendor._id}/reviews`}
        onSubmitted={(review) => onReviewSubmitted?.(review)}
      />
    </div>
  );
}
