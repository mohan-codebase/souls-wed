import {
  Accessibility,
  BedDouble,
  Building2,
  Car,
  ConciergeBell,
  Info,
  Lightbulb,
  ShieldCheck,
  TreePine,
  UtensilsCrossed,
  Waves,
  Wifi,
  type LucideIcon,
} from "lucide-react";

/** Icon per facility category — keys match `groupAmenities()` in lib/venue-amenities. */
export const GROUP_ICONS: Record<string, LucideIcon> = {
  spaces: TreePine,
  catering: UtensilsCrossed,
  decor: Lightbulb,
  stay: BedDouble,
  parking: Car,
  services: ConciergeBell,
  wellness: Waves,
  safety: ShieldCheck,
  accessibility: Accessibility,
  general: Info,
};

/**
 * Per-facility icons for the "Most popular facilities" strip, where Booking.com
 * shows an icon beside each individual item rather than one per category.
 */
const ITEM_ICONS: [RegExp, LucideIcon][] = [
  [/\bwi-?fi|\binternet/i, Wifi],
  [/\bparking|\bvalet|\bshuttle|\btransport/i, Car],
  [/\bcatering|\bfood|\bmenu|\bbar\b|\bkitchen|\bdining|\bcuisine/i, UtensilsCrossed],
  [/\broom|\bsuite|\bbridal|\bdressing|\bchanging/i, BedDouble],
  [/\blawn|\bgarden|\boutdoor|\bterrace|\bcourtyard|\bview/i, TreePine],
  [/\bindoor|\bhall|\bbanquet|\bballroom/i, Building2],
  [/\bav\b|\blighting|\bsound|\baudio|\bdecor|\bstage/i, Lightbulb],
  [/\bpool|\bspa\b|\bgym|\bsalon/i, Waves],
  [/\bsecurity|\bcctv|\bfire|\bguard|\bgenerator/i, ShieldCheck],
  [/\bwheelchair|\baccessib|\bramp|\blift\b/i, Accessibility],
  [/\bconcierge|\bstaff|\bservice|\bplanner/i, ConciergeBell],
];

export function iconForAmenity(label: string): LucideIcon {
  for (const [pattern, icon] of ITEM_ICONS) {
    if (pattern.test(label)) return icon;
  }
  return Info;
}
