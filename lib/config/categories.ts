import { Building2, BedDouble, ClipboardList, UtensilsCrossed, Flower2, Camera, Plane, Scissors, Palette, Flower, Activity, Mic, Headphones, Car, Map, Shirt, Crown, Briefcase, DoorOpen, ShoppingBag, BookOpen, Star, Zap, ShoppingCart, Package, Gem, Mail, Cake, Gift, Bath, Dumbbell, Droplet, Apple, Brain } from "lucide-react";
import { SparklesIcon } from "@/components/ui/sparkles";
import { SearchIcon } from "@/components/ui/search";
import { SmileIcon } from "@/components/ui/smile";
import { HeartIcon } from "@/components/ui/heart";
import { UserCheckIcon } from "@/components/ui/user-check";
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
  },
  {
    name: "Singers & Bands",
    tagline: "Soulful melodies & bands",
    slug: "music",
    image: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80",
    icon: Mic,
    features: "Booking feature with calendar and payment"
  },
  {
    name: "DJs",
    tagline: "Keep the dance floor alive",
    slug: "dj",
    image: "https://images.unsplash.com/photo-1516873240891-4bf014598ab4?w=800&q=80",
    icon: Headphones,
    features: "Booking feature with calendar and payment"
  },
  {
    name: "Logistics & Transport",
    tagline: "Seamless luxury logistics",
    slug: "transport",
    image: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&q=80",
    icon: Car,
    features: "Booking feature with calendar and payment"
  },
  {
    name: "Travel Agents",
    tagline: "Your honeymoon experts",
    slug: "travel",
    image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80",
    icon: Map,
    features: "Booking feature with calendar and payment"
  },
  {
    name: "Fashion Designers",
    tagline: "Bespoke designer wear",
    slug: "fashion-designers",
    image: "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=800&q=80",
    icon: Shirt,
    features: "Appointments with calendar"
  },
  {
    name: "Bridal Wear",
    tagline: "Stunning bridal outfits",
    slug: "bridal-wear",
    image: "https://images.unsplash.com/photo-1594552072238-b8a33785b261?w=800&q=80",
    icon: Crown,
    features: "Appointments with calendar"
  },
  {
    name: "Groom Wear",
    tagline: "Dapper groom collections",
    slug: "groom-wear",
    image: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&q=80",
    icon: Briefcase,
    features: "Appointments with calendar"
  },
  {
    name: "Detectives",
    tagline: "Background checks & security",
    slug: "detectives",
    image: "https://images.unsplash.com/photo-1453728013993-6d66e9c9123a?w=800&q=80",
    icon: SearchIcon,
    features: "Booking feature with calendar and payment"
  },
  {
    name: "Entrance Specialists",
    tagline: "Grand bridal entry",
    slug: "entrance-specialists",
    image: "https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80",
    icon: DoorOpen,
    features: "Booking feature with calendar and payment"
  },
  {
    name: "Personal Shoppers",
    tagline: "Curated wedding shopping",
    slug: "personal-shoppers",
    image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&q=80",
    icon: ShoppingBag,
    features: "Booking feature with calendar and payment"
  },
  {
    name: "Priests",
    tagline: "Traditional wedding rituals",
    slug: "priests",
    image: "https://images.unsplash.com/photo-1601121868898-4581104b29de?w=800&q=80",
    icon: BookOpen,
    features: "Booking feature with calendar and payment"
  },
  {
    name: "Astrologers",
    tagline: "Horoscope & matchmaking",
    slug: "astrologers",
    image: "https://images.unsplash.com/photo-1532968961962-8a0cb3a2d4f5?w=800&q=80",
    icon: Star,
    features: "Booking feature with calendar and payment"
  },
  {
    name: "Laser Shows",
    tagline: "Spectacular light shows",
    slug: "laser-shows",
    image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80",
    icon: Zap,
    features: "Booking feature with calendar and payment"
  },
  {
    name: "Wedding Accessories",
    tagline: "Essential wedding addons",
    slug: "wedding-accessories",
    image: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&q=80",
    icon: ShoppingCart,
    features: "Ecommerce features"
  },
  {
    name: "Packaging Vendors",
    tagline: "Custom wedding packaging",
    slug: "packaging",
    image: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=800&q=80",
    icon: Package,
    features: "Appointments with calendar and payment"
  },
  {
    name: "Jewellers",
    tagline: "Exquisite bridal jewelry",
    slug: "jewellers",
    image: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800&q=80",
    icon: Gem,
    features: "Ecommerce features with contact details"
  },
  {
    name: "Invitation Cards",
    tagline: "Beautiful wedding invites",
    slug: "invitations",
    image: "https://images.unsplash.com/photo-1510074377623-8cf13fb86c08?w=800&q=80",
    icon: Mail,
    features: "Ecommerce features with contact details"
  },
  {
    name: "Cake Specialists",
    tagline: "Delicious wedding cakes",
    slug: "cakes",
    image: "https://images.unsplash.com/photo-1535141192574-5d4897c12636?w=800&q=80",
    icon: Cake,
    features: "Booking feature with calendar and payment"
  },
  {
    name: "Gifts",
    tagline: "Thoughtful wedding favors",
    slug: "gifts",
    image: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=800&q=80",
    icon: Gift,
    features: "Ecommerce features with payment gateway"
  },
  {
    name: "Cosmetic Dentist",
    tagline: "Perfect your wedding smile",
    slug: "cosmetic-dentist",
    image: "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=800&q=80",
    icon: SmileIcon,
    features: "Booking feature with calendar and payment"
  },
  {
    name: "Spa Treatments",
    tagline: "Relax & rejuvenate",
    slug: "spa",
    image: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&q=80",
    icon: Bath,
    features: "Booking feature with calendar and payment"
  },
  {
    name: "Gyms",
    tagline: "Get fit for the big day",
    slug: "gyms",
    image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80",
    icon: Dumbbell,
    features: "Booking feature with calendar and payment"
  },
  {
    name: "Skin Specialists",
    tagline: "Glowing bridal skin",
    slug: "skin-specialists",
    image: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800&q=80",
    icon: Droplet,
    features: "Booking feature with calendar and payment"
  },
  {
    name: "Dieticians",
    tagline: "Healthy wedding diets",
    slug: "dieticians",
    image: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&q=80",
    icon: Apple,
    features: "Booking feature with calendar and payment"
  },
  {
    name: "Counsellors",
    tagline: "Pre-marital counseling",
    slug: "counsellors",
    image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&q=80",
    icon: Brain,
    features: "Booking feature with calendar and payment"
  },
  {
    name: "Sexologists",
    tagline: "Intimacy experts",
    slug: "sexologists",
    image: "https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=800&q=80",
    icon: HeartIcon,
    features: "Booking feature with calendar and payment"
  },
  {
    name: "Image Consulting",
    tagline: "Personal styling & grooming",
    slug: "image-consulting",
    image: "https://images.unsplash.com/photo-1485230895905-ec40ba36b9bc?w=800&q=80",
    icon: UserCheckIcon,
    features: "Booking feature with calendar and payment"
  }
];
