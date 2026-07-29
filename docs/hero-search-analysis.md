# Hero Search Section — Analysis & Redesign Brief

**Date:** 2026-07-28
**Scope:** `components/home/HeroSection.tsx` (search bar, lines 184–534) and everything it routes into.
**Status:** Analysis complete → redesign shipped (see §10).

---

## 1. What exists today

A four-segment Airbnb-style pill: **Destination → Dates → Guests → Category → Search**.

- Each segment is a `div` with an `onClick` toggling a single `openDropdown` state.
- A shared `motion.div` with `layoutId="search-bar-section-pill"` slides the hover highlight between segments.
- Dropdowns are `AnimatePresence` popovers; click-outside closes them via a `mousedown` listener on `searchRef`.
- Behind it, four MP4s cross-fade on a 6-second interval.

The visual craft is genuinely good. The problem is that **the search does not work.**

---

## 2. Critical defects

### 2.1 ~85% of category selections lead to a 404

```js
const path = category ? `/${category}` : "/vendors";
router.push(`${path}?${params.toString()}`);
```

The dropdown renders all **39** entries from `VENDOR_CATEGORIES`. `/${slug}` resolves through
`app/(public)/[category]/page.tsx`, whose `categoryMap` knows only 8 keys. There is no middleware
rewrite. Non-mapped slugs fall through to the ObjectId branch, fail `mongoose.Types.ObjectId.isValid()`,
and hit `notFound()`.

| Outcome | Slugs |
| --- | --- |
| Works | `venues` (static route), `rooms`, `planners`, `caterers`, `decorators`, `photography` |
| **404** | the other **33** — `makeup`, `dj`, `jewellers`, `florists`, `music`, `travel`, `spa`, `gifts`, `cakes`, `priests`, … |

The homepage's primary CTA is a broken-link generator.

### 2.2 Three of the four inputs are silently discarded

`handleSearch` builds `city`, `guests`, `start`, `end`. What actually consumes them:

| Param | Consumer | Result |
| --- | --- | --- |
| `city` | `PublicVendorDirectory.tsx:92` → `activeCities` | Works on `/[category]` and `/vendors`. **Ignored on `/venues`**, which has no `useSearchParams` at all. |
| `guests` | *nothing* | Dropped everywhere. |
| `start` / `end` | *nothing* | Dropped everywhere. |

A user selecting "Mumbai / Dec 12–14 / 250–500 / Venues" lands on an unfiltered venue list.

`guests` is also pushed as the raw display string (`"250 - 500"`) rather than a number — unusable as a
filter even once something reads it.

### 2.3 The destination list is wrong for the product

```js
const destinations = ["Paris", "New York", "London", "Tokyo", "Dubai", "Rome",
                      "Bali", "Mumbai", "Jaipur", "Goa", "Udaipur", "Sydney", "Istanbul"];
```

Nine of thirteen are non-Indian, for a platform positioned as India's premium wedding marketplace.
City filtering is `v.city.toLowerCase().includes(city)`, so Paris/Tokyo/Sydney guarantee zero results.
The list is hardcoded rather than derived from actual `city` values in `Venue` / `ServiceListing`, and
there is no free-text input — a user in Chennai or Hyderabad cannot search at all.

### 2.4 The field set is wrong for a multi-category marketplace

`VENDOR_CATEGORIES[].features` already declares four distinct commercial models:

| Model | Categories | Dates? | Guests? |
| --- | --- | --- | --- |
| Booking + calendar + payment | venues, caterers, photography, dj, … | yes | capacity-bound ones only |
| Appointments with calendar | fashion designers, bridal wear, groom wear | yes | no |
| Appointments + payment | packaging | yes | no |
| Ecommerce | accessories, jewellers, invitations, gifts | **no** | **no** |

A fixed *Destination / Dates / Guests / Category* bar asks a user shopping for **jewellery** how many
wedding guests they expect and what date range they need it for. The bar must adapt to the intent.

