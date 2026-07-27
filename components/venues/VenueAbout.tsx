"use client";

import { useState } from "react";
import { Building2, TreePine, BedDouble, Car, UtensilsCrossed, Star, Tag } from "lucide-react";
import { MapPinIcon } from "@/components/ui/map-pin";
import { UsersIcon } from "@/components/ui/users";
import type { Venue } from "@/lib/venues-data";
import { popularAmenities } from "@/lib/venue-amenities";
import { iconForAmenity } from "@/components/venues/amenityIcons";

/** Longer copy than this gets collapsed behind a "Show more" toggle. */
const CLAMP_AT = 420;

interface VenueAboutProps {
  venue: Venue;
  /** Scrolls to the full facilities grid further down the page. */
  onSeeAllFacilities?: () => void;
}

export default function VenueAbout({ venue, onSeeAllFacilities }: VenueAboutProps) {
  const [expanded, setExpanded] = useState(false);

  const description = (venue.description ?? "").trim();
  const paragraphs = description.split(/\n\s*\n/).filter(Boolean);
  const isLong = description.length > CLAMP_AT;
  const popular = popularAmenities(venue, 8);

  const highlights = [
    venue.type && { icon: Tag, label: "Venue type", value: venue.type },
    {
      icon: MapPinIcon,
      label: "Top location",
      value: `${venue.location}${venue.city && venue.city !== venue.location ? `, ${venue.city}` : ""}`,
    },
    Number(venue.maxGuests) > 0 && {
      icon: UsersIcon,
      label: "Capacity",
      value: `${Number(venue.minGuests) || 0}–${venue.maxGuests} guests`,
    },
    venue.indoor && venue.outdoor
      ? { icon: TreePine, label: "Spaces", value: "Indoor & outdoor spaces" }
      : venue.outdoor
        ? { icon: TreePine, label: "Spaces", value: "Outdoor spaces" }
        : venue.indoor
          ? { icon: Building2, label: "Spaces", value: "Indoor spaces" }
          : null,
    Number(venue.rooms) > 0 && {
      icon: BedDouble,
      label: "Stay",
      value: `${venue.rooms} guest rooms on site`,
    },
    venue.catering && { icon: UtensilsCrossed, label: "Catering", value: "In-house catering" },
    venue.parking && { icon: Car, label: "Parking", value: "On-site parking" },
  ].filter(Boolean) as { icon: React.ComponentType<{ className?: string }>; label: string; value: string }[];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_290px] gap-8 items-start">
      {/* Description — Booking.com keeps this as plain, generous body copy. */}
      <div className="min-w-0">
        {description ? (
          <>
            <div
              className={`space-y-4 text-slate-600 leading-loose text-[15px] ${!expanded && isLong ? "line-clamp-6" : ""
                }`}
            >
              {(paragraphs.length ? paragraphs : [description]).map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
            {isLong && (
              <button
                onClick={() => setExpanded((v) => !v)}
                className="mt-3 text-sm font-bold text-primary-600 hover:underline"
              >
                {expanded ? "Show less" : "Show more"}
              </button>
            )}
          </>
        ) : (
          <p className="text-slate-500 text-sm">
            This venue hasn&apos;t added a description yet. Get in touch and they&apos;ll walk you
            through the property.
          </p>
        )}

        {venue.rating > 0 && venue.reviewCount > 0 && (
          <div className="mt-6 flex items-start gap-3 rounded-lg border border-primary-100 bg-primary-50/40 px-4 py-3.5">
            <Star
              className="w-5 h-5 flex-shrink-0 mt-0.5"
              style={{ color: "var(--sw-primary)", fill: "var(--sw-primary)" }}
            />
            <p className="text-sm text-slate-700 leading-relaxed">
              <span className="font-bold">Couples love this venue</span> — they rated it{" "}
              <span className="font-bold">{venue.rating.toFixed(1)} out of 5</span> across{" "}
              {venue.reviewCount} review{venue.reviewCount === 1 ? "" : "s"}.
            </p>
          </div>
        )}

        {/* Most popular facilities — the summary strip, with the full grouped
            list living in the Facilities section below. */}
        {popular.length > 0 && (
          <div className="mt-8 pt-6 border-t border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-4">Most popular facilities</h3>
            <div className="flex flex-wrap gap-x-6 gap-y-3">
              {popular.map((item) => {
                const Icon = iconForAmenity(item);
                return (
                  <span
                    key={item}
                    className="flex items-center gap-2 text-sm font-semibold text-slate-700"
                  >
                    <Icon className="w-4 h-4 text-green-600 flex-shrink-0" />
                    {item}
                  </span>
                );
              })}
            </div>
            {onSeeAllFacilities && (
              <button
                onClick={onSeeAllFacilities}
                className="mt-4 text-sm font-bold text-primary-600 hover:underline"
              >
                See all facilities
              </button>
            )}
          </div>
        )}
      </div>

      {/* Property highlights panel */}
      <aside className="w-full rounded-lg border border-slate-200 bg-slate-50/60 p-5">
        <h3 className="text-base font-bold text-slate-900 mb-4">Property highlights</h3>
        <ul className="space-y-4">
          {highlights.map((h) => (
            <li key={h.label} className="flex items-start gap-3">
              <h.icon className="w-[18px] h-[18px] text-slate-400 flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {h.label}
                </p>
                <p className="text-sm font-semibold text-slate-800 leading-snug">{h.value}</p>
              </div>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
