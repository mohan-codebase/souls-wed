"use client";

import { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronLeftIcon } from "@/components/ui/chevron-left";
import { ChevronRightIcon } from "@/components/ui/chevron-right";
import { ArrowRightIcon } from "@/components/ui/arrow-right";
import { useCurrency } from "@/lib/CurrencyContext";
import VendorCard from "@/components/vendors/VendorCard";
import Link from "next/link";

interface ServiceItem {
  id: string;
  vendorId: string;
  name: string;
  location: string;
  price: string;
  unit: string;
  rating: number;
  verified: boolean;
  tag: string;
  image: string;
}

interface CategoryCarouselSectionProps {
  categorySlug: string;
  title: string;
  subtitle: string;
  tagLabel: string;
  icon: React.ReactNode;
}

export default function CategoryCarouselSection({ categorySlug, title, subtitle, tagLabel, icon }: CategoryCarouselSectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { currency } = useCurrency();
  const [items, setItems] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/services?category=${categorySlug}&verified=true&limit=8`)
      .then((r) => r.json())
      .then((data) => {
        const mapData = (services: any[]) =>
          (services || []).map((s: any) => ({
            id: s.serviceId,
            vendorId: s.vendorId,
            name: s.name,
            location: s.city,
            price: `₹${s.priceFrom?.toLocaleString("en-IN") || 0}`,
            unit: s.priceUnit || "per event",
            rating: s.rating || 0,
            verified: s.verified,
            tag: tagLabel,
            image: s.image || "",
          }));
        setItems(mapData(data.services));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [categorySlug, tagLabel]);

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === "right" ? 320 : -320, behavior: "smooth" });
  };

  if (!loading && items.length === 0) return null;

  return (
    <section className="py-12 md:py-20 overflow-x-clip relative">
      {/* Abstract Background Orbs */}
      <div 
        className="absolute top-1/2 -left-32 -translate-y-1/2 w-96 h-96 rounded-full pointer-events-none opacity-40 dark:opacity-20"
        style={{
          background: "radial-gradient(circle, rgba(238,116,41,0.08) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />
      <div 
        className="absolute top-1/3 -right-32 w-80 h-80 rounded-full pointer-events-none opacity-30 dark:opacity-15"
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
              {tagLabel}
            </p>
            <h2 className="section-heading text-left mb-1">{title}</h2>
            <p className="section-subtext text-left">{subtitle}</p>
          </div>

          <div className="flex items-center gap-3 self-end md:self-auto">
            <a
              href={`/category/${categorySlug}`}
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
                aria-label="Previous items"
              >
                <ChevronLeftIcon className="w-5 h-5" style={{ color: "var(--sw-navy)" }} />
              </button>
              <button
                onClick={() => scroll("right")}
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-all hover:scale-105 shadow-sm text-white"
                style={{ background: "var(--sw-primary)" }}
                aria-label="Next items"
              >
                <ChevronRightIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Loading skeleton */}
        {loading && (
          <div className="flex gap-5 overflow-hidden pb-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex-shrink-0 w-[85vw] sm:w-[320px] md:w-[340px] lg:w-[360px] h-[420px] sm:h-[500px] lg:h-[540px] rounded-[32px] animate-pulse"
                style={{ background: "var(--sw-light-gray, #f1f5f9)" }}
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && items.length === 0 && (
          <div className="py-12 flex flex-col items-center justify-center text-center bg-slate-50 dark:bg-white/5 rounded-3xl border border-slate-100 dark:border-white/10 border-dashed">
            <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-sm mb-4">
              {icon}
            </div>
            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-lg mb-1">No {title.toLowerCase()} found</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm">
              We are currently updating our listings for {title}. Check back soon!
            </p>
          </div>
        )}

        {/* Scroll row */}
        {!loading && items.length > 0 && (
          <div
            ref={scrollRef}
            className="flex gap-5 overflow-x-auto snap-scroll pb-4"
            style={{ scrollbarWidth: "none" }}
          >
            {items.map((item, i) => (
              <motion.div
                key={item.id}
                className="flex-shrink-0 w-[85vw] sm:w-[320px] md:w-[340px] lg:w-[360px] h-[420px] sm:h-[500px] lg:h-[540px] cursor-pointer block group"
                initial={{ opacity: 0, x: 40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.07 }}
                style={{ scrollSnapAlign: "start" }}
              >
                <Link href={`/vendor/${item.id}`} className="block w-full h-full">
                  <VendorCard
                    id={item.id}
                    name={item.name}
                    location={item.location}
                    price={item.price}
                    unit={item.unit}
                    rating={item.rating}
                    image={item.image}
                    tags={
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-full bg-white text-slate-700 shadow-sm">
                        {icon}
                        {item.tag}
                      </div>
                    }
                  />
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
