"use client";

import { useState, useMemo } from "react";
import { motion, Variants } from "framer-motion";
import { VENDOR_CATEGORIES } from "@/lib/config/categories";
import Link from "next/link";
import CustomImage from "@/components/shared/CustomImage";
import { ArrowRight, Search, Sparkles } from "lucide-react";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 120,
      damping: 14,
    },
  },
};

export default function CategoriesPage() {
  const [searchQuery, setSearchQuery] = useState("");

  // Filter for search
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return VENDOR_CATEGORIES;
    const q = searchQuery.toLowerCase();
    return VENDOR_CATEGORIES.filter(
      (cat) =>
        cat.name.toLowerCase().includes(q) ||
        cat.tagline.toLowerCase().includes(q) ||
        cat.slug.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[var(--sw-deep-navy)] pt-32 pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header Section */}
        <motion.div
          className="text-center max-w-3xl mx-auto mb-16"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          <span
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest mb-3 px-3 py-1 rounded-full"
            style={{
              background: "rgba(238, 116, 41, 0.1)",
              color: "var(--sw-primary)",
              border: "1px solid rgba(238, 116, 41, 0.2)",
            }}
          >
            <Sparkles className="w-3.5 h-3.5" /> Discover Your Perfect Match
          </span>
          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-extrabold mb-6 text-slate-900 dark:text-white tracking-tight"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Wedding Categories
          </h1>
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
            From dreamy venues to flawless makeup, explore our selection of top-tier wedding professionals ready to bring your vision to life.
          </p>
        </motion.div>

        {/* ── IMAGE CATEGORIES GRID ────────────────────────────────────────── */}
        <div className="mb-16">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div>
              <h2
                className="text-2xl font-bold text-slate-900 dark:text-white"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Available Categories
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Our active wedding services, ready for booking
              </p>
            </div>
            
            <div className="flex items-center gap-3 w-full sm:w-auto">
              {/* Quick search input */}
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search categories…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-full border border-slate-200 dark:border-white/15 bg-white dark:bg-white/5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[var(--sw-primary)]"
                />
              </div>
              <span className="text-xs font-semibold px-3 py-2 rounded-full bg-slate-200/70 dark:bg-white/10 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                {VENDOR_CATEGORIES.length} Active
              </span>
            </div>
          </div>

          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {filteredCategories.map((category) => (
              <motion.div key={category.slug} variants={itemVariants}>
                <Link
                  href={`/${category.slug}`}
                  className="group flex flex-col bg-white dark:bg-white/5 rounded-2xl overflow-hidden border border-slate-200/80 dark:border-white/10 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full"
                >
                  {/* Card Image Container */}
                  <div className="relative w-full h-48 overflow-hidden bg-slate-100 dark:bg-slate-800">
                    <CustomImage
                      src={category.image}
                      alt={category.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/20 to-transparent" />

                    {/* Tagline Badge on Image */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                      <span className="px-2.5 py-1 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md text-[10px] font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 border border-white/20">
                        {category.tagline}
                      </span>
                    </div>

                    {/* Category Title on Image overlay */}
                    <div className="absolute bottom-3 left-4 right-4">
                      <h3
                        className="text-lg font-bold text-white group-hover:text-[var(--sw-secondary)] transition-colors leading-snug drop-shadow-sm"
                        style={{ fontFamily: "var(--font-heading)" }}
                      >
                        {category.name}
                      </h3>
                    </div>
                  </div>

                  {/* Card Footer Content */}
                  <div className="p-4 flex items-center justify-end bg-white dark:bg-slate-900/40 mt-auto">
                    <div className="flex items-center text-xs font-bold text-[var(--sw-primary)] group-hover:translate-x-1 transition-transform">
                      <span>Explore Category</span>
                      <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>

          {filteredCategories.length === 0 && (
            <div className="text-center py-12 bg-white dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 mt-6">
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                No categories matching "{searchQuery}"
              </p>
              <button
                onClick={() => setSearchQuery("")}
                className="mt-3 text-xs font-bold text-[var(--sw-primary)] underline"
              >
                Clear search
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

