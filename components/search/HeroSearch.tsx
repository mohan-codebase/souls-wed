"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { CalendarDays, LayoutGrid, Loader2, MapPin, Users, X } from "lucide-react";
import { SearchIcon } from "@/components/ui/search";
import BookingCalendar from "@/components/booking/BookingCalendar";
import SearchSegment, { Option, OptionList } from "@/components/search/SearchSegment";
import StayGuestSelector, {
  type CustomGuestState,
  DEFAULT_CUSTOM_GUEST_STATE,
} from "@/components/search/StayGuestSelector";
import {
  RESOLVED_CATEGORY_GROUPS,
  buildSearchHref,
  categoryBySlug,
  categoryNoun,
  heroSearchFields,
} from "@/lib/config/search";
import { VENDOR_CATEGORIES } from "@/lib/config/categories";

// ─────────────────────────────────────────────────────────────────────────────
// HERO SEARCH
//
// Intent-first: the couple picks *what* they are looking for, and the bar
// reveals only the fields that category can actually be filtered by. A
// jeweller has no event date and no guest count; a banquet hall has both.
// See docs/hero-search-analysis.md §2.4 and §7.
// ─────────────────────────────────────────────────────────────────────────────

type SegmentKey = "category" | "city" | "date" | "guests";

interface CitySuggestion {
  city: string;
  count: number;
}

interface ListingSuggestion {
  name: string;
  city: string;
  category: string;
  href: string;
}

interface CategorySuggestion {
  slug: string;
  name: string;
}

interface SuggestResponse {
  cities: CitySuggestion[];
  listings: ListingSuggestion[];
  categories: CategorySuggestion[];
}

const EMPTY_SUGGESTIONS: SuggestResponse = { cities: [], listings: [], categories: [] };

function formatDayLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

