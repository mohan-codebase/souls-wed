"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import Image from "@/components/shared/CustomImage";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Coins, Building2, Globe2, BedDouble, CalendarHeart, ChefHat, Palette, ClipboardList, Utensils } from "lucide-react";
import { SlidersHorizontalIcon } from "@/components/ui/sliders-horizontal";
import { XIcon } from "@/components/ui/x";
import { CheckIcon } from "@/components/ui/check";
import { SearchIcon } from "@/components/ui/search";
import { UsersIcon } from "@/components/ui/users";
import { LayersIcon } from "@/components/ui/layers";
import { SparklesIcon } from "@/components/ui/sparkles";
import { LayoutGridIcon } from "@/components/ui/layout-grid";
import { ChevronRightIcon } from "@/components/ui/chevron-right";
import { ChevronLeftIcon } from "@/components/ui/chevron-left";
import { cities } from "@/lib/venues-data";
import { useCurrency } from "@/lib/CurrencyContext";
import { formatAsCurrency, CURRENCIES } from "@/lib/currency";
import { VENDOR_CATEGORIES } from "@/lib/config/categories";
import { GUEST_BANDS, BUDGET_BANDS, guestBandLabel, budgetBandLabel } from "@/lib/config/search";
interface Props {
  activeCities: string[];
  onCityChange: (cities: string[]) => void;
  activeCategory?: string;
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  /** Wires the "Guests" chip to the real `?guests=` query param instead of decorative local state. */
  guests?: number | null;
  onGuestsChange?: (value: number | null) => void;
  /** Wires the "Price Range" chip to the real `?budget=` query param instead of decorative local state. */
  budget?: number | null;
  onBudgetChange?: (value: number | null) => void;
}

