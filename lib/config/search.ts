import { VENDOR_CATEGORIES, type VendorCategory } from "./categories";

// ─────────────────────────────────────────────────────────────────────────────
// SEARCH INTENT MODEL
//
// SoulsWed is not one marketplace — it is four, sharing a directory.
// `VENDOR_CATEGORIES[].features` already declares which one a category belongs
// to, so we derive the search behaviour from it instead of maintaining a second
// hand-written list that can drift:
//
//   "Ecommerce …"    → shop        — you buy a product; dates & headcount are noise
//   "Appointments …" → appointment — you book a fitting; headcount is noise
//   everything else  → booking     — you reserve a provider for an event date
//
// The hero search bar reads this and shows only the fields the category can
// actually be filtered by.
// ─────────────────────────────────────────────────────────────────────────────

export type CommerceModel = "booking" | "appointment" | "shop";
export type SearchField = "city" | "date" | "guests" | "budget";

/**
 * Categories whose price and suitability are driven by headcount. Asking a
 * mehndi artist for a guest count is noise; asking a caterer is the whole
 * question.
 */
const GUEST_SENSITIVE = new Set([
  "venues",
  "rooms",
  "caterers",
  "planners",
  "decorators",
  "cakes",
  "transport",
  "airlines",
]);

export function commerceModel(category: VendorCategory): CommerceModel {
  const features = category.features ?? "";
  if (/ecommerce/i.test(features)) return "shop";
  if (/appointment/i.test(features)) return "appointment";
  return "booking";
}

export function searchFields(category: VendorCategory | null): SearchField[] {
  // No category chosen yet — offer the broadest useful set.
  if (!category) return ["city", "date", "guests", "budget"];

  const model = commerceModel(category);
  if (model === "shop") return ["city", "budget"];

  const fields: SearchField[] = ["city", "date"];
  if (GUEST_SENSITIVE.has(category.slug)) fields.push("guests");
  fields.push("budget");
  return fields;
}

/**
 * The hero bar is an intent capture, not a filter panel. Budget is a
 * results-page control on every serious marketplace — putting it in the hero
 * would push the bar to five segments and crowd the fields that actually
 * change *what* you are searching for. `buildSearchHref` still carries
 * `budget` so the directory filter bar can set it.
 */
