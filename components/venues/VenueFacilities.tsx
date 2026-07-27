"use client";

import { useState } from "react";
import { CheckIcon } from "@/components/ui/check";
import type { Venue } from "@/lib/venues-data";
import { groupAmenities, amenityCount } from "@/lib/venue-amenities";
import { GROUP_ICONS } from "@/components/venues/amenityIcons";
import { Info } from "lucide-react";

/** Categories shown before the "Show all facilities" toggle kicks in. */
const COLLAPSED_GROUPS = 6;

export default function VenueFacilities({ venue }: { venue: Venue }) {
  const [expanded, setExpanded] = useState(false);

  const groups = groupAmenities(venue);
  const total = amenityCount(venue);

  if (total === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6 text-center">
        <p className="text-sm text-slate-500">
          This venue hasn&apos;t listed its facilities yet. Contact them for the full list of what
          the property includes.
        </p>
      </div>
    );
  }

  const hasMore = groups.length > COLLAPSED_GROUPS;
  const visible = expanded || !hasMore ? groups : groups.slice(0, COLLAPSED_GROUPS);

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      <div className="px-6 pt-6 pb-2 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-500">
          {total} facilit{total === 1 ? "y" : "ies"} across {groups.length}{" "}
          categor{groups.length === 1 ? "y" : "ies"}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-7 px-6 pt-4 pb-6">
        {visible.map((group) => {
          const Icon = GROUP_ICONS[group.key] ?? Info;
          return (
            <div key={group.key} className="min-w-0">
              <div className="flex items-center gap-2.5 pb-3 mb-3 border-b border-slate-100">
                <Icon className="w-[18px] h-[18px] flex-shrink-0" style={{ color: "var(--sw-primary)" }} />
                <h4 className="font-bold text-slate-900 text-[15px] leading-tight">{group.label}</h4>
              </div>
              <ul className="space-y-2.5">
                {group.items.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-slate-600 leading-snug">
                    <CheckIcon className="w-4 h-4 text-green-600 flex-shrink-0 mt-[1px]" />
                    <span className="min-w-0">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {hasMore && (
        <div className="px-6 pb-6">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="w-full sm:w-auto text-sm font-bold text-primary-600 border border-primary-200 rounded px-5 py-2.5 hover:bg-primary-50 transition-colors"
          >
            {expanded ? "Show fewer facilities" : `Show all ${total} facilities`}
          </button>
        </div>
      )}
    </div>
  );
}
