"use client";

import { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Building2, Loader2 } from "lucide-react";
import { ChevronLeftIcon } from "@/components/ui/chevron-left";
import { ChevronRightIcon } from "@/components/ui/chevron-right";
import { ArrowRightIcon } from "@/components/ui/arrow-right";
import VenueCard from "@/components/venues/VenueCard";
import type { Venue } from "@/lib/venues-data";

export default function FeaturedVenues() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch venues that admins have verified — verified = approved for public display
  useEffect(() => {
    fetch("/api/venues?verified=true&limit=12")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then((data) => {
        const mapped = (data.venues ?? []).map((v: Record<string, unknown>) => ({
          ...v,
          id: v.venueId as string,
        })) as Venue[];
        setVenues(mapped.slice(0, 8));
      })
      .catch(() => setVenues([]))
      .finally(() => setLoading(false));
  }, []);

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === "right" ? 320 : -320, behavior: "smooth" });
  };

  // Don't render the section at all if no featured venues exist
  if (!loading && venues.length === 0) return null;

  return (
    <section className="py-12 md:py-20 overflow-hidden relative">
      {/* Abstract Background Orbs */}
      <div 
        className="absolute top-1/2 -right-32 -translate-y-1/2 w-96 h-96 rounded-full pointer-events-none opacity-40 dark:opacity-20"
        style={{
          background: "radial-gradient(circle, rgba(238,116,41,0.08) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />
      <div 
        className="absolute bottom-10 -left-32 w-80 h-80 rounded-full pointer-events-none opacity-30 dark:opacity-15"
        style={{
          background: "radial-gradient(circle, rgba(252,203,17,0.1) 0%, transparent 70%)",
          filter: "blur(50px)",
        }}
      />

      <div className="max-w-7xl mx-auto px-4 relative z-10">
        {/* Header — Title left, Arrow navigation right in one row */}
        <motion.div
          className="flex flex-col md:flex-row md:items-end justify-between mb-8 md:mb-10 gap-4"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="text-left">
            <p className="text-xs sm:text-sm font-semibold uppercase tracking-widest mb-1.5" style={{ color: "var(--sw-primary)" }}>
              Top Picks
            </p>
            <h2 className="section-heading text-left mb-1">Amazing Venues</h2>
            <p className="section-subtext text-left">Best destinations at best prices</p>
          </div>

          <div className="flex items-center gap-3 self-end md:self-auto">
            <a
              href="/venues"
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold px-4 sm:px-5 py-2.5 rounded-full transition-all hover:gap-3 border border-slate-200 dark:border-white/10 shadow-sm hover:shadow"
              style={{ background: "var(--sw-white)", color: "var(--sw-navy)" }}
            >
              Search more <ArrowRightIcon className="w-4 h-4 text-[var(--sw-primary)]" />
            </a>
            <div className="flex gap-2">
              <button
                onClick={() => scroll("left")}
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-all hover:scale-105 shadow-sm"
                style={{ background: "var(--sw-white)", border: "1px solid var(--sw-light-gray)" }}
                aria-label="Previous venues"
              >
                <ChevronLeftIcon className="w-5 h-5" style={{ color: "var(--sw-navy)" }} />
              </button>
              <button
                onClick={() => scroll("right")}
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-all hover:scale-105 shadow-sm text-white"
                style={{ background: "var(--sw-primary)" }}
                aria-label="Next venues"
              >
                <ChevronRightIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Loading skeleton */}
        {loading && (
          <div className="flex gap-5">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex-shrink-0 w-[85vw] sm:w-[320px] md:w-[340px] lg:w-[360px] h-[500px] rounded-[32px] animate-pulse"
                style={{ background: "var(--sw-light-gray, #f1f5f9)" }}
              />
            ))}
          </div>
        )}

        {/* Scroll row — only shown when data is ready */}
        {!loading && (
          <div
            ref={scrollRef}
            className="flex gap-5 overflow-x-auto snap-scroll pb-4"
            style={{ scrollbarWidth: "none" }}
          >
            {venues.map((venue, i) => (
              <motion.div
                key={venue.id}
                className="flex-shrink-0 w-[85vw] sm:w-[320px] md:w-[340px] lg:w-[360px]"
                initial={{ opacity: 0, x: 40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                style={{ scrollSnapAlign: "start" }}
              >
                <div className="h-[460px] sm:h-[500px] lg:h-[540px] w-full">
                  <VenueCard venue={venue} view="grid" />
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
