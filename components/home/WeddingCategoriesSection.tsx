"use client";

import { motion } from "framer-motion";
import CustomImage from "@/components/shared/CustomImage";
import { VENDOR_CATEGORIES } from "@/lib/config/categories";
import Link from "next/link";

export default function WeddingCategoriesSection() {
  return (
    <section className="py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          className="flex flex-col items-center text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div>
            <p
              className="text-sm font-semibold uppercase tracking-widest mb-2"
              style={{ color: "var(--sw-primary)" }}
            >
              Browse By Category
            </p>
            <h2 className="section-heading">Wedding Categories</h2>
            <p className="section-subtext mx-auto">Find every vendor you need for the perfect day</p>
          </div>
        </motion.div>

        {/* Categories Flex Container */}
        <div className="flex flex-wrap justify-center gap-4 md:gap-8 mt-8 pb-4 md:pb-0">
          {VENDOR_CATEGORIES.map((cat, i) => {
            return (
              <motion.div
                key={cat.slug}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: Math.min(i * 0.03, 0.3) }}
              >
                <Link
                  href={`/category/${cat.slug}`}
                  className="group min-w-[105px] w-[105px] md:min-w-0 md:w-[125px] flex flex-col items-center justify-start gap-2.5 p-1.5 flex-shrink-0"
                >
                  <div
                    className="relative w-16 h-16 rounded-full overflow-hidden shadow-sm group-hover:shadow-md transition-all duration-300 ring-2 ring-orange-200/80 dark:ring-orange-500/30 group-hover:ring-4 group-hover:ring-[var(--sw-primary)]"
                  >
                    <CustomImage
                      src={cat.image}
                      alt={cat.name}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-500"
                      sizes="64px"
                    />
                  </div>
                  <div className="text-center flex flex-col items-center">
                    <h3
                      className="text-[13px] font-bold text-slate-900 dark:text-white group-hover:text-[var(--sw-primary)] transition-colors leading-tight line-clamp-1"
                      style={{ fontFamily: "var(--font-heading)" }}
                    >
                      {cat.name}
                    </h3>
                    <p className="text-[9px] text-slate-500 dark:text-slate-400 font-extrabold uppercase tracking-wide mt-0.5 line-clamp-1">
                      {cat.tagline}
                    </p>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