export default function HeroSearch() {
  const router = useRouter();
  const barRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState<SegmentKey | null>(null);
  const [highlighted, setHighlighted] = useState<SegmentKey | null>(null);

  const [category, setCategory] = useState<string | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const [guests, setGuests] = useState<number | null>(null);
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null);

  const [customGuests, setCustomGuests] = useState<CustomGuestState>(DEFAULT_CUSTOM_GUEST_STATE);
  const [isCustomApplied, setIsCustomApplied] = useState(false);

  const [cityQuery, setCityQuery] = useState("");
  const [categoryQuery, setCategoryQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SuggestResponse>(EMPTY_SUGGESTIONS);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [navigating, setNavigating] = useState(false);

  /** How many listings the current selection would return; null = unknown. */
  const [matchCount, setMatchCount] = useState<number | null>(null);
  const [countLoading, setCountLoading] = useState(false);

  const activeCategory = useMemo(() => categoryBySlug(category), [category]);
  const fields = useMemo(() => new Set(heroSearchFields(activeCategory)), [activeCategory]);

  const guestDisplayLabel = useMemo(() => {
    if (isCustomApplied) {
      const parts = [];
      parts.push(`${customGuests.adults} Adult${customGuests.adults > 1 ? "s" : ""}`);
      if (customGuests.children > 0) {
        parts.push(`${customGuests.children} Child${customGuests.children > 1 ? "ren" : ""}`);
      }
      return parts.join(", ");
    }
    return null;
  }, [isCustomApplied, customGuests]);

  // Note: a date or guest count picked before switching to a category that has
  // neither is kept in state (so switching back restores it) but never reaches
  // the URL — `buildSearchHref` drops any field the category can't filter on.

  // ── Click-outside ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(event.target as Node)) setOpen(null);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  // ── Typeahead ─────────────────────────────────────────────────────────────
  // Cities come from listings that exist, scoped to the chosen category, so we
  // can never offer a destination with zero inventory.
  useEffect(() => {
    if (open !== "city") return;

    const controller = new AbortController();
    const term = cityQuery.trim();
    const params = new URLSearchParams({ q: term });
    if (category) params.set("category", category);

    const timer = setTimeout(() => {
      setLoadingSuggestions(true);
      fetch(`/api/search/suggest?${params}`, { signal: controller.signal })
        .then((res) => res.json())
        .then((data: Partial<SuggestResponse>) =>
          setSuggestions({
            cities: data.cities ?? [],
            listings: data.listings ?? [],
            categories: data.categories ?? [],
          }),
        )
        .catch(() => {
          /* aborted or offline — leave the last good result on screen */
        })
        .finally(() => setLoadingSuggestions(false));
    }, term ? 220 : 0);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [open, cityQuery, category]);

  // ── Live result count ─────────────────────────────────────────────────────
  // Runs the same query the results page will run, so the number on the button
  // is the number of cards the user lands on. Purely an enhancement: if it
  // fails or is still loading, the button falls back to plain "Search".
  const href = useMemo(
    () => buildSearchHref({ category, city, guests, ...(dateRange ?? {}) }),
    [category, city, guests, dateRange],
  );

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (city) params.set("city", city);
    if (fields.has("guests") && guests) params.set("guests", String(guests));
    if (fields.has("date") && dateRange) {
      params.set("start", dateRange.start);
      params.set("end", dateRange.end);
    }

    const timer = setTimeout(() => {
      setCountLoading(true);
      fetch(`/api/search/count?${params}`, { signal: controller.signal })
        .then((res) => res.json())
        .then((data: { count?: number | null }) =>
          setMatchCount(typeof data.count === "number" ? data.count : null),
        )
        .catch(() => {
          /* aborted or offline — hide the count rather than guess */
        })
        .finally(() => setCountLoading(false));
    }, 250);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [category, city, guests, dateRange, fields]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const submit = useCallback(() => {
    setOpen(null);
    setNavigating(true);
    router.push(href);
  }, [router, href]);

  // Navigation replaces the page, but a push to the URL we are already on is a
  // no-op — without this the button would stay disabled forever.
  useEffect(() => {
    if (!navigating) return;
    const timer = setTimeout(() => setNavigating(false), 4000);
    return () => clearTimeout(timer);
  }, [navigating]);

  const reset = () => {
    setCategory(null);
    setCity(null);
    setGuests(null);
    setDateRange(null);
    setIsCustomApplied(false);
    setCustomGuests(DEFAULT_CUSTOM_GUEST_STATE);
    setCityQuery("");
    setCategoryQuery("");
    setSuggestions(EMPTY_SUGGESTIONS);
  };

  const hasSelection = Boolean(category || city || guests || dateRange);

  /**
   * True when something other than the category is narrowing the results — the
   * difference between "this category is empty" and "your filters are too tight",
   * which need different recovery advice.
   */
  const hasNarrowingFilters = Boolean(city || guests || dateRange);

  /**
   * "Search 12 venues" tells the user what they are about to get. Falls back to
   * plain "Search" while the count is in flight or unavailable, and never says
   * "0" — the zero case is handled by the hint below the bar.
   */
  const searchButtonLabel = useMemo(() => {
    if (countLoading || matchCount === null || matchCount === 0) return "Search";
    const noun =
      matchCount === 1 ? (activeCategory ? "result" : "listing") : categoryNoun(activeCategory);
    return `Search ${matchCount} ${noun}`;
  }, [countLoading, matchCount, activeCategory]);

  const dateLabel = dateRange
    ? dateRange.start === dateRange.end
      ? formatDayLabel(dateRange.start)
      : `${formatDayLabel(dateRange.start)} – ${formatDayLabel(dateRange.end)}`
    : null;

  const categoryGroups = useMemo(() => {
    const needle = categoryQuery.trim().toLowerCase();
    if (!needle) return RESOLVED_CATEGORY_GROUPS;
    return RESOLVED_CATEGORY_GROUPS.map((group) => ({
      label: group.label,
      items: group.items.filter(
        (c) => c.name.toLowerCase().includes(needle) || c.tagline.toLowerCase().includes(needle),
      ),
    })).filter((group) => group.items.length > 0);
  }, [categoryQuery]);

  const segmentProps = (key: SegmentKey) => ({
    isOpen: open === key,
    onOpenChange: (next: boolean) => setOpen(next ? key : null),
    isHighlighted: highlighted === key || (highlighted === null && open === key),
    onPointerHighlight: () => setHighlighted(key),
  });

  return (
    <div className="w-full max-w-5xl xl:max-w-6xl">
      <form
        className="relative z-30"
        role="search"
        aria-label="Find wedding venues and vendors"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
        onMouseLeave={() => setHighlighted(null)}
      >
        <div
          ref={barRef}
          className="rounded-[32px] md:rounded-full p-2 md:p-2.5 shadow-2xl flex flex-col md:flex-row items-stretch md:items-center gap-1 md:gap-0 relative z-20 w-full"
          style={{
            background: "var(--sw-nav-default)",
            backdropFilter: "blur(24px) saturate(180%)",
            border: "1px solid rgba(238,116,41,0.15)",
          }}
        >
          {/* ── What are you looking for ── */}
          <SearchSegment
            label="Looking for"
            value={activeCategory?.name ?? null}
            placeholder="All categories"
            icon={<LayoutGrid className="w-3.5 h-3.5 text-gray-400 shrink-0" aria-hidden="true" />}
            panelClassName="w-[min(84vw,360px)]"
            {...segmentProps("category")}
          >
            {(close) => (
              <>
                <div className="px-1 pt-1 pb-2">
                  <input
                    autoFocus
                    type="text"
                    value={categoryQuery}
                    onChange={(event) => setCategoryQuery(event.target.value)}
                    placeholder={`Search ${VENDOR_CATEGORIES.length} categories…`}
                    aria-label="Filter categories"
                    className="w-full rounded-full px-4 py-2.5 text-sm font-medium bg-[var(--sw-chip-bg)] border border-[rgba(238,116,41,0.15)] text-[var(--sw-navy)] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--sw-primary)]"
                  />
                </div>

                <OptionList label="Vendor categories">
                  <Option
                    selected={category === null}
                    onSelect={() => {
                      setCategory(null);
                      close();
                    }}
                  >
                    All categories
                  </Option>

                  {categoryGroups.map((group) => (
                    <div key={group.label} role="group" aria-label={group.label}>
                      <p className="px-4 pt-3 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                        {group.label}
                      </p>
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        return (
                          <Option
                            key={item.slug}
                            selected={category === item.slug}
                            icon={<Icon className="w-4 h-4" />}
                            onSelect={() => {
                              setCategory(item.slug);
                              close();
                            }}
                          >
                            {item.name}
                          </Option>
                        );
                      })}
                    </div>
                  ))}

                  {categoryGroups.length === 0 && (
                    <p className="px-4 py-6 text-sm text-center text-gray-500">
                      No category matches “{categoryQuery}”.
                    </p>
                  )}
                </OptionList>
              </>
            )}
          </SearchSegment>

          <Divider />

          {/* ── Where ── */}
          <SearchSegment
            label="Where"
            value={city}
            placeholder="Any city"
            icon={<MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" aria-hidden="true" />}
            panelClassName="w-[min(84vw,340px)]"
            {...segmentProps("city")}
          >
            {(close) => (
              <>
                <div className="px-1 pt-1 pb-2">
                  <input
                    autoFocus
                    type="text"
                    value={cityQuery}
                    onChange={(event) => setCityQuery(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "ArrowDown") {
                        // Straight from the input into the suggestion list.
                        event.preventDefault();
                        const first = document.querySelector<HTMLButtonElement>(
                          '[role="listbox"] [role="option"]',
                        );
                        first?.focus();
                        return;
                      }
                      if (event.key !== "Enter") return;
                      event.preventDefault();
                      // The suggestion list is already filtered by what was
                      // typed, so the top hit is the better answer than the raw
                      // text — "koc" should select "Kochi, India".
                      const match = suggestions.cities[0];
                      setCity(match?.city ?? cityQuery.trim() ?? null);
                      setCityQuery("");
                      close();
                    }}
                    placeholder="Search a city…"
                    aria-label="Search a city"
                    className="w-full rounded-full px-4 py-2.5 text-sm font-medium bg-[var(--sw-chip-bg)] border border-[rgba(238,116,41,0.15)] text-[var(--sw-navy)] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--sw-primary)]"
                  />
                </div>

                <OptionList label="City suggestions">
                  {city && (
                    <Option
                      selected={false}
                      onSelect={() => {
                        setCity(null);
                        setCityQuery("");
                        close();
                      }}
                      icon={<X className="w-4 h-4" />}
                    >
                      Clear “{city}”
                    </Option>
                  )}

                  {!cityQuery.trim() && suggestions.cities.length > 0 && (
                    <p className="px-4 pt-2 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                      Popular destinations
                    </p>
                  )}

                  {suggestions.cities.map((item) => (
                    <Option
                      key={item.city}
                      selected={city?.toLowerCase() === item.city.toLowerCase()}
                      icon={<MapPin className="w-4 h-4" />}
                      hint={`${item.count} listing${item.count === 1 ? "" : "s"}`}
                      onSelect={() => {
                        setCity(item.city);
                        setCityQuery("");
                        close();
                      }}
                    >
                      {item.city}
                    </Option>
                  ))}

                  {suggestions.categories.length > 0 && (
                    <>
                      <p className="px-4 pt-3 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                        Categories
                      </p>
                      {suggestions.categories.map((item) => (
                        <Option
                          key={item.slug}
                          selected={category === item.slug}
                          icon={<LayoutGrid className="w-4 h-4" />}
                          onSelect={() => {
                            setCategory(item.slug);
                            close();
                          }}
                        >
                          {item.name}
                        </Option>
                      ))}
                    </>
                  )}

                  {suggestions.listings.length > 0 && (
                    <>
                      <p className="px-4 pt-3 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                        Listings
                      </p>
                      {suggestions.listings.map((item) => (
                        <Option
                          key={item.href}
                          selected={false}
                          hint={item.city}
                          onSelect={() => {
                            close();
                            setNavigating(true);
                            router.push(item.href);
                          }}
                        >
                          {item.name}
                        </Option>
                      ))}
                    </>
                  )}

                  {loadingSuggestions && (
                    <p className="flex items-center gap-2 px-4 py-3 text-sm text-gray-500">
                      <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                      Searching…
                    </p>
                  )}

                  {/* Covers both "nothing matched what you typed" and the
                      blank-panel case where the chosen category has no
                      inventory anywhere yet. */}
                  {!loadingSuggestions &&
                    suggestions.cities.length === 0 &&
                    suggestions.listings.length === 0 &&
                    suggestions.categories.length === 0 && (
                      <div className="px-4 py-6 text-sm text-center text-gray-500">
                        {cityQuery.trim() ? (
                          <>
                            No {activeCategory?.name.toLowerCase() ?? "listings"} in “
                            {cityQuery.trim()}” yet.
                          </>
                        ) : activeCategory ? (
                          <>
                            <p>No {activeCategory.name.toLowerCase()} listed in any city yet.</p>
                            <button
                              type="button"
                              onClick={() => {
                                setCategory(null);
                                close();
                              }}
                              className="mt-2 text-[var(--sw-primary)] font-semibold underline underline-offset-2"
                            >
                              Browse all categories instead
                            </button>
                          </>
                        ) : (
                          "No cities available yet."
                        )}
                      </div>
                    )}
                </OptionList>
              </>
            )}
          </SearchSegment>

          {/* ── When ── */}
          {fields.has("date") && (
            <SegmentReveal>
              <Divider />
                <SearchSegment
                  label="When"
                  value={dateLabel}
                  placeholder="Add dates"
                  icon={<CalendarDays className="w-3.5 h-3.5 text-gray-400 shrink-0" aria-hidden="true" />}
                  align="center"
                  panelClassName="w-[min(84vw,340px)] p-4 sm:p-5"
                  {...segmentProps("date")}
                >
                  {(close) => (
                    <>
                      <BookingCalendar
                        mode="range"
                        bookedDates={[]}
                        selectedRange={dateRange}
                        onRangeSelect={(start, end) => {
                          setDateRange({ start, end });
                          close();
                        }}
                      />
                      {dateRange && (
                        <button
                          type="button"
                          onClick={() => {
                            setDateRange(null);
                            close();
                          }}
                          className="mt-3 text-xs font-semibold text-gray-500 hover:text-[var(--sw-primary)] underline underline-offset-2"
                        >
                          Clear dates
                        </button>
                      )}
                    </>
                  )}
              </SearchSegment>
            </SegmentReveal>
          )}

          {/* ── Guests (Custom Count) ── */}
          {fields.has("guests") && (
            <SegmentReveal>
              <Divider />
                <SearchSegment
                  label="Guests"
                  value={guestDisplayLabel}
                  placeholder="Any size"
                  icon={<Users className="w-3.5 h-3.5 text-gray-400 shrink-0" aria-hidden="true" />}
                  align="end"
                  panelClassName="w-[min(92vw,360px)]"
                  {...segmentProps("guests")}
                >
                  {(close) => (
                    <StayGuestSelector
                      initialState={customGuests}
                      onApply={(state) => {
                        setCustomGuests(state);
                        setIsCustomApplied(true);
                        setGuests(state.adults + state.children);
                        close();
                      }}
                      onClear={
                        isCustomApplied
                          ? () => {
                              setIsCustomApplied(false);
                              setCustomGuests(DEFAULT_CUSTOM_GUEST_STATE);
                              setGuests(null);
                              close();
                            }
                          : undefined
                      }
                    />
                  )}
              </SearchSegment>
            </SegmentReveal>
          )}

          {/* ── Submit ── */}
          <div className="flex items-center gap-1 md:pl-2 pt-1 md:pt-0">
            {hasSelection && (
              <button
                type="button"
                onClick={reset}
                aria-label="Clear all search filters"
                className="flex items-center justify-center shrink-0 w-9 h-9 rounded-full text-gray-400 hover:text-[var(--sw-primary)] hover:bg-[rgba(238,116,41,0.08)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sw-primary)]"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            )}
            <button
              type="submit"
              aria-label={searchButtonLabel}
              disabled={navigating}
              className="w-full md:w-auto flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 disabled:opacity-70 text-white px-7 py-4 md:py-3.5 rounded-full font-bold transition-colors duration-300 h-[52px] whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2"
            >
              {navigating ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              ) : (
                <SearchIcon className="w-4 h-4 text-white" strokeWidth={3} />
              )}
              <span className="text-[15px]">{searchButtonLabel}</span>
            </button>
          </div>
        </div>

        {/*
          Live feedback under the bar. The count comes from the same query the
          results page runs, so "12 matches" means 12 cards — and a dead end is
          announced here, before the click, with a way out of it.
        */}
        <div aria-live="polite" className="min-h-[1.5rem] mt-2.5 flex justify-center">
          {!countLoading && matchCount === 0 && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs font-medium text-white/85 bg-black/30 backdrop-blur-sm rounded-full px-3.5 py-1.5"
            >
              {hasNarrowingFilters ? (
                <>
                  Nothing matches yet.{" "}
                  {city && (
                    <button
                      type="button"
                      onClick={() => {
                        setCity(null);
                        setCityQuery("");
                      }}
                      className="underline underline-offset-2 font-semibold hover:text-white"
                    >
                      Search all cities
                    </button>
                  )}
                  {city && (guests || dateRange) && <span className="mx-1.5 opacity-50">·</span>}
                  {(guests || dateRange) && (
                    <button
                      type="button"
                      onClick={() => {
                        setGuests(null);
                        setDateRange(null);
                      }}
                      className="underline underline-offset-2 font-semibold hover:text-white"
                    >
                      Clear {dateRange && guests ? "dates & guests" : dateRange ? "dates" : "guests"}
                    </button>
                  )}
                </>
              ) : (
                <>
                  No {categoryNoun(activeCategory)} listed yet.{" "}
                  <button
                    type="button"
                    onClick={() => setCategory(null)}
                    className="underline underline-offset-2 font-semibold hover:text-white"
                  >
                    Browse everything
                  </button>
                </>
              )}
            </motion.p>
          )}
        </div>
      </form>

      {/* Shortcuts to the categories couples actually start with. */}
      <div className="relative z-10 mt-4 flex flex-wrap items-center justify-center gap-2">
        <span className="text-xs font-medium text-white/60">Popular:</span>
        {["venues", "photography", "caterers", "decorators", "makeup", "planners"].map((slug) => {
          const item = categoryBySlug(slug);
          if (!item) return null;
          return (
            <button
              key={slug}
              type="button"
              onClick={() => {
                setCategory(slug);
                setOpen(null);
                setNavigating(true);
                router.push(buildSearchHref({ category: slug, city }));
              }}
              className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-white/85 bg-white/10 hover:bg-white/20 border border-white/15 backdrop-blur-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              {item.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Divider() {
  return <div className="hidden md:block w-px h-8 bg-gray-300/60 shrink-0" aria-hidden="true" />;
}

/**
 * Fades a whole segment (plus its divider) in when the chosen category gains
 * that field. Entry only — an exit animation would keep the segment mounted
 * while it fades, and Framer does not reliably finish it (see SearchSegment).
 */
function SegmentReveal({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="flex items-center w-full md:w-auto md:flex-1 min-w-0"
    >
      {children}
    </motion.div>
  );
}