---

## 3. Performance

```
8.1 MB  98d54592….mp4   (initial)
8.9 MB  dd38fc38….mp4
6.0 MB  6443f745….mp4
4.4 MB  6fd82494….mp4
─────────
27.4 MB total
```

All four are `autoPlay muted loop` with **no `poster`, no `preload` hint, no `<source>` fallback**
(no WebM/H.265). The 6-second rotation pulls the full 27 MB within 24 seconds of page load. Measured
against `AGENTS.md` §4, this is the single largest regression on the site.

There is also no `prefers-reduced-motion` guard on either the video rotation or the Framer Motion
entrance animations.

---

## 4. Accessibility

Every segment is a `div` with `onClick` — no `role`, `tabIndex`, `aria-expanded`, `aria-haspopup`, or
key handler.

- The **entire search bar is unreachable by keyboard.** Only the Search button takes focus, and
  activating it submits an empty query.
- Dropdown options are real `<button>`s, but there is no way to reach them.
- `<label>` elements have no `htmlFor` and no associated control; they carry `pointer-events-none`.
- No <kbd>Esc</kbd> to close, no focus trap, no focus restoration on close.

This fails WCAG 2.1 AA at 2.1.1 (Keyboard), 4.1.2 (Name, Role, Value), and 1.3.1 (Info and Relationships).

---

## 5. Code-quality notes

- **Six unused imports** — `Image`, `Calendar`, `ChevronDownIcon`, `MapPinIcon`, `UsersIcon`, `LayersIcon`.
- **No validation** — searching with everything empty pushes `/vendors?`, a bare trailing `?`.
- **`providerId="home-search"`** — a fabricated ID passed to a provider-scoped `BookingCalendar`.
- **~80 duplicated lines per segment**; the four segments differ only in label, value, and options.
- **`style={{ transform: 'none' }}`** on the Search button — leftover override.
- **Mobile** — at `<md` the bar stacks into four full-width rows; dropdowns remain absolutely
  positioned at `min-w-[240px]`, which overflows narrow viewports.

---

## 6. What the data model actually supports

Both `Venue` and `ServiceListing` already carry everything a real search needs:

| Capability | Field(s) | Available on |
| --- | --- | --- |
| Location | `city`, `country`, `location` | both |
| Category | `category` | `ServiceListing` (implicit "Venues" for `Venue`) |
| Capacity | `minGuests`, `maxGuests` | both |
| Budget | `priceFrom` / `price`, `priceUnit`, `pricePerPlateVeg` | both |
| Quality | `rating`, `reviewCount`, `verified`, `featured` | both |
| Amenities | `rooms`, `outdoor`, `indoor`, `parking`, `catering` | both |
| Date availability | `Booking.eventDates` / `eventDate` / `checkIn` / `checkOut`, `status ∈ {pending, confirmed}` | via `providerId` |

`/api/venues` and `/api/services` already accept `city`, `country`, `search`, `category`, `featured`,
`verified`. **Nothing about the redesign requires a schema change.** Guest-capacity and
date-availability filtering are the only genuinely new query work.

---

## 7. Redesign principles

1. **Intent first.** The user picks *what they are looking for*; the bar reveals only the fields that
   category can actually filter on. Jewellery gets city + budget. Venues get city + date + guests + budget.
2. **Every field must reach a filter.** No parameter is emitted unless a target page reads it.
3. **No dead routes.** The category list is derived from categories that resolve, and every slug in
   `VENDOR_CATEGORIES` gets a working page.
4. **Real data.** Cities and suggestions come from the database, not a hardcoded array.
5. **Keyboard-complete.** WAI-ARIA combobox pattern: arrow keys, Enter, Escape, focus return.
6. **Fast.** Poster-first video, lazy secondary clips, `prefers-reduced-motion` respected.
7. **One segment component.** Four instances of a shared, typed `SearchSegment`.