export function heroSearchFields(category: VendorCategory | null): SearchField[] {
  return searchFields(category).filter((f) => f !== "budget");
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUPED CATEGORY PICKER
//
// 39 categories in one scrolling column is a wall. Grouping them by what the
// couple is actually shopping for makes the list scannable in one pass.
// Every slug in VENDOR_CATEGORIES appears exactly once; `UNGROUPED_CATEGORIES`
// below catches any category added later that nobody filed into a group.
// ─────────────────────────────────────────────────────────────────────────────

export interface CategoryGroup {
  label: string;
  slugs: string[];
}

export const CATEGORY_GROUPS: CategoryGroup[] = [
  { label: "Venue & Stay",       slugs: ["venues", "rooms"] },
  { label: "Planning",           slugs: ["planners", "personal-shoppers", "detectives"] },
  { label: "Food & Cake",        slugs: ["caterers", "cakes"] },
  { label: "Decor & Flowers",    slugs: ["decorators", "florists", "entrance-specialists", "laser-shows"] },
  { label: "Photo & Film",       slugs: ["photography"] },
  { label: "Entertainment",      slugs: ["music", "dj", "choreography"] },
  { label: "Beauty & Grooming",  slugs: ["makeup", "hair", "mehndi", "spa", "skin-specialists", "cosmetic-dentist", "image-consulting"] },
  { label: "Fashion & Jewellery",slugs: ["fashion-designers", "bridal-wear", "groom-wear", "jewellers"] },
  { label: "Rituals",            slugs: ["priests", "astrologers"] },
  { label: "Invites & Gifting",  slugs: ["invitations", "gifts", "wedding-accessories", "packaging"] },
  { label: "Health & Wellbeing", slugs: ["gyms", "dieticians", "counsellors", "sexologists"] },
  { label: "Travel & Logistics", slugs: ["airlines", "transport", "travel"] },
];

const BY_SLUG = new Map(VENDOR_CATEGORIES.map((c) => [c.slug, c]));

export function categoryBySlug(slug: string | null | undefined): VendorCategory | null {
  if (!slug) return null;
  return BY_SLUG.get(slug) ?? null;
}

/**
 * A short lowercase noun for inline copy. Several category names are compound
 * ("Venues / Banquet halls", "Photographers & Videographers") and read badly
 * inside a button or a sentence, so only the leading term is kept.
 */
export function categoryNoun(category: VendorCategory | null): string {
  if (!category) return "listings";
  return category.name.split(/\s*[/&]\s*/)[0].trim().toLowerCase();
}

/** Categories that exist but were never filed into a group — surfaced, not dropped. */
const GROUPED_SLUGS = new Set(CATEGORY_GROUPS.flatMap((g) => g.slugs));
export const UNGROUPED_CATEGORIES = VENDOR_CATEGORIES.filter((c) => !GROUPED_SLUGS.has(c.slug));

/** The grouped list, resolved to full category objects and skipping unknown slugs. */
export const RESOLVED_CATEGORY_GROUPS: { label: string; items: VendorCategory[] }[] = [
  ...CATEGORY_GROUPS.map((g) => ({
    label: g.label,
    items: g.slugs.map((s) => BY_SLUG.get(s)).filter((c): c is VendorCategory => Boolean(c)),
  })),
  ...(UNGROUPED_CATEGORIES.length ? [{ label: "More", items: UNGROUPED_CATEGORIES }] : []),
].filter((g) => g.items.length > 0);

// ─────────────────────────────────────────────────────────────────────────────
// GUEST BANDS
//
// Emitted to the URL as a single integer so the server can run a real
// `minGuests <= guests <= maxGuests` query. The label is display-only.
// ─────────────────────────────────────────────────────────────────────────────

export interface GuestBand {
  label: string;
  /**
   * The band's **upper** bound, sent to the server as `?guests=`. Filtering on
   * the top of the range is the conservative reading: a couple expecting
   * "250 – 500" needs a provider that can actually handle 500.
   */
  value: number;
}

export const GUEST_BANDS: GuestBand[] = [
  { label: "Up to 50",    value: 50 },
  { label: "50 – 100",    value: 100 },
  { label: "100 – 250",   value: 250 },
  { label: "250 – 500",   value: 500 },
  { label: "500 – 1,000", value: 1000 },
  { label: "1,000+",      value: 2000 },
];

export function guestBandLabel(value: number | null): string | null {
  if (value == null) return null;
  return GUEST_BANDS.find((b) => b.value === value)?.label ?? `${value.toLocaleString("en-IN")} guests`;
}

// ─────────────────────────────────────────────────────────────────────────────
// BUDGET BANDS (INR, upper bound on `priceFrom`)
// ─────────────────────────────────────────────────────────────────────────────

export interface BudgetBand {
  label: string;
  value: number;
}

export const BUDGET_BANDS: BudgetBand[] = [
  { label: "Under ₹50,000",   value: 50_000 },
  { label: "Under ₹1 lakh",   value: 100_000 },
  { label: "Under ₹3 lakh",   value: 300_000 },
  { label: "Under ₹5 lakh",   value: 500_000 },
  { label: "Under ₹10 lakh",  value: 1_000_000 },
  { label: "₹10 lakh+",       value: 100_000_000 },
];

export function budgetBandLabel(value: number | null): string | null {
  if (value == null) return null;
  return BUDGET_BANDS.find((b) => b.value === value)?.label ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// URL CONTRACT
//
// One place that decides where a search goes and what it carries, so the hero
// bar, the directory filter bar, and any future entry point cannot disagree.
// Documented in docs/hero-search-analysis.md §8.
// ─────────────────────────────────────────────────────────────────────────────

export interface SearchQuery {
  category?: string | null;
  city?: string | null;
  guests?: number | null;
  budget?: number | null;
  start?: string | null;
  end?: string | null;
  q?: string | null;
}

/**
 * `/venues` is a dedicated static route with its own map/list UI, so venue
 * searches go there. Everything else resolves through `app/(public)/[category]`,
 * which handles every slug in VENDOR_CATEGORIES. With no category at all we
 * fall back to the combined directory.
 */
export function searchPath(category?: string | null): string {
  if (!category) return "/vendors";
  if (category === "venues") return "/venues";
  return `/${category}`;
}

export function buildSearchHref(query: SearchQuery): string {
  const category = query.category?.trim() || null;
  const fields = new Set(searchFields(categoryBySlug(category)));
  const params = new URLSearchParams();

  const city = query.city?.trim();
  if (city && fields.has("city")) params.set("city", city);

  const q = query.q?.trim();
  if (q) params.set("q", q);

  if (fields.has("guests") && query.guests) params.set("guests", String(query.guests));
  if (fields.has("budget") && query.budget) params.set("budget", String(query.budget));

  if (fields.has("date") && query.start) {
    params.set("start", query.start);
    // A single-day event still needs a closed range for the overlap query.
    params.set("end", query.end || query.start);
  }

  const qs = params.toString();
  return qs ? `${searchPath(category)}?${qs}` : searchPath(category);
}

/** The inverse of `parseSearchParams` — rebuilds the query string from a query. */
export function toSearchParams(query: SearchQuery): URLSearchParams {
  const params = new URLSearchParams();
  if (query.city) params.set("city", query.city);
  if (query.q) params.set("q", query.q);
  if (query.guests) params.set("guests", String(query.guests));
  if (query.budget) params.set("budget", String(query.budget));
  if (query.start) {
    params.set("start", query.start);
    params.set("end", query.end || query.start);
  }
  return params;
}

/** Parses the URL contract back out — used by the pages that render results. */
export function parseSearchParams(sp: URLSearchParams | Record<string, string | string[] | undefined>): SearchQuery {
  const get = (key: string): string | null => {
    if (sp instanceof URLSearchParams) return sp.get(key);
    const v = sp[key];
    return Array.isArray(v) ? v[0] ?? null : v ?? null;
  };

  const toInt = (v: string | null): number | null => {
    if (!v) return null;
    const n = Number.parseInt(v, 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  };

  const isDate = (v: string | null): string | null =>
    v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;

  return {
    city:   get("city"),
    q:      get("q"),
    guests: toInt(get("guests")),
    budget: toInt(get("budget")),
    start:  isDate(get("start")),
    end:    isDate(get("end")),
  };
}