export default function VenueFilterBar({
  activeCities,
  onCityChange,
  activeCategory,
  search,
  onSearchChange,
  searchPlaceholder,
  guests,
  onGuestsChange,
  budget,
  onBudgetChange,
}: Props) {
  const [localCities, setLocalCities] = useState<string[]>(activeCities || []);
  const [localSearch, setLocalSearch] = useState(search || "");
  const [prevActiveCities, setPrevActiveCities] = useState(activeCities);
  const [prevSearch, setPrevSearch] = useState(search);

  if (activeCities !== prevActiveCities) {
    setPrevActiveCities(activeCities);
    setLocalCities(activeCities || []);
  }

  if (search !== prevSearch) {
    setPrevSearch(search);
    setLocalSearch(search || "");
  }

  const [searchFocused, setSearchFocused] = useState(false);
  const { currency, setCurrency } = useCurrency();
  const [openFilter, setOpenFilter] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const filterContainerRef = useRef<HTMLDivElement>(null);

  const noCitySelected = localCities.length === 0;

  const handleApplySearch = () => {
    onCityChange(localCities);
    if (onSearchChange) {
      onSearchChange(localSearch);
    }
  };

  // Live search: debounce as the user types instead of requiring Enter/click.
  useEffect(() => {
    if (!onSearchChange) return;
    if (localSearch === (search || "")) return;
    const timeout = setTimeout(() => onSearchChange(localSearch), 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localSearch]);

  // City selection applies immediately — no need to hit Search first.
  useEffect(() => {
    if (localCities === activeCities) return;
    const same =
      localCities.length === activeCities.length &&
      localCities.every((c) => activeCities.includes(c));
    if (!same) onCityChange(localCities);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localCities]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterContainerRef.current && !filterContainerRef.current.contains(event.target as Node)) {
        setOpenFilter(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // "Guests" and "Price Range" are real filters — wired to the `?guests=` and
  // `?budget=` query params via the same bands the rest of the search pipeline
  // uses (lib/config/search.ts) — when the parent passes a change handler.
  // Without one they fall back to decorative local-only options, same as the
  // still-unwired "Venue Type" / "Space" / "Features" chips.
  const guestsWired = typeof onGuestsChange === "function";
  const budgetWired = typeof onBudgetChange === "function";

  const filters = useMemo(() => {
    let priceOptions = ["Under ₹50,000", "₹50k–₹2L", "₹2L–₹5L", "₹5L+"];
    if (currency !== "INR") {
      const p50k = formatAsCurrency(50000, currency);
      const p2L = formatAsCurrency(200000, currency);
      const p5L = formatAsCurrency(500000, currency);
      priceOptions = [`Under ${p50k}`, `${p50k}–${p2L}`, `${p2L}–${p5L}`, `${p5L}+`];
    }

    return [
      {
        label: "Guests",
        Icon: UsersIcon,
        options: guestsWired ? GUEST_BANDS.map((b) => b.label) : ["Up to 100", "100–300", "300–600", "600+"],
      },
      {
        label: "Price Range",
        Icon: Coins,
        // Budget bands are always INR — `priceFrom` is stored in INR and every
        // other budget chip in the app (VenuesDirectory, PublicVendorDirectory)
        // already renders it that way regardless of display currency.
        options: budgetWired ? BUDGET_BANDS.map((b) => b.label) : priceOptions,
      },
      {
        label: "Venue Type",
        Icon: Building2,
        options: ["5-Star Hotel", "Resort", "Garden Venue", "Banquet Hall", "Palace"],
      },
      {
        label: "Space",
        Icon: LayersIcon,
        options: ["Indoor", "Outdoor", "Both"],
      },
      {
        label: "Features",
        Icon: SparklesIcon,
        options: ["In-house Catering", "Parking", "Bridal Suite", "Overnight Stay"],
      },
    ];
  }, [currency, guestsWired, budgetWired]);

  const toggleFilter = (label: string) =>
    setOpenFilter(openFilter === label ? null : label);

  const selectOption = (filterLabel: string, option: string) => {
    if (filterLabel === "Guests" && guestsWired) {
      onGuestsChange?.(GUEST_BANDS.find((b) => b.label === option)?.value ?? null);
      setOpenFilter(null);
      return;
    }
    if (filterLabel === "Price Range" && budgetWired) {
      onBudgetChange?.(BUDGET_BANDS.find((b) => b.label === option)?.value ?? null);
      setOpenFilter(null);
      return;
    }
    setActiveFilters((prev) => ({ ...prev, [filterLabel]: option }));
    setOpenFilter(null);
  };

  const clearFilter = (filterLabel: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (filterLabel === "Guests" && guestsWired) {
      onGuestsChange?.(null);
      return;
    }
    if (filterLabel === "Price Range" && budgetWired) {
      onBudgetChange?.(null);
      return;
    }
    const next = { ...activeFilters };
    delete next[filterLabel];
    setActiveFilters(next);
  };

  const activeCount =
    Object.keys(activeFilters).length +
    (guestsWired && guests ? 1 : 0) +
    (budgetWired && budget ? 1 : 0);


  return (
    <div className="px-4 mt-6 mb-8 flex flex-col gap-6 max-w-7xl mx-auto">

      {/* ═══════════ ROW 1 — Filter chips ═══════════ */}
      <div
        ref={filterContainerRef}
        className="flex items-center justify-center gap-2 flex-wrap relative z-40 mx-auto"
        style={{ scrollbarWidth: "none" }}
      >
        {/* Main filter button */}
        <button
          className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all cursor-pointer"
          style={{
            background: activeCount > 0
              ? "linear-gradient(135deg, var(--sw-primary) 0%, #f5932a 100%)"
              : "linear-gradient(135deg, var(--sw-ink) 0%, #2a3747 100%)",
            color: "white",
          }}
        >
          <SlidersHorizontalIcon className="w-4 h-4" />
          <span>Filters</span>
          <AnimatePresence>
            {activeCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="w-5 h-5 rounded-full text-xs font-black flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.28)" }}
              >
                {activeCount}
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        {/* Divider */}
        <div className="h-6 w-px flex-shrink-0 mx-1" style={{ background: "rgba(0,0,0,0.1)" }} />

        {/* Filter chips */}
        <div className="flex items-center justify-center gap-2 flex-wrap" style={{ scrollbarWidth: "none" }}>
          {filters.map((f) => {
            const isGuestsFilter = f.label === "Guests" && guestsWired;
            const isBudgetFilter = f.label === "Price Range" && budgetWired;
            const wiredLabel = isGuestsFilter
              ? guestBandLabel(guests ?? null)
              : isBudgetFilter
                ? budgetBandLabel(budget ?? null)
                : null;
            const isActive = isGuestsFilter || isBudgetFilter ? wiredLabel !== null : !!activeFilters[f.label];
            const isOpen = openFilter === f.label;
            const { Icon } = f;

            return (
              <div key={f.label} className="relative flex-shrink-0">
                <button
                  onClick={() => toggleFilter(f.label)}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 cursor-pointer"
                  style={{
                    background: isActive
                      ? "linear-gradient(135deg, rgba(238,116,41,0.12) 0%, rgba(245,163,42,0.08) 100%)"
                      : isOpen
                        ? "white"
                        : "var(--sw-chip-bg)",
                    color: isActive ? "var(--sw-primary)" : "var(--sw-navy)",
                    border: isActive
                      ? "1.5px solid rgba(238,116,41,0.3)"
                      : isOpen
                        ? "1.5px solid rgba(55,71,90,0.15)"
                        : "1.5px solid rgba(55,71,90,0.08)",
                    backdropFilter: "blur(12px)",
                  }}
                >
                  <Icon
                    className="w-3.5 h-3.5 flex-shrink-0"
                    style={{ opacity: isActive ? 1 : 0.6 }}
                  />
                  <span>{isActive ? (wiredLabel ?? activeFilters[f.label]) : f.label}</span>
                  {isActive ? (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      onClick={(e) => clearFilter(f.label, e)}
                      className="w-4 h-4 rounded-full flex items-center justify-center cursor-pointer ml-1"
                      style={{ background: "rgba(238,116,41,0.18)" }}
                    >
                      <XIcon className="w-2.5 h-2.5" style={{ color: "var(--sw-primary)" }} />
                    </motion.span>
                  ) : (
                    <motion.span
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                      className="flex-shrink-0 ml-1"
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </motion.span>
                  )}
                </button>

                {/* Dropdown */}
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.96 }}
                      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                      className="absolute top-full left-0 mt-3 w-64 rounded-3xl z-50 overflow-hidden"
                      style={{
                        background: "var(--sw-nav-solid)",
                        border: "1px solid rgba(0,0,0,0.1)",
                        boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
                      }}
                    >
                      {/* Dropdown header */}
                      <div
                        className="flex items-center gap-2 px-5 py-3.5"
                        style={{ borderBottom: "1px solid rgba(0,0,0,0.05)", background: "rgba(250,250,250,0.5)" }}
                      >
                        <Icon className="w-4 h-4" style={{ color: "var(--sw-primary)" }} />
                        <span className="text-xs font-black uppercase tracking-widest text-slate-400">
                          {f.label}
                        </span>
                      </div>

                      <div className="py-2">
                        {f.options.map((opt) => {
                          const isSelected =
                            isGuestsFilter || isBudgetFilter ? wiredLabel === opt : activeFilters[f.label] === opt;
                          return (
                            <button
                              key={opt}
                              onClick={() => selectOption(f.label, opt)}
                              className="w-full flex items-center justify-between px-5 py-3 text-sm transition-all cursor-pointer group"
                              style={{
                                color: isSelected ? "var(--sw-primary)" : "var(--sw-navy)",
                                fontWeight: isSelected ? 700 : 500,
                              }}
                            >
                              {opt}
                              <motion.span
                                initial={false}
                                animate={{ scale: isSelected ? 1 : 0, opacity: isSelected ? 1 : 0 }}
                                transition={{ duration: 0.15 }}
                              >
                                <CheckIcon className="w-4 h-4" style={{ color: "var(--sw-primary)" }} />
                              </motion.span>
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}

          {/* Clear all */}
          <AnimatePresence>
            {activeCount > 0 && (
              <motion.button
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                onClick={() => {
                  setActiveFilters({});
                  if (guestsWired) onGuestsChange?.(null);
                  if (budgetWired) onBudgetChange?.(null);
                }}
                className="flex-shrink-0 text-xs font-bold underline underline-offset-4 transition-colors cursor-pointer ml-2"
                style={{ color: "var(--sw-navy)", opacity: 0.6 }}
              >
                Clear all
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ═══════════ ROW 2 — City circles ═══════════ */}
      <div className="flex flex-col items-center gap-4 mt-2">
        <div className="flex items-center gap-3">
          <div className="h-px w-12 bg-gradient-to-r from-transparent to-slate-200" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Destinations</span>
          <div className="h-px w-12 bg-gradient-to-l from-transparent to-slate-200" />
        </div>

        <div
          className="flex items-end justify-center gap-4 flex-wrap"
          style={{ paddingBottom: "4px" }}
        >
          {/* All Cities circle */}
          <button
            onClick={() => setLocalCities([])}
            className="flex-shrink-0 flex flex-col items-center gap-2.5 cursor-pointer"
          >
            <div
              className="relative transition-all duration-300"
              style={{
                width: 76,
                height: 76,
                borderRadius: "50%",
                padding: noCitySelected ? "3px" : "2px",
                background: noCitySelected
                  ? "linear-gradient(135deg, var(--sw-primary), #f5a623)"
                  : "rgba(55,71,90,0.06)",
              }}
            >
              <div
                className="w-full h-full rounded-full flex items-center justify-center relative overflow-hidden"
                style={{
                  background: noCitySelected
                    ? "linear-gradient(135deg, var(--sw-ink) 0%, #1e293b 100%)"
                    : "white",
                }}
              >
                {noCitySelected && (
                  <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay pointer-events-none" />
                )}
                <Globe2
                  className="w-7 h-7 relative z-10"
                  style={{
                    color: noCitySelected ? "white" : "var(--sw-navy)",
                    opacity: noCitySelected ? 1 : 0.5,
                  }}
                />
              </div>
            </div>
            <span
              className="text-[11px] font-extrabold transition-colors duration-200 uppercase tracking-wider"
              style={{ color: noCitySelected ? "var(--sw-primary)" : "#64748b" }}
            >
              All Cities
            </span>
          </button>

          {/* City circles */}
          {cities.map((city) => {
            const isActive = localCities.includes(city.name);
            return (
              <button
                key={city.name}
                onClick={() => {
                  if (isActive) {
                    setLocalCities(localCities.filter((c) => c !== city.name));
                  } else {
                    setLocalCities([...localCities, city.name]);
                  }
                }}
                className="flex-shrink-0 flex flex-col items-center gap-2.5 group cursor-pointer"
              >
                {/* Gradient ring + image */}
                <div
                  className="relative transition-all duration-300"
                  style={{
                    width: 76,
                    height: 76,
                    borderRadius: "50%",
                    padding: isActive ? "3px" : "2px",
                    background: isActive
                      ? "linear-gradient(135deg, var(--sw-primary), #f5a623)"
                      : "rgba(0,0,0,0.04)",
                  }}
                >
                  <div className="w-full h-full rounded-full overflow-hidden relative">
                    <Image
                      src={city.image}
                      alt={city.name}
                      fill
                      className="object-cover"
                      sizes="76px"
                    />
                    {/* Orange tint when active */}
                    {isActive && (
                      <div
                        className="absolute inset-0"
                        style={{ background: "rgba(238,116,41,0.2)" }}
                      />
                    )}
                  </div>

                  {/* CheckIcon badge */}
                  {isActive && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 20 }}
                      className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center"
                      style={{
                        background: "var(--sw-primary)",
                        border: "2px solid white",
                      }}
                    >
                      <CheckIcon className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                    </motion.div>
                  )}
                </div>

                {/* City name */}
                <span
                  className="text-[11px] font-extrabold transition-colors duration-200 uppercase tracking-wider text-center"
                  style={{
                    color: isActive ? "var(--sw-primary)" : "#64748b",
                    maxWidth: 76,
                  }}
                >
                  {city.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══════════ ROW 3 — Search Bar with Search Button ═══════════ */}
      {onSearchChange && (
        <div className="max-w-3xl mx-auto w-full relative">
          <div
            className="flex items-center rounded-full p-2 pl-6 gap-3 transition-all duration-300"
            style={{
              background: "white",
              border: searchFocused
                ? "2px solid var(--sw-primary)"
                : "2px solid rgba(0,0,0,0.12)",
            }}
          >
            <SearchIcon
              className="w-5 h-5 flex-shrink-0 transition-colors duration-300"
              style={{ color: searchFocused ? "var(--sw-primary)" : "#94a3b8" }}
            />
            <input
              type="text"
              placeholder={searchPlaceholder || "Search by venue name, city, or location…"}
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleApplySearch();
                }
              }}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              className="flex-1 text-sm font-medium outline-none bg-transparent"
              style={{ color: "var(--sw-navy)" }}
            />
            <AnimatePresence>
              {localSearch && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  onClick={() => {
                    setLocalSearch("");
                    if (onSearchChange) onSearchChange("");
                  }}
                  className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-colors mr-1 cursor-pointer"
                  style={{ background: "rgba(0,0,0,0.06)" }}
                  title="Clear search"
                >
                  <XIcon className="w-3.5 h-3.5 text-slate-500" />
                </motion.button>
              )}
            </AnimatePresence>

            <button
              onClick={handleApplySearch}
              type="button"
              className="flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold text-white flex-shrink-0 transition-all cursor-pointer"
              style={{
                background: "linear-gradient(135deg, var(--sw-primary) 0%, #f5932a 100%)",
              }}
            >
              <SearchIcon className="w-4 h-4 text-white" />
              <span>Search</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

