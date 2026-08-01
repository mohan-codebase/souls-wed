import { Building2, BedDouble, ClipboardList, UtensilsCrossed, Flower2, Camera, Plane, Scissors, Palette, Flower, Activity } from "lucide-react";
import { SparklesIcon } from "@/components/ui/sparkles";
import type { ComponentType } from "react";

export type CategoryIcon = ComponentType<{
  className?: string;
  size?: number;
  strokeWidth?: number | string;
}>;

export interface VendorCategory {
  name: string;
  tagline: string;
  slug: string;
  image: string;
  icon: CategoryIcon;
  features?: string;
}

export const VENDOR_CATEGORIES: VendorCategory[] = [
  {
    name: "Venues / Banquet halls",
    tagline: "Dreamy halls & destinations",
    slug: "venues",
    image: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800&q=80",
    icon: Building2,
    features: "Booking feature with calendar and payment"
  },
  {
    name: "Wedding Planners",
    tagline: "Experts who handle it all",
    slug: "planners",
    image: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&q=80",
    icon: ClipboardList,
    features: "Booking feature with calendar and payment"
  },
  {
    name: "Caterers",
    tagline: "Cuisines that steal the show",
    slug: "caterers",
    image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80",
    icon: UtensilsCrossed,
    features: "Booking feature with calendar and payment"
  },
  {
    name: "Decorators",
    tagline: "Bring your vision to life",
    slug: "decorators",
    image: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=800&q=80",
    icon: Flower2,
    features: "Booking feature with calendar and payment"
  },
  {
    name: "Photographers & Videographers",
    tagline: "Capture timeless moments",
    slug: "photography",
    image: "https://images.unsplash.com/photo-1537633552985-df8429e8048b?w=800&q=80",
    icon: Camera,
    features: "Booking feature with calendar and payment"
  },
  {
    name: "Rooms",
    tagline: "Luxury stays for your guests",
    slug: "rooms",
    image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80",
    icon: BedDouble,
    features: "Booking feature with calendar and payment"
  },
  {
    name: "Chartered Airlines",
    tagline: "Arrive in ultimate style",
    slug: "airlines",
    image: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&q=80",
    icon: Plane,
    features: "Booking feature with calendar and payment"
  },
  {
    name: "Makeup Artists",
    tagline: "Flawless bridal beauty",
    slug: "makeup",
    image: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=800&q=80",
    icon: SparklesIcon,
    features: "Booking feature with calendar and payment"
  },
  {
    name: "Hairstylists",
    tagline: "Elegant styles for your day",
    slug: "hair",
    image: "https://images.unsplash.com/photo-1560869713-7d0a29430803?w=800&q=80",
    icon: Scissors,
    features: "Booking feature with calendar and payment"
  },
  {
    name: "Mehndi Artists",
    tagline: "Intricate bridal henna",
    slug: "mehndi",
    image: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&q=80",
    icon: Palette,
    features: "Booking feature with calendar and payment"
  },
  {
    name: "Florists",
    tagline: "Breathtaking floral designs",
    slug: "florists",
    image: "https://images.unsplash.com/photo-1526047932273-341f2a7631f9?w=800&q=80",
    icon: Flower,
    features: "Booking feature with calendar and payment"
  },
  {
    name: "Choreographers",
    tagline: "Dance your heart out",
    slug: "choreography",
    image: "https://images.unsplash.com/photo-1547153760-18fc86324498?w=800&q=80",
    icon: Activity,
    features: "Booking feature with calendar and payment"
  }
];

