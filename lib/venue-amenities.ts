import type { Venue } from "./venues-data";

export interface AmenityGroup {
  /** Stable key — the detail page maps this to an icon. */
  key: string;
  label: string;
  items: string[];
}

/**
 * Booking.com groups a property's facilities under headed categories
 * ("Food & drink", "Parking", "Accessibility", …). Our vendors type facilities
 * in as one free-text, comma-separated list, so the grouping has to be inferred
 * here from the wording.
 *
 * Order is significant: the first category whose keywords match wins, so the
 * specific categories are listed before the catch-all ones ("Bridal Suite" must
 * land in "Rooms & getting ready" rather than "Event spaces").
 *
 * Keywords are regex sources matched with a leading `\b`. Short tokens carry a
 * trailing `\b` of their own — a bare "ac" would otherwise match "terrace".
 */
const CATEGORIES: { key: string; label: string; keywords: string[] }[] = [
  {
    key: "accessibility",
    label: "Accessibility",
    keywords: ["wheelchair", "accessib", "ramp", "elevator", "lift\\b", "disabled", "braille", "step-free"],
  },
  {
    key: "safety",
    label: "Safety & security",
    keywords: [
      "security", "cctv", "guard", "fire", "first aid", "ambulance", "sanitiz", "sanitis",
      "extinguish", "generator", "power backup", "metal detector", "doctor", "insur",
    ],
  },
  {
    key: "parking",
    label: "Parking & transport",
    keywords: ["parking", "valet", "shuttle", "airport", "transfer", "transport", "chauffeur", "helipad"],
  },
  {
    key: "catering",
    label: "Food & drink",
    keywords: [
      "catering", "cuisine", "menu", "kitchen", "bar\\b", "alcohol", "liquor", "buffet", "cake",
      "mocktail", "cocktail", "chef", "veg\\b", "non-veg", "tasting", "bakery", "food",
      "beverage", "dining", "restaurant", "coffee", "welcome drink",
    ],
  },
  {
    key: "decor",
    label: "Décor, AV & production",
    keywords: [
      "decor", "décor", "floral", "flower", "lighting", "light", "av\\b", "a/v", "audio", "sound",
      "dj\\b", "projector", "screen", "led\\b", "sparkler", "firework", "pyro", "drape",
      "furniture", "stage", "mandap", "photo booth",
    ],
  },
  {
    key: "stay",
    label: "Rooms & getting ready",
    keywords: [
      "room", "suite", "bridal", "groom", "cottage", "villa", "changing", "dressing",
      "accommodat", "honeymoon",
    ],
  },
  {
    key: "spaces",
    label: "Event spaces & outdoors",
    keywords: [
      "hall", "banquet", "lawn", "garden", "terrace", "rooftop", "poolside", "ballroom",
      "marquee", "pavilion", "courtyard", "beach", "amphitheat", "open air", "open-air",
      "outdoor", "indoor", "view",
    ],
  },
  {
    key: "services",
    label: "Services & staff",
    keywords: [
      "concierge", "planner", "coordinator", "staff", "host", "butler", "housekeep", "wi-fi",
      "wifi", "internet", "front desk", "reception", "luggage", "laundry", "service", "assist",
      "24-hour", "24 hour",
    ],
  },
  {
    key: "wellness",
    label: "Wellness & leisure",
    keywords: [
      "pool", "spa\\b", "gym", "fitness", "sauna", "jacuzzi", "salon", "makeup", "make-up",
      "mehendi", "mehndi", "games", "kids", "children", "play",
    ],
  },
];

const GENERAL = { key: "general", label: "General", items: [] as string[] };

function categoryFor(feature: string): string {
  for (const cat of CATEGORIES) {
    if (cat.keywords.some((kw) => new RegExp(`\\b${kw}`, "i").test(feature))) {
      return cat.key;
    }
  }
  return GENERAL.key;
}

/**
 * The facilities implied by the venue's structured flags. Booking.com lists
 * these alongside the free-text ones, so they are folded into the same groups
 * rather than shown separately.
 */
function derivedFacilities(venue: Venue): { key: string; label: string }[] {
  const derived: { key: string; label: string }[] = [];
  if (venue.indoor) derived.push({ key: "spaces", label: "Indoor banquet hall" });
  if (venue.outdoor) derived.push({ key: "spaces", label: "Outdoor lawn / garden" });
  if (venue.catering) derived.push({ key: "catering", label: "In-house catering" });
  if (venue.parking) derived.push({ key: "parking", label: "On-site parking" });
  if (Number(venue.rooms) > 0) {
    derived.push({ key: "stay", label: `${venue.rooms} guest rooms on site` });
  }
  return derived;
}

/** Case-insensitive de-duplication that keeps the first spelling seen. */
function pushUnique(items: string[], value: string) {
  const seen = items.some((i) => i.toLowerCase() === value.toLowerCase());
  if (!seen) items.push(value);
}

/**
 * Sorts a venue's facilities into Booking.com-style categories. Empty
 * categories are dropped, and "General" is always sorted last.
 */
export function groupAmenities(venue: Venue): AmenityGroup[] {
  const buckets = new Map<string, AmenityGroup>();
  const order = [...CATEGORIES.map((c) => c.key), GENERAL.key];
  const labels = new Map(
    [...CATEGORIES, GENERAL].map((c) => [c.key, c.label] as [string, string])
  );

  const add = (key: string, item: string) => {
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { key, label: labels.get(key) ?? GENERAL.label, items: [] };
      buckets.set(key, bucket);
    }
    pushUnique(bucket.items, item);
  };

  for (const { key, label } of derivedFacilities(venue)) add(key, label);
  for (const feature of venue.features ?? []) {
    const trimmed = feature.trim();
    if (trimmed) add(categoryFor(trimmed), trimmed);
  }

  return order.map((key) => buckets.get(key)).filter((g): g is AmenityGroup => Boolean(g));
}

/**
 * The order the highlight strip should draw from. CATEGORIES is ordered for
 * match specificity ("Accessibility" first so "Wheelchair Accessible" can't be
 * swallowed by a broader category), which is the wrong order to *advertise* in
 * — a strip that opens with "CCTV Security" reads as a warning, not a draw.
 */
const POPULAR_ORDER = [
  "catering", "spaces", "stay", "parking", "decor",
  "services", "wellness", "safety", "accessibility", "general",
];

/**
 * The short highlight strip Booking.com calls "Most popular facilities" — one
 * facility drawn from each group, so the strip reads as a summary of the whole
 * list rather than the first few items of one category.
 */
export function popularAmenities(venue: Venue, limit = 8): AmenityGroup["items"] {
  const groups = [...groupAmenities(venue)].sort(
    (a, b) => POPULAR_ORDER.indexOf(a.key) - POPULAR_ORDER.indexOf(b.key)
  );
  const picked: string[] = [];

  // Round-robin across groups until we run out of facilities or hit the limit.
  for (let depth = 0; picked.length < limit; depth++) {
    const before = picked.length;
    for (const group of groups) {
      if (picked.length >= limit) break;
      const item = group.items[depth];
      if (item) pushUnique(picked, item);
    }
    if (picked.length === before) break;
  }

  return picked;
}

/** Total facility count, for the "Show all N facilities" affordance. */
export function amenityCount(venue: Venue): number {
  return groupAmenities(venue).reduce((sum, g) => sum + g.items.length, 0);
}
