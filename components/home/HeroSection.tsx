"use client";

import { motion, useReducedMotion } from "framer-motion";
import { BadgeCheck, CalendarCheck, LayoutGrid } from "lucide-react";
import HeroBackdrop from "@/components/home/HeroBackdrop";
import HeroSearch from "@/components/search/HeroSearch";
import { VENDOR_CATEGORIES } from "@/lib/config/categories";

const HEADLINE = ["Extraordinary", "Events,"];
const HEADLINE_ACCENT = ["Effortlessly", "Planned"];

/** Factual, verifiable claims only — each maps to a shipped capability. */
const TRUST_POINTS = [
  { icon: LayoutGrid, label: `${VENDOR_CATEGORIES.length} vendor categories` },
  { icon: BadgeCheck, label: "Admin-verified partners" },
  { icon: CalendarCheck, label: "Live availability & secure payment" },
];

export default function HeroSection() {
  const prefersReducedMotion = useReducedMotion();

  // With reduced motion the content is present from the first frame rather
  // than sliding and fading in.
  const rise = (delay: number) =>
    prefersReducedMotion
      ? { initial: { opacity: 1 }, animate: { opacity: 1 }, transition: { duration: 0 } }
      : {
          initial: { opacity: 0, y: 24 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.6, delay, ease: [0.4, 0, 0.2, 1] as const },
        };

  return (
    <div className="w-full px-3 md:px-2 lg:px-2 pt-3">
      <section className="relative min-h-[calc(100vh-2.5rem)] flex flex-col items-center justify-center rounded-[32px] sm:rounded-[35px] border border-amber-100/60">
        <HeroBackdrop />

        <div className="relative z-10 w-full max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center pt-24 pb-36 sm:pb-44 md:pb-48">
          <motion.p
            {...rise(0)}
            className="glass inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 text-sm font-medium"
            style={{ color: "var(--sw-chip-bg-hover)" }}
          >
            Flawless Moves. Perfect Events.
          </motion.p>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight mb-2">
            <span className="flex flex-wrap justify-center gap-x-4">
              {HEADLINE.map((word, i) => (
                <motion.span key={word} {...rise(i * 0.12)} className="text-white">
                  {word}
                </motion.span>
              ))}
            </span>
            <span
              className="flex flex-wrap justify-center gap-x-4 italic mt-1"
              style={{ color: "var(--sw-secondary)" }}
            >
              {HEADLINE_ACCENT.map((word, i) => (
                <motion.span key={word} {...rise(0.36 + i * 0.12)}>
                  {word}
                </motion.span>
              ))}
            </span>
          </h1>

          <motion.p
            {...rise(0.7)}
            className="text-lg md:text-xl max-w-2xl mt-6 mb-10"
            style={{ color: "rgba(255,255,255,0.82)" }}
          >
            Venues, planners, caterers, photographers and {VENDOR_CATEGORIES.length - 4} more —
            searched, compared and booked in one place.
          </motion.p>

          <motion.div {...rise(0.85)} className="relative z-20 w-full flex justify-center">
            <HeroSearch />
          </motion.div>

          <motion.ul
            {...rise(1)}
            className="relative z-10 mt-10 flex flex-wrap items-center justify-center gap-x-7 gap-y-3"
          >
            {TRUST_POINTS.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-2 text-sm font-medium text-white/75">
                <Icon className="w-4 h-4 text-[var(--sw-secondary)]" aria-hidden="true" />
                {label}
              </li>
            ))}
          </motion.ul>
        </div>
      </section>
    </div>
  );
}