---

## 8. Target URL contract

```
/{categorySlug}?city=&guests=&start=&end=&budget=&q=
```

| Param | Type | Meaning |
| --- | --- | --- |
| `city` | string | Matched case-insensitively against `city` |
| `guests` | integer | Matched against `minGuests ≤ guests ≤ maxGuests` |
| `start`, `end` | `YYYY-MM-DD` | Excludes providers with a confirmed/pending booking overlapping the range |
| `budget` | integer | Upper bound on `priceFrom` |
| `q` | string | Free-text relevance search over name / city / description |

Read by `PublicVendorDirectory`, `/[category]`, `/vendors`, and `/venues`.

---

## 9. Work plan

| # | Item | Files |
| --- | --- | --- |
| 1 | Search intent config — per-category fields, booking model, route resolution | `lib/config/search.ts` |
| 2 | Typeahead API — cities + listing names + categories from DB | `app/api/search/suggest/route.ts` |
| 3 | Accessible `SearchSegment` (combobox pattern) | `components/search/SearchSegment.tsx` |
| 4 | Adaptive `HeroSearch` bar | `components/search/HeroSearch.tsx` |
| 5 | Slim `HeroSection` — poster-first video, reduced-motion guard | `components/home/HeroSection.tsx` |
| 6 | Route every category slug; consume searchParams | `app/(public)/[category]/page.tsx` |
| 7 | Honour `city` / `guests` / `budget` / `q` in the directory | `components/vendors/PublicVendorDirectory.tsx` |
| 8 | Honour the same params on `/venues` | `app/(public)/venues/page.tsx` |

---

## 10. What shipped

All nine work items above were built. Verified against the running app and live data:

| Check | Before | After |
| --- | --- | --- |
| Category routes returning 200 | 6 of 39 | **39 of 39** |
| Inputs that reach a filter | 1 of 4 (`city`, and not on `/venues`) | **4 of 4**, on every results route |
| Hero bytes before first paint | 8.1 MB video | **~100 KB poster** (294 KB for all four) |
| Worst-case hero download | 27.4 MB (all four clips) | **one clip**, or zero on reduced-motion / Save-Data / 2G-3G |
| Keyboard reachable | Search button only | **every segment and option** |
| Segments with an accessible name | 0 | **4** |
| Feedback before you click | none | **live count on the button**, matched to the results page |

New modules:

- `lib/config/search.ts` — commerce model, per-category fields, grouped picker, URL contract
- `lib/search/filters.ts` — URL → Mongo fragments, plus date-availability exclusion
- `lib/search/query.ts` — the one `findListings` used by `/[category]`, `/vendors` and the count API
- `lib/search/mappers.ts` — one document→card mapping, replacing three that had drifted
- `app/api/search/suggest/route.ts` — database-backed typeahead, scoped to the chosen category
- `app/api/search/count/route.ts` — live match count for the hero button
- `components/search/SearchSegment.tsx` — accessible segment primitive
- `components/search/HeroSearch.tsx` — the adaptive bar
- `components/home/HeroBackdrop.tsx` — poster-first hero media

Defects surfaced during verification and fixed:

1. `AnimatePresence` never completed the dropdown exit — an invisible, focusable panel
   stayed mounted at `opacity: 0`, and the adaptive segments never disappeared.
2. The popover background at 0.85 alpha was unreadable over the hero photography.
3. **`/venues?city=…` rendered nothing.** Making it a client page that reads
   `useSearchParams` meant the hook suspended on a prerendered route and the Suspense
   fallback never resolved — a spinner and no content. It is now a server shell that
   passes the parsed query down as a prop, and the route is dynamic.

Known gaps are recorded under "Outstanding" in Session 11 of
[`docs/work-log.md`](work-log.md) — chiefly that capacity and budget filtering is
unproven against service listings, because no seeded listing sets `minGuests`/`maxGuests`.
