"use client";

import { useState, useMemo, useEffect } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, Building2 } from "lucide-react";
import VendorCard from "@/components/vendors/VendorCard";
import VenueFilterBar from "@/components/venues/VenueFilterBar";
import { relevanceSearch } from "@/lib/search";
import Link from "next/link";

interface Vendor {
  _id: string;
  name: string;
  businessName: string;
  category: string;
  city: string;
  priceFrom: number;
  rating: number;
  reviewCount: number;
  images: string[];
  featured: boolean;
  verified: boolean;
}

export default function VendorCategoryPage() {
  const params = useParams();
  const categoryParam = params.category as string;
  
  // Format category for display (e.g. "planners" -> "Planners")
  const displayCategory = categoryParam.charAt(0).toUpperCase() + categoryParam.slice(1);

  const [allVendors, setAllVendors] = useState<Vendor[]>([]);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  
  const [search, setSearch] = useState("");
  const [activeCities, setActiveCities] = useState<string[]>([]);
  const [visibleCount, setVisibleCount] = useState(12);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Fetch vendors by category
  useEffect(() => {
    setFetchLoading(true);
    setFetchError(null);
    const isService = ["planners", "caterers", "decorators", "photography", "rooms"].includes(categoryParam);
    const apiPath = isService ? "/api/services" : "/api/vendors";

    fetch(`${apiPath}?category=${categoryParam}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load listings");
        return res.json();
      })
      .then((data) => {
        if (isService) {
          // Map ServiceListing to Vendor structure for VendorCard
          const mapped = (data.services || []).map((s: any) => ({
            _id: s.serviceId,
            name: s.name,
            businessName: s.name,
            category: s.category,
            city: s.city,
            priceFrom: s.priceFrom,
            rating: s.rating || 0,
            reviewCount: s.reviewCount || 0,
            images: s.image ? [s.image] : [],
            featured: s.featured,
            verified: s.verified,
          }));
          setAllVendors(mapped);
        } else {
          setAllVendors(data.vendors || []);
        }
      })
      .catch((err) => setFetchError(err.message))
      .finally(() => setFetchLoading(false));
  }, [categoryParam]);

  const filtered = useMemo(() => {
    let list = [...allVendors];

    if (activeCities.length > 0) {
      list = list.filter((v) => activeCities.some((city) => v.city.toLowerCase().includes(city.toLowerCase())));
    }

    if (search.trim()) {
      list = relevanceSearch(list, search, (v) => [
        { value: v.businessName || v.name, weight: 10 },
        { value: v.category, weight: 6 },
        { value: v.city, weight: 5 },
      ]);
    }

    return list;
  }, [search, activeCities, allVendors]);

  const visible = filtered.slice(0, visibleCount);

  const handleLoadMore = () => {
    setIsLoadingMore(true);
    setTimeout(() => {
      setVisibleCount((c) => c + 12);
      setIsLoadingMore(false);
    }, 400);
  };

  if (fetchLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[var(--sw-white)]">
        <Loader2 className="w-10 h-10 animate-spin text-[var(--sw-primary)]" />
        <p className="text-sm text-slate-500 font-medium">Finding the best {displayCategory}...</p>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 bg-[var(--sw-white)]">
        <Building2 className="w-12 h-12 text-red-400" />
        <p className="text-base font-bold text-slate-700">Failed to load vendors</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 px-6 py-2.5 rounded-full text-sm font-bold text-white bg-[var(--sw-primary)]"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--sw-white)]">
      {/* ══════════════════════ HERO ══════════════════════ */}
      <div className="pt-28 pb-4 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div
          className="relative overflow-hidden pt-16 pb-16 px-4 text-center rounded-[40px] shadow-sm border border-[rgba(238,116,41,0.6)]"
          style={{ background: "linear-gradient(150deg, #fdf6f0 0%, #fceee3 40%, #f5dcc9 100%)" }}
        >
          <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-5 text-xs font-bold uppercase tracking-widest text-[var(--sw-primary)] bg-[rgba(238,116,41,0.12)] border border-[rgba(238,116,41,0.25)]">
            Explore Expert {displayCategory}
          </div>
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold mb-5 leading-[1.1] text-[var(--sw-navy)] font-heading">
            Wedding <span className="text-transparent bg-clip-text bg-gradient-to-br from-[var(--sw-primary)] to-[#f5a623]">{displayCategory}</span>
          </h1>
          <p className="text-base sm:text-lg text-slate-500 mb-10 max-w-xl mx-auto leading-relaxed">
            Discover the finest {displayCategory.toLowerCase()} curated to make your special day perfect.
          </p>
        </motion.div>
      </div>
      </div>

      {/* ══════════════════════ FILTER BAR ══════════════════════ */}
      <VenueFilterBar
        activeCities={activeCities}
        onCityChange={setActiveCities}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={`Search ${displayCategory.toLowerCase()} by name or city...`}
      />

      {/* ══════════════════════ MAIN CONTENT ══════════════════════ */}
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="mb-8">
          <p className="text-sm text-slate-500">
            Showing <span className="font-bold text-slate-800">{filtered.length}</span> {displayCategory.toLowerCase()}
            {activeCities.length > 0 && <span> in <span className="font-bold text-[var(--sw-primary)]">{activeCities.join(", ")}</span></span>}
          </p>
        </div>

        {/* Grid */}
        {visible.length === 0 ? (
          <div className="text-center py-20 flex flex-col items-center">
            <p className="text-2xl font-bold mb-2 text-[var(--sw-navy)] font-heading">No {displayCategory.toLowerCase()} found</p>
            <p className="text-slate-400 text-sm mb-6 max-w-xs">We couldn't find any {displayCategory.toLowerCase()} matching your criteria.</p>
            <button onClick={() => { setSearch(""); setActiveCities([]); }} className="px-6 py-2.5 rounded-full text-sm font-bold text-white bg-[var(--sw-primary)] shadow-[0_4px_14px_rgba(238,116,41,0.35)]">
              Clear All Filters
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap justify-center gap-5">
            {visible.map((vendor, i) => (
              <motion.div key={vendor._id} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: Math.min(i * 0.05, 0.4) }} className="w-full sm:w-[320px] md:w-[340px] lg:w-[360px] h-[460px] sm:h-[500px] lg:h-[540px]">
                <Link href={`/vendor/${vendor._id}`} className="block h-full w-full">
                  <VendorCard
                    id={vendor._id}
                    name={vendor.businessName || vendor.name}
                    location={vendor.city}
                    price={vendor.priceFrom ? vendor.priceFrom.toString() : "On Request"}
                    unit="starting price"
                    rating={vendor.rating}
                    reviewCount={vendor.reviewCount}
                    image={vendor.images?.[0] || "/images/placeholder-vendor.jpg"}
                    tags={
                      <div className="flex items-center text-[11px] font-bold px-3 py-1.5 rounded-full bg-white shadow-sm text-[var(--sw-primary)]">
                        {displayCategory}
                      </div>
                    }
                  />
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        {/* Load more */}
        {visibleCount < filtered.length && (
          <div className="text-center mt-14">
            <button
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              className="px-10 py-4 rounded-full font-bold text-sm transition-all text-white bg-gradient-to-br from-[var(--sw-navy)] to-[#2a3747] shadow-[0_6px_20px_rgba(55,71,90,0.3)] hover:-translate-y-0.5"
            >
              {isLoadingMore ? "Loading..." : "Load More"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
