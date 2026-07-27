"use client";

import { Building2, TreePine, BedDouble, Car, UtensilsCrossed, Wallet, Users } from "lucide-react";
import { MapPinIcon } from "@/components/ui/map-pin";
import type { Venue } from "@/lib/venues-data";

/**
 * The equivalent of Booking.com's "House rules" table — a label/detail row per
 * topic. Every row is derived from data the venue actually gave us; anything we
 * don't hold is phrased as a prompt to ask the venue rather than invented.
 */
export default function VenueGoodToKnow({ venue }: { venue: Venue }) {
  const spaces = venue.indoor && venue.outdoor
    ? "Indoor banquet space and outdoor lawn / garden."
    : venue.outdoor
      ? "Outdoor lawn / garden space."
      : venue.indoor
        ? "Indoor banquet space."
        : null;

  const rows = [
    Number(venue.maxGuests) > 0 && {
      icon: Users,
      label: "Guest capacity",
      detail: `Hosts ${Number(venue.minGuests) || 0}–${venue.maxGuests} guests. Share your final headcount when you enquire so the venue can confirm the layout.`,
    },
    spaces && {
      icon: venue.outdoor ? TreePine : Building2,
      label: "Event spaces",
      detail: spaces,
    },
    {
      icon: UtensilsCrossed,
      label: "Catering",
      detail: venue.catering
        ? "In-house catering is available. Veg and non-veg menus are priced per plate — see Pricing above."
        : "In-house catering isn't listed for this venue. Ask them which outside caterers they work with.",
    },
    {
      icon: BedDouble,
      label: "Accommodation",
      detail: Number(venue.rooms) > 0
        ? `${venue.rooms} guest rooms on the property for your out-of-town guests.`
        : "No on-site guest rooms are listed. Ask the venue about hotels nearby.",
    },
    {
      icon: Car,
      label: "Parking",
      detail: venue.parking
        ? "On-site parking is available for your guests."
        : "On-site parking isn't listed. Check with the venue about parking arrangements.",
    },
    {
      icon: Wallet,
      label: "Payment",
      detail: "A 30% advance confirms your date; the balance is settled directly with the venue. Payments through SoulsWed are handled by Stripe.",
    },
    {
      icon: MapPinIcon,
      label: "Getting there",
      detail: `${venue.location}${venue.city && venue.city !== venue.location ? `, ${venue.city}` : ""}${venue.country && venue.country !== "Global" ? `, ${venue.country}` : ""}.`,
      link: venue.mapLink,
    },
  ].filter(Boolean) as {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    detail: string;
    link?: string;
  }[];

  return (
    <div className="rounded-lg border border-slate-200 bg-white divide-y divide-slate-100">
      {rows.map((row) => (
        <div
          key={row.label}
          className="grid grid-cols-1 sm:grid-cols-[190px_1fr] gap-2 sm:gap-6 px-6 py-5"
        >
          <div className="flex items-center gap-2.5">
            <row.icon className="w-[18px] h-[18px] text-slate-400 flex-shrink-0" />
            <h4 className="font-bold text-slate-900 text-sm">{row.label}</h4>
          </div>
          <div className="min-w-0 sm:pl-0 pl-7">
            <p className="text-sm text-slate-600 leading-relaxed">{row.detail}</p>
            {row.link && (
              <a
                href={row.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-1.5 text-sm font-bold text-primary-600 hover:underline"
              >
                View on map
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
