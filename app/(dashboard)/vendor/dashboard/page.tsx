"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Image from "@/components/shared/CustomImage";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, Loader2, LayoutDashboard, Inbox, ClipboardList, Camera, Brush, Utensils, Briefcase, BedDouble, Building2, Palette, Package, Star, Edit2, Save, Wand2, AlertCircle, Monitor, LogOut, Shield, BadgeCheck } from "lucide-react";
import { UserIcon } from "@/components/ui/user";
import { HomeIcon } from "@/components/ui/home";
import { ArrowLeftIcon } from "@/components/ui/arrow-left";
import { ArrowRightIcon } from "@/components/ui/arrow-right";
import { UploadIcon } from "@/components/ui/upload";
import { PlusIcon } from "@/components/ui/plus";
import { MapPinIcon } from "@/components/ui/map-pin";
import { SettingsIcon } from "@/components/ui/settings";
import { ChevronDownIcon } from "@/components/ui/chevron-down";
import { ChevronRightIcon } from "@/components/ui/chevron-right";
import { XIcon } from "@/components/ui/x";
import { UsersIcon } from "@/components/ui/users";
import { LockIcon } from "@/components/ui/lock";
import { EyeIcon } from "@/components/ui/eye";
import { EyeOffIcon } from "@/components/ui/eye-off";
import { IdCardIcon } from "@/components/ui/id-card";
import { MoonIcon } from "@/components/ui/moon";
import { SunIcon } from "@/components/ui/sun";
import { SlidersHorizontalIcon } from "@/components/ui/sliders-horizontal";
import { MessageSquareIcon } from "@/components/ui/message-square";
import { TrendingUpIcon } from "@/components/ui/trending-up";
import { SearchIcon } from "@/components/ui/search";
import BookingCard from "@/components/booking/BookingCard";
import { formatAsCurrency } from "@/lib/currency";
import ImageUploadInput from "@/components/shared/ImageUploadInput";
import MediaGalleryInput from "@/components/shared/MediaGalleryInput";
import PlanOfferModal from "@/components/plans/PlanOfferModal";
import ThemeToggle from "@/components/shared/ThemeToggle";
import ListingCard, { CardTag } from "@/components/shared/ListingCard";
import { useTheme } from "@/lib/ThemeContext";
import AvatarUploader from "@/components/shared/AvatarUploader";
import VendorAnalyticsChart from "@/components/vendors/VendorAnalyticsChart";
import { VENDOR_CATEGORIES } from "@/lib/config/categories";
import { PhoneInput } from "@/components/shared/PhoneInput";

interface VendorSession {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  businessName?: string;
  category: string;
  city: string;
  description?: string;
  website?: string;
  instagram?: string;
  priceFrom?: number | string;
  images?: string[];
  profileImage?: string;
  verified?: boolean;
  featured?: boolean;
  available?: boolean;
  unavailableDates?: string[];
}

type TabType = "overview" | "leads" | "earnings" | "settings" | "account-settings" | "services";

interface DashboardBooking {
  _id: string;
  status?: string;
  userName?: string;
  providerName?: string;
  venueName?: string;
  [key: string]: unknown;
}

interface VenueItem {
  _id: string;
  name: string;
  city: string;
  location?: string;
  country?: string;
  image?: string;
  gallery?: string[];
  rating?: number;
  reviewCount?: number;
  price?: string;
  priceUnit?: string;
  pricePerPlateVeg?: string;
  pricePerPlateNonVeg?: string;
  rentalCost?: string;
  featured?: boolean;
  verified?: boolean;
  active?: boolean;
  type?: string;
  venueId?: string;
  minGuests?: number;
  maxGuests?: number;
  rooms?: number;
  outdoor?: boolean;
  indoor?: boolean;
  parking?: boolean;
  catering?: boolean;
  description?: string;
  features?: string[];
  contactPhone?: string;
  mapLink?: string;
  heroImage?: string;
  videos?: string[];
}

interface ServiceItem {
  serviceId: string;
  category: string;
  name: string;
  city: string;
  location?: string;
  image?: string;
  gallery?: string[];
  rating?: number;
  reviewCount?: number;
  priceFrom?: number;
  priceUnit?: string;
  pricePerPlateVeg?: string;
  pricePerPlateNonVeg?: string;
  rentalCost?: string;
  minGuests?: number;
  maxGuests?: number;
  rooms?: number;
  outdoor?: boolean;
  indoor?: boolean;
  parking?: boolean;
  catering?: boolean;
  featured?: boolean;
  verified?: boolean;
  active?: boolean;
  description?: string;
  features?: string[];
  contactPhone?: string;
  mapLink?: string;
  heroImage?: string;
  videos?: string[];
}

interface VenueFormState {
  name: string;
  city: string;
  location: string;
  country: string;
  type: string;
  price: string;
  priceUnit: string;
  pricePerPlateVeg: string;
  pricePerPlateNonVeg: string;
  rentalCost: string;
  image: string;
  minGuests: string;
  maxGuests: string;
  rooms: string;
  outdoor: boolean;
  indoor: boolean;
  parking: boolean;
  catering: boolean;
  description: string;
  features: string;
  contactPhone: string;
  mapLink: string;
  heroImage: string;
  gallery: string[];
  videos: string[];
}

const defaultVenueForm: VenueFormState = {
  name: "", city: "", location: "", country: "India", type: "Banquet Hall",
  price: "", priceUnit: "per day", pricePerPlateVeg: "", pricePerPlateNonVeg: "",
  rentalCost: "", image: "", minGuests: "50", maxGuests: "500", rooms: "0",
  outdoor: false, indoor: true, parking: false, catering: false,
  description: "", features: "",
  contactPhone: "", mapLink: "", heroImage: "", gallery: [], videos: [],
};

interface ServiceFormState {
  category: string;
  name: string;
  city: string;
  location: string;
  priceFrom: string;
  priceUnit: string;
  pricePerPlateVeg: string;
  pricePerPlateNonVeg: string;
  rentalCost: string;
  minGuests: string;
  maxGuests: string;
  rooms: string;
  outdoor: boolean;
  indoor: boolean;
  parking: boolean;
  catering: boolean;
  image: string;
  description: string;
  features: string;
  contactPhone: string;
  mapLink: string;
  heroImage: string;
  gallery: string[];
  videos: string[];
}

const defaultServiceForm: ServiceFormState = {
  category: "planners", name: "", city: "", location: "",
  priceFrom: "", priceUnit: "per event", 
  pricePerPlateVeg: "", pricePerPlateNonVeg: "", rentalCost: "",
  minGuests: "50", maxGuests: "500", rooms: "0",
  outdoor: false, indoor: true, parking: false, catering: false,
  image: "", description: "", features: "",
  contactPhone: "", mapLink: "", heroImage: "", gallery: [], videos: [],
};

export default function VendorDashboard() {
  const router = useRouter();
  const [vendor, setVendor] = useState<VendorSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [available, setAvailable] = useState(true);
  const [bookings, setBookings] = useState<DashboardBooking[]>([]);
  const [views, setViews] = useState<{ viewedAt: string }[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [selectedCategory, setSelectedCategory] = useState("venues");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isDark: isDarkMode, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; type: 'venue' | 'service'; id: string; apiId?: string; name: string } | null>(null);
  const [isDeletingItem, setIsDeletingItem] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  // Offered once per session after a successful save, so it doesn't nag on every edit.
  const [showPlanOffer, setShowPlanOffer] = useState(false);
  const planOfferShownRef = useRef(false);
  const offerPlansAfterSave = useCallback(() => {
    if (planOfferShownRef.current) return;
    planOfferShownRef.current = true;
    setShowPlanOffer(true);
  }, []);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);
  const [servicesExpanded, setServicesExpanded] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState({ text: "", type: "" });

  const generateStrongPassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+";
    let pass = "";
    for (let i = 0; i < 16; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(pass);
    setShowPassword(true);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setPasswordMessage({ text: "New password must be at least 6 characters.", type: "error" });
      return;
    }
    setIsChangingPassword(true);
    setPasswordMessage({ text: "", type: "" });
    try {
      const res = await fetch("/api/auth/settings/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setPasswordMessage({ text: "Password changed successfully!", type: "success" });
        setCurrentPassword("");
        setNewPassword("");
      } else {
        setPasswordMessage({ text: data.message || "Failed to change password.", type: "error" });
      }
    } catch (err) {
      setPasswordMessage({ text: "An error occurred.", type: "error" });
    }
    setIsChangingPassword(false);
  };

  // Showcase gallery states
  const [showcaseImages, setShowcaseImages] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [unavailableDates, setUnavailableDates] = useState<string[]>([]);
  const [newUnavailableDate, setNewUnavailableDate] = useState("");
  const [savingUnavailableDates, setSavingUnavailableDates] = useState(false);
  const [unavailableDatesMessage, setUnavailableDatesMessage] = useState<string | null>(null);

  // Venues managed by this vendor account
  const [venues, setVenues] = useState<VenueItem[]>([]);

  // Venue management UI state
  const [venueLayout, setVenueLayout] = useState<"grid" | "list">("grid");
  const [venueView, setVenueView] = useState<"grid" | "add" | "edit">("grid");
  const [editingVenue, setEditingVenue] = useState<VenueItem | null>(null);
  const [venueForm, setVenueForm] = useState<VenueFormState>(defaultVenueForm);
  const [savingVenue, setSavingVenue] = useState(false);
  const [venueMessage, setVenueMessage] = useState<string | null>(null);

  // Services managed by this vendor account
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [serviceLayout, setServiceLayout] = useState<"grid" | "list">("grid");
  const [serviceView, setServiceView] = useState<"grid" | "add" | "edit">("grid");
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);
  const [serviceForm, setServiceForm] = useState<ServiceFormState>(defaultServiceForm);
  const [savingService, setSavingService] = useState(false);
  const [serviceMessage, setServiceMessage] = useState<string | null>(null);

  // Prevent concurrent auto-saves from stacking up
  const venueSaveInProgressRef = useRef(false);
  const serviceSaveInProgressRef = useRef(false);

  const fetchVenues = async (vendorId: string) => {
    try {
      const res = await fetch(`/api/venues?vendorId=${vendorId}`);
      if (res.ok) {
        const data = await res.json();
        setVenues(data.venues || []);
      }
    } catch (err) {
      console.error("Failed to fetch venues", err);
    }
  };

  // Auto-save logic
  useEffect(() => {
    if (venueView !== "edit" || !editingVenue) return;
    const timer = setTimeout(() => {
      handleSaveVenue(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, [venueForm, venueView, editingVenue]);

  useEffect(() => {
    if (serviceView !== "edit" || !editingService) return;
    const timer = setTimeout(() => {
      handleSaveService(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, [serviceForm, serviceView, editingService]);

  const fetchServices = async (vendorId: string) => {
    try {
      const res = await fetch(`/api/services?vendorId=${vendorId}`);
      if (res.ok) {
        const data = await res.json();
        setServices(data.services || []);
      }
    } catch (err) {
      console.error("Failed to fetch services", err);
    }
  };

  const openAddVenue = () => {
    setVenueForm(defaultVenueForm);
    setEditingVenue(null);
    setVenueMessage(null);
    setVenueView("add");
  };

  const openEditVenue = (v: VenueItem) => {
    setVenueForm({
      name: v.name || "",
      city: v.city || "",
      location: v.location || "",
      country: v.country || "India",
      type: v.type || "Banquet Hall",
      price: v.price || "",
      priceUnit: v.priceUnit || "per day",
      pricePerPlateVeg: v.pricePerPlateVeg || "",
      pricePerPlateNonVeg: v.pricePerPlateNonVeg || "",
      rentalCost: v.rentalCost || "",
      image: v.image || "",
      minGuests: String(v.minGuests ?? 50),
      maxGuests: String(v.maxGuests ?? 500),
      rooms: String(v.rooms ?? 0),
      outdoor: Boolean(v.outdoor),
      indoor: v.indoor !== false,
      parking: Boolean(v.parking),
      catering: Boolean(v.catering),
      description: v.description || "",
      features: Array.isArray(v.features) ? v.features.join(", ") : "",
      contactPhone: v.contactPhone || "",
      mapLink: v.mapLink || "",
      heroImage: v.heroImage || "",
      gallery: Array.isArray(v.gallery) ? v.gallery : [],
      videos: Array.isArray(v.videos) ? v.videos : [],
    });
    setEditingVenue(v);
    setVenueMessage(null);
    setVenueView("edit");
  };

  const handleSaveVenue = async (isAutoSave = false) => {
    if (!venueForm.name.trim() || !venueForm.city.trim()) {
      if (!isAutoSave) setVenueMessage("Venue name and city are required.");
      return;
    }
    // Prevent concurrent auto-saves from stacking
    if (isAutoSave && venueSaveInProgressRef.current) return;
    if (isAutoSave) venueSaveInProgressRef.current = true;

    if (!isAutoSave) setSavingVenue(true);
    if (!isAutoSave) setVenueMessage(null);
    try {
      const payload = {
        ...venueForm,
        minGuests: parseInt(venueForm.minGuests) || 50,
        maxGuests: parseInt(venueForm.maxGuests) || 500,
        rooms: parseInt(venueForm.rooms) || 0,
        features: venueForm.features.split(",").map(f => f.trim()).filter(Boolean),
        gallery: venueForm.gallery.map(u => u.trim()).filter(Boolean),
        videos: venueForm.videos.map(u => u.trim()).filter(Boolean),
      };
      if (venueView === "add") {
        if (isAutoSave) return; // Don't auto-save while creating a new venue until explicitly submitted
        const res = await fetch("/api/venues", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to create venue.");
        setVenueMessage("Venue submitted! Admin will review and activate it.");
        if (vendor?.id) await fetchVenues(vendor.id);
        setTimeout(() => setVenueView("grid"), 1800);
        offerPlansAfterSave();
      } else if (venueView === "edit" && editingVenue) {
        const res = await fetch("/api/venues", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ venueId: editingVenue.venueId, ...payload }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to update venue.");
        if (!isAutoSave) {
          setVenueMessage("Venue updated successfully!");
        }
        // Only fetch venues on user-initiated saves, not on auto-saves (expensive operation)
        if (!isAutoSave && vendor?.id) await fetchVenues(vendor.id);
        if (!isAutoSave) {
          setTimeout(() => setVenueView("grid"), 1200);
          offerPlansAfterSave();
        }
      }
    } catch (err) {
      if (!isAutoSave) {
        setVenueMessage(err instanceof Error ? err.message : "Something went wrong.");
      }
    } finally {
      if (!isAutoSave) setSavingVenue(false);
      if (isAutoSave) venueSaveInProgressRef.current = false;
    }
  };

  // --- SERVICE MANAGEMENT (Planners, Caterers, Decorators) ---
  const openAddService = (category: string) => {
    setServiceForm({ ...defaultServiceForm, category });
    setEditingService(null);
    setServiceMessage(null);
    setServiceView("add");
  };

  const openEditService = (s: ServiceItem) => {
    setServiceForm({
      category: s.category || "",
      name: s.name || "",
      city: s.city || "",
      location: s.location || "",
      priceFrom: String(s.priceFrom ?? ""),
      priceUnit: s.priceUnit || "per event",
      pricePerPlateVeg: s.pricePerPlateVeg || "",
      pricePerPlateNonVeg: s.pricePerPlateNonVeg || "",
      rentalCost: s.rentalCost || "",
      minGuests: String(s.minGuests ?? 50),
      maxGuests: String(s.maxGuests ?? 500),
      rooms: String(s.rooms ?? 0),
      outdoor: Boolean(s.outdoor),
      indoor: s.indoor !== false,
      parking: Boolean(s.parking),
      catering: Boolean(s.catering),
      image: s.image || "",
      description: s.description || "",
      features: Array.isArray(s.features) ? s.features.join(", ") : "",
      contactPhone: s.contactPhone || "",
      mapLink: s.mapLink || "",
      heroImage: s.heroImage || "",
      gallery: Array.isArray(s.gallery) ? s.gallery : [],
      videos: Array.isArray(s.videos) ? s.videos : [],
    });
    setEditingService(s);
    setServiceMessage(null);
    setServiceView("edit");
  };

  const handleSaveService = async (isAutoSave = false) => {
    if (!serviceForm.name.trim() || !serviceForm.city.trim()) {
      if (!isAutoSave) setServiceMessage("Name and city are required.");
      return;
    }
    // Prevent concurrent auto-saves from stacking
    if (isAutoSave && serviceSaveInProgressRef.current) return;
    if (isAutoSave) serviceSaveInProgressRef.current = true;

    if (!isAutoSave) setSavingService(true);
    if (!isAutoSave) setServiceMessage(null);
    try {
      const payload = {
        ...serviceForm,
        priceFrom: parseFloat(serviceForm.priceFrom) || 0,
        minGuests: parseInt(serviceForm.minGuests) || 50,
        maxGuests: parseInt(serviceForm.maxGuests) || 500,
        rooms: parseInt(serviceForm.rooms) || 0,
        features: serviceForm.features.split(",").map(f => f.trim()).filter(Boolean),
        gallery: serviceForm.gallery.map(u => u.trim()).filter(Boolean),
        videos: serviceForm.videos.map(u => u.trim()).filter(Boolean),
      };
      if (serviceView === "add") {
        if (isAutoSave) return;
        const res = await fetch("/api/services", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to create service.");
        setServiceMessage("Service submitted! Admin will review and activate it.");
        if (vendor?.id) await fetchServices(vendor.id);
        setTimeout(() => setServiceView("grid"), 1800);
        offerPlansAfterSave();
      } else if (serviceView === "edit" && editingService) {
        const res = await fetch("/api/services", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ serviceId: editingService.serviceId, ...payload }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to update service.");
        if (!isAutoSave) {
          setServiceMessage("Service updated successfully!");
        }
        // Only fetch services on user-initiated saves, not on auto-saves (expensive operation)
        if (!isAutoSave && vendor?.id) await fetchServices(vendor.id);
        if (!isAutoSave) {
          setTimeout(() => setServiceView("grid"), 1200);
          offerPlansAfterSave();
        }
      }
    } catch (err) {
      if (!isAutoSave) {
        setServiceMessage(err instanceof Error ? err.message : "Something went wrong.");
      }
    } finally {
      if (!isAutoSave) setSavingService(false);
      if (isAutoSave) serviceSaveInProgressRef.current = false;
    }
  };

  // "Active" excludes cancelled and completed bookings — a declined lead was
  // still being counted, so the header read "2 active leads" with one of them
  // cancelled.
  const activeBookings = bookings.filter(
    (b: any) => b.status !== "cancelled" && b.status !== "completed"
  );

  // ── Earnings (AUDIT-REPORT.md #11) ──
  // Admin had a full payout ledger; the partner portal had nothing, so a vendor
  // couldn't see what they'd earned or what commission was taken. Figures come
  // from /api/vendor/earnings, which shares lib/payouts.ts with the admin
  // ledger so the two can't disagree.
  const [earnings, setEarnings] = useState<any[]>([]);
  const [earningsStats, setEarningsStats] = useState<any>(null);
  const [earningsByListing, setEarningsByListing] = useState<any[]>([]);

  const fetchEarnings = async () => {
    try {
      const res = await fetch("/api/vendor/earnings");
      if (!res.ok) return;
      const data = await res.json();
      setEarnings(data.earnings || []);
      setEarningsStats(data.stats || null);
      setEarningsByListing(data.byListing || []);
    } catch (err) {
      console.error("Failed to fetch earnings", err);
    }
  };

  const fetchBookings = async () => {
    setLoadingData(true);
    try {
      const res = await fetch("/api/bookings");
      if (res.ok) {
        const data = await res.json();
        setBookings(data.bookings || []);
      }
      await fetchEarnings();
    } catch (err) {
      console.error("Failed to fetch bookings", err);
    } finally {
      setLoadingData(false);
    }
  };

  const fetchViews = async (vendorId: string) => {
    try {
      const res = await fetch(`/api/views?providerId=${encodeURIComponent(vendorId)}`);
      if (res.ok) {
        const data = await res.json();
        setViews(data.views || []);
      }
    } catch (err) {
      console.error("Failed to fetch views", err);
    }
  };

  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.user.role === "vendor") {
            setVendor(data.user);
            setShowcaseImages(data.user.images || []);
            setAvailable(data.user.available !== false);
            setUnavailableDates(
              (data.user.unavailableDates || []).map((d: string) => new Date(d).toISOString().split("T")[0])
            );
            fetchBookings();
            fetchViews(data.user.id);
            fetchVenues(data.user.id);
            fetchServices(data.user.id);
          } else if (data.authenticated) {
            router.push(data.user.role === "admin" ? "/admin/dashboard" : "/dashboard");
          } else {
            router.push("/login");
          }
        } else {
          router.push("/login");
        }
      } catch (err) {
        console.error("Vendor dashboard session check error:", err);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }
    checkSession();
  }, [router]);

  const handleLogout = async () => {
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (res.ok) {
        window.location.href = "/";
      }
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  const handleAvailabilityChange = async (next: boolean) => {
    const previous = available;
    setAvailable(next);
    setProfileMessage(null);
    try {
      const res = await fetch("/api/vendors", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ available: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update availability.");
      setVendor((current) => current ? { ...current, available: next } : current);
      setProfileMessage(data.message || "Availability updated.");
    } catch (err) {
      setAvailable(previous);
      setProfileMessage(err instanceof Error ? err.message : "Failed to update availability.");
    }
  };

  const addUnavailableDate = () => {
    if (!newUnavailableDate) return;
    setUnavailableDates((prev) =>
      prev.includes(newUnavailableDate) ? prev : [...prev, newUnavailableDate].sort()
    );
    setNewUnavailableDate("");
  };

  const removeUnavailableDate = (date: string) => {
    setUnavailableDates((prev) => prev.filter((d) => d !== date));
  };

  const handleSaveUnavailableDates = async () => {
    setSavingUnavailableDates(true);
    setUnavailableDatesMessage(null);
    try {
      const res = await fetch("/api/vendors", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unavailableDates }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to save unavailable dates.");
      setUnavailableDatesMessage("Unavailable dates saved.");
    } catch (err) {
      setUnavailableDatesMessage(err instanceof Error ? err.message : "Failed to save unavailable dates.");
    } finally {
      setSavingUnavailableDates(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (showcaseImages.length >= 6) {
      setUploadError("Maximum of 6 images allowed.");
      return;
    }

    setUploadingImage(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to upload image.");
      }

      const data = await res.json();
      setShowcaseImages((prev) => [...prev, data.url]);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Failed to upload image.");
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = (indexToRemove: number) => {
    setShowcaseImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const moveImage = (index: number, direction: "left" | "right") => {
    const targetIndex = direction === "left" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= showcaseImages.length) return;

    setShowcaseImages((prev) => {
      const updated = [...prev];
      const temp = updated[index];
      updated[index] = updated[targetIndex];
      updated[targetIndex] = temp;
      return updated;
    });
  };

  const handleSaveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingProfile(true);
    setProfileMessage(null);

    const formData = new FormData(event.currentTarget);
    const payload = {
      businessName: String(formData.get("businessName") || ""),
      name: String(formData.get("name") || ""),
      phone: String(formData.get("phone") || ""),
      category: String(formData.get("category") || ""),
      city: String(formData.get("city") || ""),
      description: String(formData.get("description") || ""),
      website: String(formData.get("website") || ""),
      instagram: String(formData.get("instagram") || ""),
      priceFrom: String(formData.get("priceFrom") || ""),
      images: showcaseImages,
    };

    try {
      const res = await fetch("/api/vendors", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to save vendor profile.");
      setVendor(data.vendor);
      setShowcaseImages(data.vendor.images || []);
      setAvailable(data.vendor.available !== false);
      setProfileMessage(data.message || "Profile saved.");
      offerPlansAfterSave();
    } catch (err) {
      setProfileMessage(err instanceof Error ? err.message : "Failed to save vendor profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-stone-50 text-stone-800 font-body">
        <div className="w-10 h-10 rounded-full border-2 border-primary-500/20 border-t-orange-500 animate-spin mb-4" />
        <p className="font-bold text-sm tracking-wide">SECURE WORKSPACE</p>
      </div>
    );
  }

  if (!vendor) return null;

  const menuItems: any[] = [
    { id: "overview", label: "Dashboard", icon: LayoutDashboard },
    {
      id: "services",
      label: "Services & Venues",
      icon: Briefcase,
      count: venues.length + services.length || null
    },
    { id: "leads", label: "Booking Inquiries", count: activeBookings.length || null, icon: Inbox },
    { id: "earnings", label: "Earnings", icon: TrendingUpIcon },
    { id: "settings", label: "Business Profile", icon: SettingsIcon },
    { id: "account-settings", label: "Settings", icon: SlidersHorizontalIcon },
    { id: "home", label: "Back to Home", icon: HomeIcon, href: "/" },
  ];

  // Dark Mode helper CSS classes (corrected color classes to standard Tailwind tokens)
  const containerBg = isDarkMode ? "bg-stone-950 text-stone-200" : "bg-[#fafaf9] text-stone-800";
  const sidebarClass = isDarkMode ? "border-stone-800 bg-stone-900/80 text-stone-300" : "border-stone-200 bg-white/70 text-stone-600";
  const cardClass = isDarkMode ? "bg-stone-900/60 border-stone-800 text-stone-300" : "bg-white/70 border-stone-200 text-stone-600";
  const headerClass = isDarkMode ? "bg-stone-900/70 border-stone-800 text-white" : "bg-white/70 border-stone-200 text-stone-800";
  const headingText = isDarkMode ? "text-white" : "text-stone-900";
  const dividerClass = isDarkMode ? "border-stone-800" : "border-stone-100";

  return (
    <div className={`h-screen font-body flex relative overflow-hidden p-0 sm:p-2 transition-colors duration-300 ${containerBg} ${isDarkMode ? "dark" : ""}`}>

      {/* Ambient background gradients */}
      <div className="absolute w-[50rem] h-[50rem] -top-96 -left-96 opacity-[0.03] pointer-events-none rounded-full bg-primary-500 blur-[120px]" />
      <div className="absolute w-[45rem] h-[45rem] -bottom-80 -right-80 opacity-[0.03] pointer-events-none rounded-full bg-amber-500 blur-[120px]" />

      {/* ─── FLOATING SIDEBAR (Desktop) ─── */}
      <aside className={`hidden lg:flex flex-col border rounded-3xl m-3 h-[calc(100vh-2rem)] sticky top-4 shrink-0 z-30 shadow-none transition-all duration-300 overflow-hidden ${sidebarClass} ${sidebarCollapsed ? 'w-20' : 'w-64'}`}>
        {/* Branding header with collapse button */}
        <div className={`p-6 border-b flex items-center justify-between min-h-[77px] ${dividerClass}`}>
          {!sidebarCollapsed ? (
            <div className="flex flex-col gap-1 transition-all duration-300 overflow-hidden">
              <Link href="/">
                <Image
                  src="/logo/logo-by-soulswed.png"
                  alt="SoulsWed"
                  width={150}
                  height={45}
                  className="h-8 w-auto hover:opacity-80 transition-opacity"
                  priority
                />
              </Link>
              <p className="text-[9px] font-bold text-primary-600 uppercase tracking-widest mt-1 whitespace-nowrap">Partner Portal</p>
            </div>
          ) : (
            <h2 className={`font-extrabold text-sm tracking-tight uppercase mx-auto ${isDarkMode ? 'text-white' : 'text-stone-900'}`}>SW</h2>
          )}
        </div>

        <nav className="flex-1 px-4 py-6 flex flex-col gap-1.5 overflow-y-auto overflow-x-hidden">
          {menuItems.map((item) => {
            const hasSubItems = item.subItems && item.subItems.length > 0;
            const isSubActive = hasSubItems && item.subItems.some((sub: any) => sub.id === activeTab);
            const isActive = activeTab === item.id || isSubActive;
            const Icon = item.icon;

            return (
              <div key={item.id} className="w-full">
                <button
                  onClick={() => {
                    if (item.href) {
                      router.push(item.href);
                    } else if (hasSubItems) {
                      setServicesExpanded(!servicesExpanded);
                      if (sidebarCollapsed) setSidebarCollapsed(false);
                    } else {
                      setActiveTab(item.id as TabType);
                    }
                  }}
                  className={`w-full relative flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'} px-3.5 py-3 rounded-2xl text-xs font-bold transition-all duration-200 cursor-pointer ${isActive
                    ? "bg-primary-500 text-white"
                    : isDarkMode
                      ? "text-stone-400 hover:text-white hover:bg-stone-800/60"
                      : "text-stone-600 hover:text-stone-900 hover:bg-stone-50"
                    }`}
                  title={item.label}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className="w-[18px] h-[18px] shrink-0" {...(Icon.displayName?.includes("Icon") || Icon.name?.includes("Icon") ? { isAnimating: isActive } : {})} />
                    <span className={`whitespace-nowrap transition-all duration-300 overflow-hidden ${sidebarCollapsed ? 'opacity-0 max-w-0' : 'opacity-100 max-w-[160px]'}`}>{item.label}</span>
                  </div>
                  {!sidebarCollapsed && item.count !== undefined && item.count !== null && !hasSubItems && (
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black transition-opacity duration-300 whitespace-nowrap ${isActive ? "bg-white/20 text-white" : "bg-stone-100 text-stone-500 border border-stone-200"
                      }`}>
                      {item.count}
                    </span>
                  )}
                  {!sidebarCollapsed && hasSubItems && (
                    servicesExpanded ? <ChevronDownIcon className="w-4 h-4 opacity-70 shrink-0" /> : <ChevronRightIcon className="w-4 h-4 opacity-70 shrink-0" />
                  )}
                  {sidebarCollapsed && item.count !== undefined && item.count !== null && !hasSubItems && (
                    <span className={`absolute right-1.5 top-1.5 px-1.5 py-0.5 rounded-full text-[8px] font-black ${isActive ? "bg-white text-primary-600" : "bg-stone-100 text-stone-500 border border-stone-200"
                      }`}>
                      {item.count}
                    </span>
                  )}
                </button>

                <AnimatePresence>
                  {hasSubItems && servicesExpanded && !sidebarCollapsed && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="flex flex-col gap-1 ml-4 mt-1 pl-2 border-l-2 border-stone-100 dark:border-stone-800 overflow-hidden"
                    >
                      {item.subItems.map((subItem: any) => {
                        const SubIcon = subItem.icon;
                        const isSubItemActive = activeTab === subItem.id;
                        return (
                          <button
                            key={subItem.id}
                            onClick={() => setActiveTab(subItem.id as TabType)}
                            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${isSubItemActive
                              ? "text-primary-600 bg-primary-50 dark:bg-primary-900/20"
                              : isDarkMode
                                ? "text-stone-400 hover:text-white hover:bg-stone-800/60"
                                : "text-stone-500 hover:text-stone-900 hover:bg-stone-50"
                              }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <SubIcon className="w-[15px] h-[15px] shrink-0" {...(SubIcon.displayName?.includes("Icon") || SubIcon.name?.includes("Icon") ? { isAnimating: isSubItemActive } : {})} />
                              <span className="whitespace-nowrap">{subItem.label}</span>
                            </div>
                            {subItem.count !== undefined && subItem.count !== null && (
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${isSubItemActive
                                ? "bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300"
                                : isDarkMode
                                  ? "bg-stone-800 text-stone-400 border border-stone-700"
                                  : "bg-stone-100 text-stone-500 border border-stone-200"
                                }`}>
                                {subItem.count}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </nav>

        <div className={`p-4 border-t flex flex-col gap-1.5 ${dividerClass} ${isDarkMode ? 'bg-stone-900/30' : 'bg-stone-50/50'} rounded-b-3xl`}>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-start'} gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${isDarkMode
              ? "text-stone-400 hover:text-white hover:bg-stone-800/60"
              : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
              }`}
            title={sidebarCollapsed ? "Expand sidebar" : "Hide sidebar"}
          >
            <svg className="w-[18px] h-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
            </svg>
            <span className={`whitespace-nowrap transition-all duration-300 overflow-hidden ${sidebarCollapsed ? 'opacity-0 max-w-0' : 'opacity-100 max-w-[120px]'}`}>Hide sidebar</span>
          </button>

          <div className="my-1 border-t border-transparent" />

          <div className={`flex items-center justify-between p-2 rounded-xl transition-colors ${isDarkMode ? 'bg-stone-900/50 hover:bg-stone-800' : 'bg-white hover:bg-stone-50 border border-stone-100'}`}>
            <div className="flex items-center gap-3 min-w-0">
              {vendor.profileImage ? (
                <img src={vendor.profileImage} alt={vendor.businessName || vendor.name} className="w-8 h-8 shrink-0 rounded-full object-cover" />
              ) : (
                <div className="w-8 h-8 shrink-0 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-400 dark:text-stone-500 flex items-center justify-center shrink-0">
                  <UserIcon className="w-4 h-4" />
                </div>
              )}
              <div className={`min-w-0 flex-1 pr-2 transition-all duration-300 overflow-hidden ${sidebarCollapsed ? 'opacity-0 max-w-0 pointer-events-none hidden' : 'opacity-100 max-w-[140px]'}`}>
                <h4 className={`font-bold text-xs truncate ${headingText}`}>{vendor.businessName || vendor.name}</h4>
                <p className="text-[10px] font-medium text-stone-500 truncate">{vendor.email}</p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              title="Sign Out"
              className={`shrink-0 p-1.5 rounded-lg transition-colors cursor-pointer ${sidebarCollapsed ? 'mx-auto' : ''} ${isDarkMode ? 'text-stone-400 hover:text-red-400 hover:bg-red-950/30' : 'text-stone-500 hover:text-red-500 hover:bg-red-50'}`}
            >
              <svg className="w-[15px] h-[15px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* ─── MAIN CONTENT AREA ─── */}
      <div className="flex-1 min-w-0 flex flex-col p-3 gap-4 overflow-y-auto">

        {/* Floating Top Header */}
        <header className={`sticky top-0 z-50 backdrop-blur-xl border rounded-2xl px-6 py-4 flex items-center justify-between shadow-none transition-colors duration-300 ${headerClass}`}>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`lg:hidden px-3 py-1.5 rounded-xl border text-xs font-bold ${isDarkMode ? "border-stone-800 text-stone-300 hover:bg-stone-800" : "border-stone-200 hover:bg-stone-50"
                }`}
            >
              {mobileMenuOpen ? "[Close]" : "[Menu]"}
            </button>
            <div>
              <h1 className={`font-extrabold text-lg tracking-tight font-serif capitalize ${headingText}`}>
                {(menuItems.find(i => i.id === activeTab) || menuItems.find(i => i.subItems?.some((s: any) => s.id === activeTab))?.subItems?.find((s: any) => s.id === activeTab))?.label || "Partner Dashboard"}
              </h1>
              <p className="text-[10px] text-stone-500 font-semibold mt-0.5 flex flex-wrap items-center gap-1.5">
                <span className="font-bold text-[#EE7429] tracking-wider uppercase">{vendor.businessName || vendor.name}</span>
                <span className="opacity-50 hidden sm:inline">•</span>
                <span className="block sm:inline">
                  {activeTab === "overview" && "Manage your profile showcase, settings, and upcoming client bookings."}
                  {activeTab === "leads" && "All couple enquiries and booking requests."}
                  {activeTab === "earnings" && "What you've earned, what's been paid out, and what's still to collect."}
                  {activeTab === "services" && "Manage your active listings and venues."}
                  {activeTab === "settings" && "Manage your vendor portal configuration."}
                  {activeTab === "account-settings" && "Appearance, security & account preferences."}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* SearchIcon */}
            <div className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl border max-w-[200px] transition-colors focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-500/20 ${isDarkMode ? "bg-stone-800/50 border-stone-700" : "bg-white border-stone-200"}`}>
              <SearchIcon className="w-4 h-4 text-stone-400" />
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search..." 
                className="bg-transparent border-none outline-none text-xs font-bold w-full placeholder:text-stone-400"
              />
            </div>
            <ThemeToggle />
            <button
              onClick={fetchBookings}
              disabled={loadingData}
              className={`flex items-center justify-center gap-2 px-3 py-1.5 border rounded-xl font-bold text-xs shadow-none cursor-pointer disabled:opacity-50 ${isDarkMode
                ? "border-stone-800 bg-stone-900 text-stone-300 hover:bg-stone-800"
                : "border-stone-200 bg-white hover:bg-stone-50 text-stone-700"
                }`}
            >
              <span>Sync</span>
            </button>
          </div>
        </header>

        {/* Mobile menu panel */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`lg:hidden border rounded-2xl p-4 shadow-none flex flex-col gap-2 z-20 ${isDarkMode ? "bg-stone-900 border-stone-800 text-white" : "bg-white border-stone-200 text-stone-800"
                }`}
            >
              {menuItems.map((item) => {
                const hasSubItems = item.subItems && item.subItems.length > 0;

                return (
                  <div key={item.id} className="flex flex-col gap-1">
                    <button
                      onClick={() => {
                        if (hasSubItems) {
                          setServicesExpanded(!servicesExpanded);
                        } else {
                          setActiveTab(item.id as TabType);
                          setMobileMenuOpen(false);
                        }
                      }}
                      className={`flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all ${activeTab === item.id || (hasSubItems && item.subItems.some((s: any) => s.id === activeTab))
                        ? "bg-primary-500 text-white"
                        : isDarkMode
                          ? "text-stone-300 hover:bg-stone-800"
                          : "text-stone-600 hover:bg-stone-50"
                        }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>{item.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {item.count !== undefined && item.count !== null && !hasSubItems && (
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${activeTab === item.id ? "bg-white/20 text-white" : "bg-stone-100 text-stone-600"
                            }`}>
                            {item.count}
                          </span>
                        )}
                        {hasSubItems && (
                          servicesExpanded ? <ChevronDownIcon className="w-4 h-4 opacity-70" /> : <ChevronRightIcon className="w-4 h-4 opacity-70" />
                        )}
                      </div>
                    </button>

                    {hasSubItems && servicesExpanded && (
                      <div className="flex flex-col gap-1 pl-4 ml-2 border-l border-stone-200 dark:border-stone-700">
                        {item.subItems.map((subItem: any) => (
                          <button
                            key={subItem.id}
                            onClick={() => {
                              setActiveTab(subItem.id as TabType);
                              setMobileMenuOpen(false);
                            }}
                            className={`flex items-center justify-between p-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === subItem.id
                              ? "text-primary-600 bg-primary-50 dark:bg-primary-900/20"
                              : isDarkMode
                                ? "text-stone-400 hover:bg-stone-800"
                                : "text-stone-500 hover:bg-stone-50"
                              }`}
                          >
                            <span>{subItem.label}</span>
                            {subItem.count !== undefined && subItem.count !== null && (
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${activeTab === subItem.id ? "bg-primary-100 text-primary-600" : "bg-stone-105 text-stone-500"
                                }`}>
                                {subItem.count}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              <hr className={`my-2 ${dividerClass}`} />
              <button
                onClick={handleLogout}
                className="flex items-center justify-center gap-2 p-3 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 font-bold rounded-xl text-xs"
              >
                Sign Out
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab contents */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="flex-1"
          >

            {/* OVERVIEW SECTION */}
            {activeTab === "overview" && (
              <div className="flex flex-col gap-5">

                {/* Account verification warning banner */}
                {!vendor.verified && (
                  <div className={`border rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-none ${isDarkMode ? "bg-amber-950/10 border-amber-900/50" : "bg-amber-50/60 border-amber-200"
                    }`}>
                    <div className="flex gap-3 text-xs font-semibold">
                      <div>
                        <h4 className={`font-bold ${headingText}`}>
                          Account Verification Pending
                        </h4>
                        <p className="text-[10px] text-stone-500 mt-0.5 font-medium">
                          Administrators will verify your brand details soon. Public listing stays hidden until approval.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-6">

                  {/* Performance & ID grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                    {/* Metrics */}
                    <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {[
                        {
                          label: "Partner Rating",
                          count: "New",
                          icon: Star,
                          color: "text-amber-500 dark:text-amber-400",
                          bg: "bg-amber-50 dark:bg-amber-500/10",
                          desc: "Top 10% in your city"
                        },
                        {
                          label: "Total Reviews",
                          count: "0",
                          icon: MessageSquareIcon,
                          color: "text-blue-500 dark:text-blue-400",
                          bg: "bg-blue-50 dark:bg-blue-500/10",
                          desc: "Awaiting your first review"
                        },
                        {
                          label: "Active Leads",
                          count: activeBookings.length,
                          icon: TrendingUpIcon,
                          color: "text-emerald-500 dark:text-emerald-400",
                          bg: "bg-emerald-50 dark:bg-emerald-500/10",
                          desc: "Respond quickly to win"
                        },
                      ].map((stat, i) => {
                        const Icon = stat.icon;
                        return (
                          <div
                            key={i}
                            className={`p-5 rounded-3xl border flex flex-col justify-between relative overflow-hidden group shadow-none ${cardClass}`}
                          >
                            <div className="flex items-center justify-between mb-4">
                              <span className={`text-2xl font-black ${headingText}`}>{stat.count}</span>
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${stat.bg} ${stat.color}`}>
                                <Icon className="w-4 h-4" />
                              </div>
                            </div>
                            <div>
                              <span className="block text-xs font-bold text-stone-600 dark:text-stone-300 mb-1">{stat.label}</span>
                              <span className="block text-[10px] font-semibold text-stone-400">{stat.desc}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* ID Card */}
                    <div className={`lg:col-span-2 p-5 rounded-3xl border flex items-center gap-5 relative overflow-hidden shadow-none ${cardClass}`}>
                      {/* Avatar */}
                      <div className="relative shrink-0">
                        {vendor?.profileImage ? (
                          <img src={vendor.profileImage} alt={vendor.name} className="w-16 h-16 rounded-full object-cover border-2 border-primary-100 dark:border-stone-800" />
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-black text-2xl border-2 border-white dark:border-stone-900">
                            {(vendor?.businessName || vendor?.name || "?").charAt(0).toUpperCase()}
                          </div>
                        )}
                        {vendor?.verified && (
                          <div className="absolute -bottom-1 -right-1 bg-white dark:bg-stone-900 rounded-full p-0.5">
                            <BadgeCheck className="w-6 h-6 text-green-500 fill-green-100 dark:fill-green-900/30" />
                          </div>
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex flex-col min-w-0">
                        <h3 className={`font-extrabold text-base leading-tight truncate ${headingText}`}>
                          {vendor?.businessName || vendor?.name}
                        </h3>
                        <p className="text-xs text-stone-500 font-semibold mt-1 capitalize truncate">
                          {vendor?.category} • {vendor?.city}
                        </p>
                        <div className="flex items-center gap-2 mt-2.5">
                          <span className="text-[10px] bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-400 px-2.5 py-0.5 rounded-md font-black tracking-wide uppercase">
                            ID: {vendor?.id?.slice(-6) || "NEW"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ── Real-Time Listing Grid ── */}
                  {(() => {
                    const venueListings = venues;
                    const roomListings = services.filter(s => s.category === "rooms");
                    const plannerListings = services.filter(s => s.category === "planners");
                    const catererListings = services.filter(s => s.category === "caterers");
                    const decoratorListings = services.filter(s => s.category === "decorators");
                    const photographyListings = services.filter(s => s.category === "photography");

                    const minPrice = (arr: any[], key = "priceFrom") =>
                      arr.length === 0 ? null : Math.min(...arr.map(i => Number(i[key] || i.price || 0)).filter(v => v > 0));

                    const getTopName = (arr: any[]) => arr.filter(v => v.active)[0]?.name || arr[0]?.name || null;

                    const categories = [
                      { id: "venues", label: "Venues", icon: Building2, color: "from-amber-500 to-orange-500", lightBg: "bg-amber-50 border-amber-100", count: venueListings.length, price: minPrice(venueListings, "price"), unit: "per day", live: venueListings.filter(v => v.active).length, topName: getTopName(venueListings) },
                      { id: "planners", label: "Planners", icon: ClipboardList, color: "from-violet-500 to-purple-500", lightBg: "bg-violet-50 border-violet-100", count: plannerListings.length, price: minPrice(plannerListings), unit: "per event", live: plannerListings.filter(s => s.active).length, topName: getTopName(plannerListings) },
                      { id: "caterers", label: "Caterers", icon: Utensils, color: "from-emerald-500 to-teal-500", lightBg: "bg-emerald-50 border-emerald-100", count: catererListings.length, price: minPrice(catererListings), unit: "per plate", live: catererListings.filter(s => s.active).length, topName: getTopName(catererListings) },
                      { id: "decorators", label: "Decorators", icon: Palette, color: "from-pink-500 to-rose-500", lightBg: "bg-pink-50 border-pink-100", count: decoratorListings.length, price: minPrice(decoratorListings), unit: "per event", live: decoratorListings.filter(s => s.active).length, topName: getTopName(decoratorListings) },
                      { id: "photography", label: "Photography", icon: Camera, color: "from-purple-500 to-indigo-500", lightBg: "bg-purple-50 border-purple-100", count: photographyListings.length, price: minPrice(photographyListings), unit: "per day", live: photographyListings.filter(s => s.active).length, topName: getTopName(photographyListings) },
                      { id: "rooms", label: "Rooms", icon: BedDouble, color: "from-blue-500 to-indigo-500", lightBg: "bg-blue-50 border-blue-100", count: roomListings.length, price: minPrice(roomListings), unit: "per night", live: roomListings.filter(s => s.active).length, topName: getTopName(roomListings) },
                    ];

                    return (
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <h3 className={`font-extrabold text-sm ${headingText}`}>Your Listings at a Glance</h3>
                          <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Real-time • {new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                          {categories.map((cat) => (
                            <button
                              key={cat.id}
                              onClick={() => setActiveTab(cat.id as TabType)}
                              className={`relative group flex flex-col gap-2 p-4 rounded-2xl border text-left cursor-pointer ${isDarkMode ? "bg-stone-900/60 border-stone-800" : `${cat.lightBg}`}`}
                            >
                              {/* Icon + live badge */}
                              <div className="flex items-start justify-between mb-1">
                                <div className="text-2xl mb-2 opacity-90"><cat.icon className="w-8 h-8 text-stone-700" /></div>
                                {cat.live > 0 && (
                                  <span className="flex items-center gap-1 text-[8px] font-black px-1.5 py-0.5 rounded-full bg-emerald-500 text-white uppercase tracking-wide">
                                    <span className="w-1 h-1 rounded-full bg-white animate-ping inline-block" />
                                    {cat.live} live
                                  </span>
                                )}
                              </div>

                              {/* Label */}
                              <div>
                                <p className={`text-[10px] font-extrabold uppercase tracking-wide leading-tight ${isDarkMode ? "text-stone-400" : "text-stone-500"}`}>Top {cat.label}</p>
                                {cat.topName ? (
                                  <p className={`text-[13px] font-bold mt-0.5 line-clamp-2 leading-snug ${isDarkMode ? "text-stone-200" : "text-stone-800"}`} title={cat.topName}>
                                    {cat.topName}
                                  </p>
                                ) : (
                                  <p className={`text-[13px] font-bold mt-0.5 line-clamp-2 leading-snug ${isDarkMode ? "text-stone-500" : "text-stone-400"}`}>
                                    No {cat.label.toLowerCase()}
                                  </p>
                                )}
                              </div>

                              {/* Count */}
                              <div className="flex items-baseline gap-1 mt-1">
                                <span className={`text-2xl font-black leading-none ${isDarkMode ? "text-white" : "text-stone-900"}`}>{cat.count}</span>
                                <span className="text-[10px] font-bold text-stone-400">{cat.count === 1 ? "listing" : "listings"}</span>
                              </div>

                              {/* Price */}
                              <div className={`pt-2.5 mt-auto border-t ${isDarkMode ? "border-stone-700" : "border-stone-200/70"}`}>
                                {cat.price !== null && cat.price > 0 ? (
                                  <div className="flex flex-col gap-0.5">
                                    <span className="text-[8px] font-black uppercase tracking-widest text-stone-400">from</span>
                                    <div className="flex items-baseline gap-0.5">
                                      <span className={`text-[13px] font-black leading-none ${isDarkMode ? "text-white" : "text-stone-800"}`}>₹{cat.price.toLocaleString("en-IN")}</span>
                                    </div>
                                    <span className="text-[9px] text-stone-400 font-semibold">{cat.unit}</span>
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-stone-400 font-semibold">No price set</span>
                                )}
                              </div>

                              {/* Gradient hover indicator */}
                              <div className={`absolute bottom-0 left-0 right-0 h-0.5 rounded-b-2xl bg-gradient-to-r ${cat.color} opacity-0 group-hover:opacity-100 transition-opacity duration-200`} />
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                    <VendorAnalyticsChart bookings={bookings} views={views} />

                    {/* Leads list section */}
                    <div className={`rounded-3xl p-6 border shadow-none flex flex-col gap-5 min-h-[320px] ${cardClass}`}>
                      <div className={`flex justify-between items-center pb-2 border-b ${dividerClass}`}>
                        <h3 className={`font-extrabold text-sm ${headingText}`}>Active Inquiries</h3>
                        <button
                          onClick={() => setActiveTab("leads")}
                          className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-0.5 cursor-pointer"
                        >
                          View All Leads
                        </button>
                      </div>

                      {bookings.filter(b => {
                        const val = searchTerm.toLowerCase();
                        return !val || String(b.userName || "").toLowerCase().includes(val) || String(b.providerName || b.venueName || "").toLowerCase().includes(val) || String(b.status || "").toLowerCase().includes(val) || String(b._id || "").toLowerCase().includes(val);
                      }).length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center py-10">
                          <h4 className={`font-bold text-sm ${isDarkMode ? 'text-stone-300' : 'text-stone-700'}`}>All Caught Up!</h4>
                          <p className="text-xs text-stone-400 max-w-xs mt-1 font-medium">
                            {searchTerm ? "No active leads match your search." : "No active couple requests currently. Complete your business information to start appearing in search queries."}
                          </p>
                        </div>
                      ) : (
                        <div className="flex gap-5 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
                          {bookings.filter(b => {
                            const val = searchTerm.toLowerCase();
                            return !val || String(b.userName || "").toLowerCase().includes(val) || String(b.providerName || b.venueName || "").toLowerCase().includes(val) || String(b.status || "").toLowerCase().includes(val) || String(b._id || "").toLowerCase().includes(val);
                          }).slice(0, 6).map((booking) => (
                            <div key={booking._id} className="flex-shrink-0 w-[85vw] sm:w-[320px] lg:w-[360px]">
                              <BookingCard booking={booking} isVendor={true} />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>


              </div>
            )}

            {/* LEADS LIST SECTION */}
            {activeTab === "leads" && (
              <div className={`rounded-3xl p-6 border shadow-none min-h-[400px] flex flex-col gap-5 ${cardClass}`}>
                <div className={`flex justify-between items-center pb-2 border-b ${dividerClass}`}>
                  <h3 className={`font-extrabold text-base ${headingText}`}>Booking Inquiries</h3>
                  <span className={`text-[10px] font-black border px-2.5 py-1 rounded-full uppercase tracking-wider ${isDarkMode ? "bg-emerald-950/20 text-emerald-400 border-emerald-900" : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/25"
                    }`}>
                    {activeBookings.length} active leads
                  </span>
                </div>

                {bookings.filter(b => {
                  const val = searchTerm.toLowerCase();
                  return !val || String(b.userName || "").toLowerCase().includes(val) || String(b.providerName || b.venueName || "").toLowerCase().includes(val) || String(b.status || "").toLowerCase().includes(val) || String(b._id || "").toLowerCase().includes(val);
                }).length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-16">
                    <h4 className="font-bold text-stone-705 text-sm">No inquiries recorded</h4>
                    <p className="text-xs text-stone-400 max-w-xs mt-1">
                      {searchTerm ? "No inquiries match your search." : "Couple checkout orders and price requests will show here."}
                    </p>
                  </div>
                ) : (
                  <div className="flex gap-5 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
                    {bookings.filter(b => {
                      const val = searchTerm.toLowerCase();
                      return !val || String(b.userName || "").toLowerCase().includes(val) || String(b.providerName || b.venueName || "").toLowerCase().includes(val) || String(b.status || "").toLowerCase().includes(val) || String(b._id || "").toLowerCase().includes(val);
                    }).map((booking) => (
                      <div key={booking._id} className="flex-shrink-0 w-[85vw] sm:w-[320px] lg:w-[360px]">
                        <BookingCard booking={booking} isVendor={true} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "earnings" && (
              <div className="flex flex-col gap-6">
                {/* Headline figures. Deliberately shows what was COLLECTED
                    rather than headline booking value — the platform only ever
                    holds the advance, so gross would overstate what's owed. */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  {[
                    {
                      label: "Net earnings",
                      value: earningsStats?.totalCollected - earningsStats?.totalCommission,
                      hint: "After platform commission",
                      accent: "text-emerald-600 dark:text-emerald-400",
                    },
                    {
                      label: "Awaiting payout",
                      value: earningsStats?.pendingPayoutsAmount,
                      hint: "Not yet released to you",
                      accent: "text-amber-600 dark:text-amber-400",
                    },
                    {
                      label: "Paid out",
                      value: earningsStats?.releasedPayoutsAmount,
                      hint: "Already transferred",
                      accent: "text-blue-600 dark:text-blue-400",
                    },
                    {
                      label: "To collect at venue",
                      value: earningsStats?.balanceDueAtVenue,
                      hint: "Customer pays you directly",
                      accent: headingText,
                    },
                  ].map((card) => (
                    <div key={card.label} className={`rounded-3xl p-5 border ${cardClass}`}>
                      <p className="text-[10px] font-black uppercase tracking-wider text-stone-400">
                        {card.label}
                      </p>
                      <p className={`text-2xl font-black mt-2 ${card.accent}`}>
                        {formatAsCurrency(Number(card.value) || 0, "INR")}
                      </p>
                      <p className="text-[11px] text-stone-400 mt-1">{card.hint}</p>
                    </div>
                  ))}
                </div>

                {earningsStats?.commissionRate != null && (
                  <p className="text-[11px] text-stone-400 -mt-2">
                    SoulsWed commission is{" "}
                    <strong>{Math.round(earningsStats.commissionRate * 100)}%</strong> of the
                    advance we collect on your behalf
                    {earningsStats.totalCommission > 0 && (
                      <> — {formatAsCurrency(earningsStats.totalCommission, "INR")} so far</>
                    )}
                    . The remaining balance is settled directly between you and the customer.
                  </p>
                )}

                {earningsByListing.length > 0 && (
                  <div className={`rounded-3xl p-6 border ${cardClass}`}>
                    <h3 className={`font-extrabold text-base mb-4 ${headingText}`}>By listing</h3>
                    <div className="flex flex-col gap-2">
                      {earningsByListing.map((l: any) => (
                        <div
                          key={l.providerId}
                          className={`flex items-center justify-between py-2.5 border-b last:border-0 ${dividerClass}`}
                        >
                          <div>
                            <p className={`text-sm font-bold ${headingText}`}>{l.providerName}</p>
                            <p className="text-[11px] text-stone-400">
                              {l.bookings} booking{l.bookings === 1 ? "" : "s"}
                            </p>
                          </div>
                          <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                            {formatAsCurrency(l.net, "INR")}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className={`rounded-3xl p-6 border ${cardClass} min-h-[240px]`}>
                  <div className={`flex justify-between items-center pb-3 mb-3 border-b ${dividerClass}`}>
                    <h3 className={`font-extrabold text-base ${headingText}`}>Payment history</h3>
                    <span className="text-[10px] font-black uppercase tracking-wider text-stone-400">
                      {earnings.length} paid booking{earnings.length === 1 ? "" : "s"}
                    </span>
                  </div>

                  {earnings.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center py-14">
                      <h4 className="font-bold text-sm text-stone-500">No earnings yet</h4>
                      <p className="text-xs text-stone-400 max-w-sm mt-1">
                        Once a customer pays the advance on one of your listings, it appears
                        here with the commission and your net payout broken out.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="text-[10px] uppercase tracking-wider font-black text-stone-400">
                            <th className="pb-3">Booking</th>
                            <th className="pb-3">Customer</th>
                            <th className="pb-3 text-right">Collected</th>
                            <th className="pb-3 text-right">Commission</th>
                            <th className="pb-3 text-right">Your payout</th>
                            <th className="pb-3 text-right">At venue</th>
                            <th className="pb-3 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {earnings.map((e: any) => (
                            <tr key={e.bookingId} className={`border-t ${dividerClass}`}>
                              <td className="py-3">
                                <p className={`font-bold ${headingText}`}>{e.providerName}</p>
                                <p className="text-[10px] text-stone-400 font-mono">
                                  {String(e.bookingId).slice(-8).toUpperCase()}
                                </p>
                              </td>
                              <td className="py-3 text-stone-500">{e.userName}</td>
                              <td className="py-3 text-right font-bold">
                                {formatAsCurrency(e.amountPaid, e.currency)}
                              </td>
                              <td className="py-3 text-right text-stone-400">
                                −{formatAsCurrency(e.commissionAmount, e.currency)}
                              </td>
                              <td className="py-3 text-right font-black text-emerald-600 dark:text-emerald-400">
                                {formatAsCurrency(e.netVendorPayout, e.currency)}
                              </td>
                              <td className="py-3 text-right text-stone-400">
                                {e.balanceDueAtVenue > 0
                                  ? formatAsCurrency(e.balanceDueAtVenue, e.currency)
                                  : "—"}
                              </td>
                              <td className="py-3 text-center">
                                <span
                                  className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                                    e.payoutStatus === "released"
                                      ? "text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/25 bg-emerald-50/70 dark:bg-emerald-500/10"
                                      : "text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/25 bg-amber-50/70 dark:bg-amber-500/10"
                                  }`}
                                >
                                  {e.payoutStatus}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "services" && (
              <div className={`mb-6 p-5 border rounded-3xl ${cardClass} flex flex-col gap-4`}>
                <div className="flex items-center justify-between pb-4 border-b border-stone-100 dark:border-stone-800/50">
                  <div>
                    <h3 className={`font-extrabold text-base ${isDarkMode ? "text-white" : "text-slate-900"}`}>Categories</h3>
                    <p className="text-[10px] text-stone-400 font-semibold mt-0.5">Filter your listings by vendor category</p>
                  </div>
                </div>

                <div className="overflow-x-auto custom-scrollbar flex items-start gap-4 pb-2" style={{ scrollbarWidth: 'none' }}>
                  {VENDOR_CATEGORIES.map(cat => (
                    <button
                      key={cat.slug}
                      onClick={() => setSelectedCategory(cat.slug)}
                      className={`flex flex-col items-center gap-3 shrink-0 transition-all p-2 rounded-2xl w-[100px] ${
                        selectedCategory === cat.slug ? "opacity-100" : "opacity-70 hover:opacity-100"
                      }`}
                    >
                      <div className={`w-[60px] h-[60px] rounded-full flex items-center justify-center border transition-all ${
                        selectedCategory === cat.slug 
                          ? "border-[var(--sw-primary)] bg-white shadow-sm" 
                          : isDarkMode ? "border-stone-700 bg-stone-800/50" : "border-orange-200 bg-white"
                      }`}>
                        <cat.icon className={`w-[22px] h-[22px] ${selectedCategory === cat.slug ? "text-[var(--sw-primary)]" : isDarkMode ? "text-stone-400" : "text-orange-400"}`} strokeWidth={selectedCategory === cat.slug ? 2 : 1.5} />
                      </div>
                      <div className="flex flex-col items-center gap-1 text-center">
                        <span className={`text-[12px] font-extrabold leading-tight ${
                          selectedCategory === cat.slug 
                            ? "text-[var(--sw-primary)]" 
                            : isDarkMode ? "text-stone-200" : "text-slate-900"
                        }`}>
                          {cat.name}
                        </span>
                        {cat.tagline && (
                          <span className={`text-[9px] font-bold uppercase tracking-wider leading-[1.2] ${isDarkMode ? "text-stone-500" : "text-slate-400"}`}>
                            {cat.tagline}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* MY VENUES TAB */}
            {activeTab === "services" && selectedCategory === "venues" && (
              <div className="flex flex-col gap-5">

                {/* ── Header bar ── */}
                <div className={`rounded-3xl p-5 border flex items-center justify-between shadow-none ${cardClass}`}>
                  <div>
                    <h3 className={`font-extrabold text-base ${headingText}`}>My Venues</h3>
                    <p className="text-[10px] text-stone-400 font-medium mt-0.5">
                      {`${venues.length} venue${venues.length !== 1 ? "s" : ""} in your account`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`flex rounded-lg p-1 mr-2 ${isDarkMode ? "bg-stone-800" : "bg-stone-100"}`}>
                      <button 
                        onClick={() => setVenueLayout('grid')}
                        className={`p-1.5 rounded-md transition-all ${venueLayout === 'grid' ? (isDarkMode ? 'bg-stone-700 shadow-sm text-primary-500' : 'bg-white shadow-sm text-primary-500') : 'text-stone-500 hover:text-stone-700 dark:hover:text-stone-300'}`}
                      >
                        <LayoutDashboard className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setVenueLayout('list')}
                        className={`p-1.5 rounded-md transition-all ${venueLayout === 'list' ? (isDarkMode ? 'bg-stone-700 shadow-sm text-primary-500' : 'bg-white shadow-sm text-primary-500') : 'text-stone-500 hover:text-stone-700 dark:hover:text-stone-300'}`}
                      >
                        <ClipboardList className="w-4 h-4" />
                      </button>
                    </div>
                    <button
                      onClick={openAddVenue}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-[11px] font-bold cursor-pointer transition-all"
                    >
                      <PlusIcon className="w-3.5 h-3.5" /> Add New Venue
                    </button>
                  </div>
                </div>

                {/* ── ADD / EDIT FORM MODAL ── */}
                <AnimatePresence>
                  {(venueView === "add" || venueView === "edit") && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm"
                    >
                      <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 10 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 10 }}
                        className={`w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 md:p-8 border shadow-none relative ${cardClass}`}
                        style={{ scrollbarWidth: 'none' }}
                      >
                        <button
                          onClick={() => setVenueView("grid")}
                          className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full bg-stone-100 hover:bg-stone-200 dark:hover:bg-stone-800 dark:hover:bg-stone-700 text-stone-500 transition-colors z-10 cursor-pointer"
                        >
                          <XIcon className="w-3.5 h-3.5" />
                        </button>
                        <h3 className={`font-extrabold text-lg mb-6 ${headingText}`}>
                          {venueView === "add" ? "Add New Venue" : `Edit Venue: ${editingVenue?.name}`}
                        </h3>
                        {venueMessage && (
                          <div className={`mb-5 rounded-3xl px-4 py-3 text-xs font-bold border ${venueMessage.includes("Failed") || venueMessage.includes("required")
                            ? "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/25"
                            : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/25"
                            }`}>{venueMessage}</div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">

                          {/* Venue Name */}
                          <div className="flex flex-col gap-1.5">
                            <label className="font-bold text-stone-500 uppercase tracking-wider">Venue Name *</label>
                            <input
                              type="text" value={venueForm.name} required
                              onChange={e => setVenueForm(p => ({ ...p, name: e.target.value }))}
                              placeholder="e.g. Grand Palace Banquet"
                              className={`border rounded-xl px-4 py-2.5 outline-none font-semibold ${isDarkMode ? "bg-stone-950 border-stone-800 text-stone-200" : "bg-white border-stone-200 text-stone-800"
                                }`}
                              minLength={2}
                              maxLength={100}
                            />
                          </div>

                          {/* Venue Type */}
                          <div className="flex flex-col gap-1.5">
                            <label className="font-bold text-stone-500 uppercase tracking-wider">Venue Type</label>
                            <select
                              value={venueForm.type}
                              onChange={e => setVenueForm(p => ({ ...p, type: e.target.value }))}
                              className={`border rounded-xl px-4 py-2.5 outline-none font-semibold ${isDarkMode ? "bg-stone-950 border-stone-800 text-stone-200" : "bg-white border-stone-200 text-stone-800"
                                }`}
                            >
                              {["Banquet Hall", "Resort", "Farm House", "Palace", "Beach Resort", "Garden Venue", "Heritage Hotel", "Rooftop Venue", "Convention Center", "Destination Venue"].map(t => (
                                <option key={t} value={t}>{t}</option>
                              ))}
                            </select>
                          </div>

                          {/* City */}
                          <div className="flex flex-col gap-1.5">
                            <label className="font-bold text-stone-500 uppercase tracking-wider">City *</label>
                            <input
                              type="text" value={venueForm.city} required
                              onChange={e => setVenueForm(p => ({ ...p, city: e.target.value }))}
                              placeholder="e.g. Mumbai"
                              className={`border rounded-xl px-4 py-2.5 outline-none font-semibold ${isDarkMode ? "bg-stone-950 border-stone-800 text-stone-200" : "bg-white border-stone-200 text-stone-800"
                                }`}
                              minLength={2}
                              maxLength={50}
                            />
                          </div>

                          {/* Location / Address */}
                          <div className="flex flex-col gap-1.5">
                            <label className="font-bold text-stone-500 uppercase tracking-wider">Location / Address</label>
                            <input
                              type="text" value={venueForm.location}
                              onChange={e => setVenueForm(p => ({ ...p, location: e.target.value }))}
                              placeholder="e.g. Andheri West"
                              className={`border rounded-xl px-4 py-2.5 outline-none font-semibold ${isDarkMode ? "bg-stone-950 border-stone-800 text-stone-200" : "bg-white border-stone-200 text-stone-800"
                                }`}
                              maxLength={255}
                            />
                          </div>

                          {/* Contact Phone */}
                          <div className="flex flex-col gap-1.5">
                            <label className="font-bold text-stone-500 uppercase tracking-wider">Contact Phone</label>
                            <PhoneInput
                              value={venueForm.contactPhone}
                              onChange={val => setVenueForm(p => ({ ...p, contactPhone: val }))}
                              placeholder="e.g. +91 9876543210"
                              className={`border rounded-xl outline-none font-semibold ${isDarkMode ? "bg-stone-950 border-stone-800 text-stone-200" : "bg-white border-stone-200 text-stone-800"
                                }`}
                            />
                          </div>

                          {/* Map Link */}
                          <div className="flex flex-col gap-1.5">
                            <label className="font-bold text-stone-500 uppercase tracking-wider">Google Map Link</label>
                            <input
                              type="url" value={venueForm.mapLink}
                              onChange={e => setVenueForm(p => ({ ...p, mapLink: e.target.value }))}
                              placeholder="e.g. https://maps.google.com/..."
                              className={`border rounded-xl px-4 py-2.5 outline-none font-semibold ${isDarkMode ? "bg-stone-950 border-stone-800 text-stone-200" : "bg-white border-stone-200 text-stone-800"
                                }`}
                              maxLength={255}
                            />
                          </div>

                          {/* Price */}
                          <div className="flex flex-col gap-1.5">
                            <label className="font-bold text-stone-500 uppercase tracking-wider">Starting Price</label>
                            <input
                              value={venueForm.price}
                              onChange={e => setVenueForm(p => ({ ...p, price: e.target.value }))}
                              placeholder="e.g. 50000"
                              className={`border rounded-xl px-4 py-2.5 outline-none font-semibold ${isDarkMode ? "bg-stone-950 border-stone-800 text-stone-200" : "bg-white border-stone-200 text-stone-800"
                                }`}
                              type="number"
                              min={0}
                              max={100000000}
                            />
                          </div>

                          {/* Price Unit */}
                          <div className="flex flex-col gap-1.5">
                            <label className="font-bold text-stone-500 uppercase tracking-wider">Price Unit</label>
                            <select
                              value={venueForm.priceUnit}
                              onChange={e => setVenueForm(p => ({ ...p, priceUnit: e.target.value }))}
                              className={`border rounded-xl px-4 py-2.5 outline-none font-semibold ${isDarkMode ? "bg-stone-950 border-stone-800 text-stone-200" : "bg-white border-stone-200 text-stone-800"
                                }`}
                            >
                              {["per day", "per night", "per plate", "per person", "per event"].map(u => (
                                <option key={u} value={u}>{u}</option>
                              ))}
                            </select>
                          </div>

                          {/* Price Per Plate Veg */}
                          <div className="flex flex-col gap-1.5">
                            <label className="font-bold text-stone-500 uppercase tracking-wider">Price/Plate (Veg)</label>
                            <input
                              type="text" value={venueForm.pricePerPlateVeg}
                              onChange={e => setVenueForm(p => ({ ...p, pricePerPlateVeg: e.target.value }))}
                              placeholder="e.g. 800"
                              className={`border rounded-xl px-4 py-2.5 outline-none font-semibold ${isDarkMode ? "bg-stone-950 border-stone-800 text-stone-200" : "bg-white border-stone-200 text-stone-800"
                                }`}
                            />
                          </div>

                          {/* Price Per Plate Non-Veg */}
                          <div className="flex flex-col gap-1.5">
                            <label className="font-bold text-stone-500 uppercase tracking-wider">Price/Plate (Non-Veg)</label>
                            <input
                              type="text" value={venueForm.pricePerPlateNonVeg}
                              onChange={e => setVenueForm(p => ({ ...p, pricePerPlateNonVeg: e.target.value }))}
                              placeholder="e.g. 1200"
                              className={`border rounded-xl px-4 py-2.5 outline-none font-semibold ${isDarkMode ? "bg-stone-950 border-stone-800 text-stone-200" : "bg-white border-stone-200 text-stone-800"
                                }`}
                            />
                          </div>

                          {/* Min Guests */}
                          <div className="flex flex-col gap-1.5">
                            <label className="font-bold text-stone-500 uppercase tracking-wider">Min Guests</label>
                            <input
                              type="number" min="1" value={venueForm.minGuests}
                              onChange={e => setVenueForm(p => ({ ...p, minGuests: e.target.value }))}
                              className={`border rounded-xl px-4 py-2.5 outline-none font-semibold ${isDarkMode ? "bg-stone-950 border-stone-800 text-stone-200" : "bg-white border-stone-200 text-stone-800"
                                }`}
                            />
                          </div>

                          {/* Max Guests */}
                          <div className="flex flex-col gap-1.5">
                            <label className="font-bold text-stone-500 uppercase tracking-wider">Max Guests</label>
                            <input
                              type="number" min="1" value={venueForm.maxGuests}
                              onChange={e => setVenueForm(p => ({ ...p, maxGuests: e.target.value }))}
                              className={`border rounded-xl px-4 py-2.5 outline-none font-semibold ${isDarkMode ? "bg-stone-950 border-stone-800 text-stone-200" : "bg-white border-stone-200 text-stone-800"
                                }`}
                            />
                          </div>

                          {/* Rooms */}
                          <div className="flex flex-col gap-1.5">
                            <label className="font-bold text-stone-500 uppercase tracking-wider">Number of Rooms</label>
                            <input
                              type="number" min="0" value={venueForm.rooms}
                              onChange={e => setVenueForm(p => ({ ...p, rooms: e.target.value }))}
                              className={`border rounded-xl px-4 py-2.5 outline-none font-semibold ${isDarkMode ? "bg-stone-950 border-stone-800 text-stone-200" : "bg-white border-stone-200 text-stone-800"
                                }`}
                            />
                          </div>

                          {/* Features */}
                          <div className="flex flex-col gap-1.5">
                            <label className="font-bold text-stone-500 uppercase tracking-wider">Features (comma-separated)</label>
                            <input
                              type="text" value={venueForm.features}
                              onChange={e => setVenueForm(p => ({ ...p, features: e.target.value }))}
                              placeholder="Swimming Pool, Lawn, AV System, Bridal Suite"
                              className={`border rounded-xl px-4 py-2.5 outline-none font-semibold ${isDarkMode ? "bg-stone-950 border-stone-800 text-stone-200" : "bg-white border-stone-200 text-stone-800"
                                }`}
                            />
                          </div>

                        </div>

                        {/* ── Main Image ── */}
                        <div className="mt-5 flex flex-col gap-1.5 md:col-span-2">
                          <label className="font-bold text-stone-500 uppercase tracking-wider">Preview Card Image</label>
                          <ImageUploadInput
                            value={venueForm.image}
                            onChange={(val) => setVenueForm(p => ({ ...p, image: val }))}
                            placeholder="e.g. /soulswed/venue.jpg or upload one"
                            isDarkMode={isDarkMode}
                          />
                        </div>

                        {/* ── Amenities toggles ── */}
                        <div className="mt-5 text-xs">
                          <label className="font-bold text-stone-500 uppercase tracking-wider block mb-3">Amenities</label>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {(["outdoor", "indoor", "parking", "catering"] as const).map(key => (
                              <button
                                key={key}
                                type="button"
                                onClick={() => setVenueForm(p => ({ ...p, [key]: !p[key] }))}
                                className={`flex items-center justify-between px-4 py-2.5 rounded-xl border font-bold capitalize cursor-pointer transition-all ${venueForm[key]
                                  ? "bg-primary-500 border-primary-500 text-white"
                                  : isDarkMode
                                    ? "border-stone-700 text-stone-400 hover:border-stone-600"
                                    : "border-stone-200 text-stone-500 hover:border-stone-300"
                                  }`}
                              >
                                <span>{key}</span>
                                <span className={`w-2.5 h-2.5 rounded-full ${venueForm[key] ? "bg-white" : isDarkMode ? "bg-stone-700" : "bg-stone-200"
                                  }`} />
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* ── Additional Media ── */}
                        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
                          {/* Hero Image */}
                          <div className="flex flex-col gap-1.5 md:col-span-2">
                            <label className="font-bold text-stone-500 uppercase tracking-wider">Hero Banner Image URL</label>
                            <ImageUploadInput
                              value={venueForm.heroImage}
                              onChange={(val) => setVenueForm(p => ({ ...p, heroImage: val }))}
                              placeholder="URL of a large, high-quality image"
                              isDarkMode={isDarkMode}
                            />
                          </div>

                          {/* Gallery */}
                          <div className="flex flex-col gap-1.5 md:col-span-2">
                            <label className="font-bold text-stone-500 uppercase tracking-wider">Gallery Photos</label>
                            <MediaGalleryInput
                              mode="image"
                              items={venueForm.gallery}
                              onChange={(items) => setVenueForm(p => ({ ...p, gallery: items }))}
                              mainItem={venueForm.image}
                              onSetMain={(url) => setVenueForm(p => ({ ...p, image: url }))}
                              isDarkMode={isDarkMode}
                            />
                          </div>

                          {/* Videos */}
                          <div className="flex flex-col gap-1.5 md:col-span-2">
                            <label className="font-bold text-stone-500 uppercase tracking-wider">Videos</label>
                            <MediaGalleryInput
                              mode="video"
                              items={venueForm.videos}
                              onChange={(items) => setVenueForm(p => ({ ...p, videos: items }))}
                              isDarkMode={isDarkMode}
                              max={10}
                            />
                          </div>
                        </div>

                        {/* ── Description ── */}
                        <div className="mt-5 flex flex-col gap-1.5 text-xs">
                          <label className="font-bold text-stone-500 uppercase tracking-wider">Description</label>
                          <textarea
                            value={venueForm.description} rows={4}
                            onChange={e => setVenueForm(p => ({ ...p, description: e.target.value }))}
                            placeholder="Describe your venue — ambiance, specialties, what makes it perfect for weddings."
                            className={`border rounded-xl px-4 py-2.5 outline-none font-semibold resize-none ${isDarkMode ? "bg-stone-950 border-stone-800 text-stone-200" : "bg-white border-stone-200 text-stone-800"
                              }`}
                          />
                        </div>

                        {/* ── Save button ── */}
                        <div className="mt-6 flex items-center gap-3">
                          <button
                            onClick={() => handleSaveVenue(false)}
                            disabled={savingVenue}
                            className="flex items-center gap-2 px-6 py-3 rounded-full bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white text-xs font-bold cursor-pointer transition-all"
                          >
                            {savingVenue ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> :
                              venueView === "add" ? "Submit for Review" : "Save Changes"}
                          </button>
                          <p className="text-[10px] text-stone-400">
                            {venueView === "add"
                              ? "New venues are inactive until an admin reviews and activates them."
                              : "Changes are saved immediately and visible on the public listing."}
                          </p>
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ── VENUE GRID ── */}
                {venues.length === 0 ? (
                  <div className={`rounded-3xl border p-12 flex flex-col items-center justify-center text-center shadow-none ${cardClass}`}>
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${isDarkMode ? "bg-stone-800" : "bg-stone-100"
                      }`}>
                      <Building2 className="w-6 h-6" />
                    </div>
                    <h4 className={`font-bold text-sm mb-1 ${headingText}`}>No venues yet</h4>
                    <p className="text-[11px] text-stone-400 max-w-xs mb-5">
                      Add your first venue listing — it will go to admin for review before going live.
                    </p>
                    <button
                      onClick={openAddVenue}
                      className="flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-primary-500 hover:bg-primary-600 text-white text-xs font-bold cursor-pointer transition-all"
                    >
                      <PlusIcon className="w-3.5 h-3.5" /> Add Your First Venue
                    </button>
                  </div>
                ) : (
                  venueLayout === "grid" ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 xl:gap-8 max-w-6xl">
                      {venues.filter(v => {
                        const val = searchTerm.toLowerCase();
                        return !val || (v.name || "").toLowerCase().includes(val) || (v.city || "").toLowerCase().includes(val) || (v.type || "").toLowerCase().includes(val);
                      }).map((venue) => {
                        const thumb = venue.image || (venue.gallery && venue.gallery[0]) || "";
                        const price = venue.price || venue.pricePerPlateVeg || "—";
                        const rating = venue.rating || 0;
                        return (
                          <div key={venue._id} className="group h-[460px] sm:h-[500px] lg:h-[520px]">
                            <ListingCard
                              name={venue.name}
                              image={thumb}
                              location={`${venue.location || venue.city}${venue.country ? `, ${venue.country}` : ""}`}
                              rating={rating}
                              reviewCount={venue.reviewCount}
                              priceDisplay={`₹${Number(price).toLocaleString("en-IN") || "—"}`}
                              unit={`/${venue.priceUnit || "per day"}`}
                              priceLabel="starting from"
                              badge={
                                venue.featured ? (
                                  <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold text-white shadow-sm" style={{ background: "var(--sw-primary)" }}>
                                    <Star className="w-3 h-3 inline-block" /> Featured
                                  </div>
                                ) : undefined
                              }
                              topRight={
                                <span className={`text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-wide shadow-sm ${venue.active ? "bg-emerald-500 text-white" : "bg-amber-400 text-white"}`}>
                                  {venue.active ? "Live" : "Pending"}
                                </span>
                              }
                              tags={
                                <>
                                  <CardTag><UsersIcon className="w-3 h-3" /> {venue.minGuests || 50}–{venue.maxGuests || 500} pax</CardTag>
                                  <CardTag><BedDouble className="w-3 h-3" /> {venue.rooms || 0} Rooms</CardTag>
                                  <CardTag tone="accent">{venue.type || "Venue"}</CardTag>
                                </>
                              }
                              action={
                                <div className="flex gap-2">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDeleteConfirmation({ isOpen: true, type: 'venue', id: venue._id, apiId: venue.venueId, name: venue.name });
                                    }}
                                    className="flex items-center justify-center w-9 h-9 rounded-full text-red-500 dark:text-red-400 bg-white/90 dark:bg-white/10 hover:bg-red-500 hover:text-white transition-all cursor-pointer shadow-sm"
                                    title="Delete Venue"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => openEditVenue(venue)}
                                    className="text-[13px] font-bold px-4 py-2.5 rounded-full text-white bg-primary-500 hover:bg-primary-600 transition-all cursor-pointer flex items-center gap-1 shadow-sm whitespace-nowrap"
                                  >
                                    Edit <Edit2 className="w-3 h-3 inline-block" />
                                  </button>
                                </div>
                              }
                            />
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {venues.filter(v => {
                        const val = searchTerm.toLowerCase();
                        return !val || (v.name || "").toLowerCase().includes(val) || (v.city || "").toLowerCase().includes(val) || (v.type || "").toLowerCase().includes(val);
                      }).map((venue) => {
                        const thumb = venue.image || (venue.gallery && venue.gallery[0]) || "";
                        const price = venue.price || venue.pricePerPlateVeg || "—";
                        const rating = venue.rating || 0;
                        return (
                          <div key={venue._id} className={`flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl border transition-all hover:border-primary-500/30 ${isDarkMode ? "bg-stone-900/60 border-stone-800" : "bg-white border-stone-200"}`}>
                            <div className="w-full sm:w-40 h-28 rounded-xl overflow-hidden shrink-0 relative">
                               {thumb ? (
                                 <img src={thumb} alt={venue.name} className="w-full h-full object-cover" />
                               ) : (
                                 <div className={`w-full h-full flex items-center justify-center ${isDarkMode ? "bg-stone-800 text-stone-500" : "bg-stone-100 text-stone-400"}`}>
                                   <Building2 className="w-6 h-6 opacity-50" />
                                 </div>
                               )}
                               <span className={`absolute top-2 left-2 text-[8px] font-black px-2 py-0.5 rounded-full uppercase shadow-sm ${venue.active ? "bg-emerald-500 text-white" : "bg-amber-400 text-white"}`}>
                                 {venue.active ? "Live" : "Pending"}
                               </span>
                            </div>
                            <div className="flex-1 min-w-0 w-full">
                               <div className="flex items-start justify-between gap-4">
                                 <div>
                                   <h4 className={`font-bold text-base truncate ${headingText}`}>{venue.name}</h4>
                                   <p className="text-xs text-stone-500 flex items-center gap-1 mt-1 truncate">
                                     <MapPinIcon className="w-3 h-3" /> {`${venue.location || venue.city}${venue.country ? `, ${venue.country}` : ""}`}
                                   </p>
                                 </div>
                                 <div className="text-right shrink-0 hidden sm:block">
                                   <div className="text-xs text-stone-500">starting from</div>
                                   <div className={`font-black text-lg ${isDarkMode ? "text-primary-400" : "text-primary-600"}`}>₹{Number(price).toLocaleString("en-IN") || "—"}<span className="text-xs text-stone-500 font-medium">/{venue.priceUnit || "per day"}</span></div>
                                 </div>
                               </div>
                               <div className="flex items-center gap-3 mt-4 flex-wrap">
                                 <span className="text-[11px] font-semibold px-2.5 py-1 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 flex items-center gap-1.5"><UsersIcon className="w-3.5 h-3.5 text-stone-400" /> {venue.minGuests || 50}–{venue.maxGuests || 500} pax</span>
                                 <span className="text-[11px] font-semibold px-2.5 py-1 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 flex items-center gap-1.5"><BedDouble className="w-3.5 h-3.5 text-stone-400" /> {venue.rooms || 0} Rooms</span>
                                 <span className="text-[11px] font-semibold px-2.5 py-1 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 flex items-center gap-1.5">{venue.type || "Venue"}</span>
                               </div>
                            </div>
                            <div className="flex sm:flex-col items-center sm:items-end gap-2 w-full sm:w-auto mt-4 sm:mt-0 pt-4 sm:pt-0 border-t sm:border-l sm:border-t-0 border-stone-100 dark:border-stone-800 sm:pl-4">
                                <button
                                  onClick={() => openEditVenue(venue)}
                                  className="flex-1 sm:flex-none text-[12px] font-bold px-4 py-2 rounded-xl text-white bg-primary-500 hover:bg-primary-600 transition-all cursor-pointer flex justify-center items-center gap-1.5 sm:w-full"
                                >
                                  Edit <Edit2 className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteConfirmation({ isOpen: true, type: 'venue', id: venue._id, apiId: venue.venueId, name: venue.name });
                                  }}
                                  className="flex-1 sm:flex-none text-[12px] font-bold px-4 py-2 rounded-xl text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-500/10 hover:bg-red-500 hover:text-white transition-all cursor-pointer flex justify-center items-center gap-1.5 sm:w-full"
                                >
                                  Delete <Trash2 className="w-3 h-3" />
                                </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )
                )
                }
              </div>
            )}

            {/* SETTINGS SECTION */}
            {activeTab === "settings" && (
              <div className="flex flex-col xl:flex-row gap-8 items-start">

                {/* LEFT: ID CARD */}
                <div className="w-full xl:w-[320px] shrink-0 mx-auto xl:mx-0">
                  <div className="relative w-full h-[520px] rounded-[2rem] overflow-hidden shadow-2xl flex flex-col">
                    {/* Lanyard Hole */}
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 w-16 h-3 bg-black/20 backdrop-blur-md rounded-full z-20 shadow-inner border border-white/10"></div>

                    {/* Card Background gradient */}
                    <div className="absolute inset-0 bg-gradient-to-b from-[#EE7429] to-[#FCCB11] opacity-95"></div>

                    {/* Decorative elements */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-2xl -mr-10 -mt-10"></div>
                    <div className="absolute bottom-0 left-0 w-40 h-40 bg-black/10 rounded-full blur-3xl -ml-10 -mb-10"></div>

                    {/* Content */}
                    <div className="relative z-10 flex flex-col h-full p-6 pt-12">
                      <div className="flex justify-between items-start mb-6 text-white">
                        <div>
                          <h2 className="font-black text-xl tracking-tight leading-none">SoulsWed</h2>
                          <p className="text-[9px] font-bold tracking-widest uppercase opacity-80 mt-1">Partner Pass</p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-sm">
                          <Star className="w-5 h-5 fill-white" />
                        </div>
                      </div>

                      <div className="flex-1 bg-white dark:bg-stone-900 rounded-2xl p-5 shadow-xl flex flex-col items-center text-center relative border border-stone-100 dark:border-stone-800">
                        <div className="w-20 h-20 rounded-full mb-4 -mt-10 shadow-lg border-4 border-white dark:border-stone-900 z-10 overflow-hidden flex items-center justify-center bg-gradient-to-br from-stone-100 to-stone-200 dark:from-stone-800 dark:to-stone-900">
                          {vendor.profileImage && (vendor.profileImage.startsWith("/") || vendor.profileImage.startsWith("http") || vendor.profileImage.startsWith("data:")) ? (
                            <img src={vendor.profileImage} alt="Profile" className="w-full h-full object-cover" />
                          ) : vendor.profileImage && vendor.profileImage.length <= 10 ? (
                            <span className="text-3xl">{vendor.profileImage}</span>
                          ) : (
                            <span className="text-3xl font-black text-[#EE7429]">{vendor.businessName ? vendor.businessName.charAt(0) : "V"}</span>
                          )}
                        </div>
                        <h3 className="font-black text-lg text-stone-900 dark:text-white leading-tight mb-1">{vendor.businessName}</h3>
                        <p className="text-[10px] font-bold text-[#EE7429] uppercase tracking-widest mb-4 bg-[#EE7429]/10 px-2.5 py-1 rounded-full">{vendor.category || "Vendor"}</p>

                        <div className="w-full space-y-3 text-left mt-2">
                          <div className="bg-stone-50 dark:bg-stone-800/50 p-2.5 rounded-xl border border-stone-100 dark:border-stone-800">
                            <p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest mb-0.5">Representative</p>
                            <p className="text-sm font-semibold text-stone-700 dark:text-stone-300 truncate">{vendor.name}</p>
                          </div>
                          <div className="bg-stone-50 dark:bg-stone-800/50 p-2.5 rounded-xl border border-stone-100 dark:border-stone-800">
                            <p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest mb-0.5">Location</p>
                            <p className="text-sm font-semibold text-stone-700 dark:text-stone-300 truncate">{vendor.city}</p>
                          </div>
                        </div>

                        <div className="mt-auto w-full flex justify-center opacity-40 mix-blend-multiply dark:mix-blend-screen pt-4">
                          <svg viewBox="0 0 100 20" className="w-full h-8">
                            <path d="M0,0 h3 v20 h-3 z M5,0 h1 v20 h-1 z M8,0 h4 v20 h-4 z M14,0 h2 v20 h-2 z M18,0 h1 v20 h-1 z M21,0 h3 v20 h-3 z M26,0 h1 v20 h-1 z M29,0 h4 v20 h-4 z M35,0 h2 v20 h-2 z M39,0 h3 v20 h-3 z M44,0 h1 v20 h-1 z M47,0 h4 v20 h-4 z M53,0 h2 v20 h-2 z M57,0 h1 v20 h-1 z M60,0 h3 v20 h-3 z M65,0 h1 v20 h-1 z M68,0 h4 v20 h-4 z M74,0 h2 v20 h-2 z M78,0 h3 v20 h-3 z M83,0 h1 v20 h-1 z M86,0 h4 v20 h-4 z M92,0 h2 v20 h-2 z M96,0 h4 v20 h-4 z" fill="currentColor" />
                          </svg>
                        </div>
                      </div>

                      <div className="mt-4 flex justify-between items-end">
                        <p className="text-[10px] font-bold text-white/80 tracking-widest font-mono">ID: {String((vendor as any).id || (vendor as any).userId || "VNDR").split('-')[0].substring(0, 8).toUpperCase()}</p>
                        <p className="text-[10px] font-bold text-white/90">VALID 2026</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* RIGHT: ALL SETTINGS PANELS */}
                <div className="flex-1 w-full flex flex-col gap-8">

                  {/* 0. PROFILE AVATAR */}
                  <div className={`rounded-3xl p-6 border shadow-none ${cardClass}`}>
                    <div className={`flex items-center justify-between pb-3 border-b mb-6 ${dividerClass}`}>
                      <h3 className={`font-extrabold text-base ${headingText}`}>Profile Avatar</h3>
                    </div>
                    <AvatarUploader
                      currentImage={vendor.profileImage || ""}
                      userName={vendor.businessName || vendor.name}
                      onAvatarChange={(newImage) => setVendor({ ...vendor, profileImage: newImage })}
                    />
                  </div>

                  {/* 1. BUSINESS SHOWCASE SETTINGS */}
                  <div className={`rounded-3xl p-6 border shadow-none ${cardClass}`}>
                    <div className={`flex items-center justify-between pb-3 border-b mb-6 ${dividerClass}`}>
                      <h3 className={`font-extrabold text-base ${headingText}`}>Business Showcase Settings</h3>
                      <button
                        type="button"
                        onClick={() => setIsEditingProfile(!isEditingProfile)}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[11px] font-black tracking-widest uppercase transition-all shadow-sm ${isEditingProfile ? "bg-stone-200 text-stone-700 hover:bg-stone-300 dark:bg-stone-800 dark:text-stone-300" : "bg-[#EE7429] text-white hover:bg-[#d66825] shadow-[#EE7429]/20"}`}
                      >
                        {isEditingProfile ? <><XIcon className="w-3.5 h-3.5" /> Cancel Edit</> : <><Edit2 className="w-3.5 h-3.5" /> Edit Profile</>}
                      </button>
                    </div>

                    {!isEditingProfile ? (
                      <div className="space-y-6">
                        <div>
                          <h4 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">About Business</h4>
                          <p className="text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
                            {vendor.description || "No description provided. Click Edit Profile to add a description to showcase your business to customers."}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-stone-50 dark:bg-stone-800/30 p-3 rounded-2xl">
                            <h4 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Phone</h4>
                            <p className="text-sm font-semibold">{vendor.phone || "N/A"}</p>
                          </div>
                          <div className="bg-stone-50 dark:bg-stone-800/30 p-3 rounded-2xl">
                            <h4 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Email</h4>
                            <p className="text-sm font-semibold truncate">{vendor.email}</p>
                          </div>
                          <div className="bg-stone-50 dark:bg-stone-800/30 p-3 rounded-2xl">
                            <h4 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Starting Price</h4>
                            <p className="text-sm font-semibold">{vendor.priceFrom ? `₹${vendor.priceFrom.toLocaleString('en-IN')}` : "N/A"}</p>
                          </div>
                          <div className="bg-stone-50 dark:bg-stone-800/30 p-3 rounded-2xl">
                            <h4 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Website</h4>
                            {vendor.website ? (
                              <a href={vendor.website} target="_blank" rel="noreferrer" className="text-sm font-semibold text-primary-500 hover:underline truncate block">{vendor.website}</a>
                            ) : <p className="text-sm font-semibold text-stone-400">N/A</p>}
                          </div>
                        </div>

                        {showcaseImages.length > 0 && (
                          <div>
                            <h4 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">Gallery ({showcaseImages.length})</h4>
                            <div className="grid grid-cols-3 gap-2">
                              {showcaseImages.map((img, i) => (
                                <div key={i} className="aspect-square rounded-xl overflow-hidden border border-stone-200/20">
                                  <img src={img} alt="Gallery" className="w-full h-full object-cover" />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <form onSubmit={handleSaveProfile} className="max-w-2xl flex flex-col gap-5 text-xs animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {profileMessage && (
                          <div className={`rounded-3xl border px-4 py-3 font-bold ${profileMessage.includes("Failed")
                            ? "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/25"
                            : "bg-amber-50 text-amber-800 border-amber-200"
                            }`}>
                            {profileMessage}
                          </div>
                        )}
                        <div className="flex flex-col gap-1.5">
                          <label className="font-bold text-stone-500 uppercase tracking-wider">Brand Name</label>
                          <input
                            type="text"
                            name="businessName"
                            defaultValue={vendor.businessName}
                            className={`border rounded-xl px-4 py-2.5 outline-none font-semibold ${isDarkMode ? "bg-stone-950 border-stone-800 text-stone-200" : "bg-white border-stone-200 text-stone-800"
                              }`}
                            required
                            minLength={2}
                            maxLength={100}
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="flex flex-col gap-1.5">
                            <label className="font-bold text-stone-500 uppercase tracking-wider">Representative</label>
                            <input
                              type="text"
                              name="name"
                              defaultValue={vendor.name}
                              className={`border rounded-xl px-4 py-2.5 outline-none font-semibold ${isDarkMode ? "bg-stone-950 border-stone-800 text-stone-200" : "bg-white border-stone-200 text-stone-800"
                                }`}
                              required
                              minLength={2}
                              maxLength={50}
                            />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="font-bold text-stone-500 uppercase tracking-wider">Phone</label>
                            <PhoneInput
                              name="phone"
                              defaultValue={vendor.phone}
                              className={`border rounded-xl outline-none font-semibold ${isDarkMode ? "bg-stone-950 border-stone-800 text-stone-200" : "bg-white border-stone-200 text-stone-800"}`}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="flex flex-col gap-1.5">
                            <label className="font-bold text-stone-500 uppercase tracking-wider">Category</label>
                            <select
                              name="category"
                              defaultValue={vendor.category}
                              className={`border rounded-xl px-4 py-2.5 outline-none font-semibold ${isDarkMode ? "bg-stone-950 border-stone-800 text-stone-200" : "bg-white border-stone-200 text-stone-800"
                                }`}
                            >
                              {["Venues", "Planners", "Caterers", "Decorators", "Photography", "Rooms"].map((category) => (
                                <option key={category} value={category}>{category}</option>
                              ))}
                            </select>
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="font-bold text-stone-500 uppercase tracking-wider">Base City Location</label>
                            <input
                              type="text"
                              name="city"
                              defaultValue={vendor.city}
                              className={`border rounded-xl px-4 py-2.5 outline-none font-semibold ${isDarkMode ? "bg-stone-950 border-stone-800 text-stone-200" : "bg-white border-stone-200 text-stone-800"
                                }`}
                              required
                              minLength={2}
                              maxLength={50}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="flex flex-col gap-1.5">
                            <label className="font-bold text-stone-500 uppercase tracking-wider">Starting Price (INR)</label>
                            <input
                              type="number"
                              min="0"
                              name="priceFrom"
                              defaultValue={vendor.priceFrom || ""}
                              className={`border rounded-xl px-4 py-2.5 outline-none font-semibold ${isDarkMode ? "bg-stone-950 border-stone-800 text-stone-200" : "bg-white border-stone-200 text-stone-800"
                                }`}
                              max={100000000}
                            />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="font-bold text-stone-500 uppercase tracking-wider">Website</label>
                            <input
                              type="url"
                              name="website"
                              defaultValue={vendor.website}
                              className={`border rounded-xl px-4 py-2.5 outline-none font-semibold ${isDarkMode ? "bg-stone-950 border-stone-800 text-stone-200" : "bg-white border-stone-200 text-stone-800"
                                }`}
                              maxLength={255}
                            />
                          </div>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="font-bold text-stone-500 uppercase tracking-wider">Instagram</label>
                          <input
                            type="url"
                            name="instagram"
                            defaultValue={vendor.instagram}
                            className={`border rounded-xl px-4 py-2.5 outline-none font-semibold ${isDarkMode ? "bg-stone-950 border-stone-800 text-stone-200" : "bg-white border-stone-200 text-stone-800"
                              }`}
                            maxLength={255}
                          />
                        </div>
                        <div className="flex flex-col gap-3">
                          <div className="flex justify-between items-center">
                            <label className="font-bold text-stone-500 uppercase tracking-wider text-xs">Showcase Gallery ({showcaseImages.length}/6)</label>
                            {uploadError && <span className="text-red-500 font-bold text-[10px]">{uploadError}</span>}
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                            {showcaseImages.map((imgUrl, index) => (
                              <div key={index} className="relative aspect-square rounded-3xl overflow-hidden border border-stone-200/20 group">
                                <img
                                  src={imgUrl}
                                  alt={`Preview ${index + 1}`}
                                  className="object-cover w-full h-full"
                                />
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                                  <div className="flex justify-end">
                                    <button
                                      type="button"
                                      onClick={() => removeImage(index)}
                                      className="p-1.5 bg-red-600/95 text-white rounded-xl hover:bg-red-700 transition-colors cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                  <div className="flex justify-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => moveImage(index, "left")}
                                      disabled={index === 0}
                                      className="p-1 bg-white/20 text-white rounded-xl disabled:opacity-30 hover:bg-white/40 cursor-pointer"
                                    >
                                      <ArrowLeftIcon className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => moveImage(index, "right")}
                                      disabled={index === showcaseImages.length - 1}
                                      className="p-1 bg-white/20 text-white rounded-xl disabled:opacity-30 hover:bg-white/40 cursor-pointer"
                                    >
                                      <ArrowRightIcon className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}

                            {showcaseImages.length < 6 && (
                              <label className="relative aspect-square rounded-3xl border-2 border-dashed border-stone-300 dark:border-stone-700 flex flex-col items-center justify-center cursor-pointer hover:border-primary-500 hover:bg-primary-500/5 transition-all text-stone-400 hover:text-primary-500">
                                {uploadingImage ? (
                                  <>
                                    <Loader2 className="w-5 h-5 animate-spin text-primary-500 mb-1" />
                                    <span className="text-[9px] font-bold uppercase tracking-wider">Uploading...</span>
                                  </>
                                ) : (
                                  <>
                                    <PlusIcon className="w-5 h-5 mb-1" />
                                    <span className="text-[9px] font-bold uppercase tracking-wider">Upload Item</span>
                                  </>
                                )}
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={handleImageUpload}
                                  disabled={uploadingImage}
                                  className="hidden"
                                />
                              </label>
                            )}
                          </div>

                          {showcaseImages.length < 6 && (
                            <div className="flex gap-2 mt-1">
                              <input
                                type="url"
                                placeholder="Or paste an image URL here..."
                                id="manual-url-input"
                                className={`flex-1 border rounded-xl px-4 py-2 outline-none font-semibold text-[11px] ${isDarkMode ? "bg-stone-950 border-stone-800 text-stone-200" : "bg-white border-stone-200 text-stone-800"
                                  }`}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    const input = e.currentTarget;
                                    const val = input.value.trim();
                                    if (val) {
                                      if (showcaseImages.length >= 6) {
                                        setUploadError("Maximum of 6 images allowed.");
                                        return;
                                      }
                                      setShowcaseImages((prev) => [...prev, val]);
                                      input.value = "";
                                    }
                                  }
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const input = document.getElementById("manual-url-input") as HTMLInputElement | null;
                                  const val = input?.value.trim();
                                  if (val) {
                                    if (showcaseImages.length >= 6) {
                                      setUploadError("Maximum of 6 images allowed.");
                                      return;
                                    }
                                    setShowcaseImages((prev) => [...prev, val]);
                                    if (input) input.value = "";
                                  }
                                }}
                                className="px-4 py-2 bg-stone-900 dark:bg-stone-800 hover:bg-primary-500 text-white rounded-xl font-bold text-[11px] transition-colors cursor-pointer"
                              >
                                Add URL
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="font-bold text-stone-500 uppercase tracking-wider">Public Description</label>
                          <textarea
                            name="description"
                            defaultValue={vendor.description}
                            rows={4}
                            className={`border rounded-xl px-4 py-2.5 outline-none font-semibold ${isDarkMode ? "bg-stone-950 border-stone-800 text-stone-200" : "bg-white border-stone-200 text-stone-800"
                              }`}
                            placeholder="Describe your services, style, and coverage."
                          />
                        </div>
                        <p className="text-[10px] text-stone-400 font-medium">
                          Saving listing details sends the profile back to admin approval before it appears publicly again.
                        </p>
                        <button
                          type="submit"
                          disabled={savingProfile}
                          className="w-fit rounded-full bg-slate-900 px-6 py-3 text-xs font-bold text-white transition-colors hover:bg-primary-600 disabled:opacity-50"
                        >
                          {savingProfile ? "Saving..." : "Save and Request Approval"}
                        </button>
                      </form>
                    )}
                  </div>

                  {/* 2. UNAVAILABLE DATES */}
                  <div className={`border rounded-3xl overflow-hidden p-6 shadow-none ${cardClass}`}>
                    <div className={`flex justify-between items-center pb-4 border-b mb-6 ${dividerClass}`}>
                      <div>
                        <h3 className={`font-extrabold text-base ${headingText}`}>Unavailable Dates</h3>
                        <p className="text-[10px] text-stone-400 font-semibold mt-0.5">
                          Block dates you're already booked outside the platform. Customers won't be able to book these dates.
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center gap-2">
                        <input
                          type="date"
                          value={newUnavailableDate}
                          onChange={(e) => setNewUnavailableDate(e.target.value)}
                          min={new Date().toISOString().split("T")[0]}
                          className={`border rounded-xl px-4 py-2.5 outline-none font-semibold text-xs ${isDarkMode ? "bg-stone-950 border-stone-800 text-stone-200" : "bg-white border-stone-200 text-stone-800"}`}
                        />
                        <button
                          type="button"
                          onClick={addUnavailableDate}
                          disabled={!newUnavailableDate}
                          className="rounded-full bg-slate-900 px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-primary-600 disabled:opacity-50"
                        >
                          Add
                        </button>
                      </div>

                      {unavailableDates.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {unavailableDates.map((date) => (
                            <span
                              key={date}
                              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-bold ${isDarkMode ? "bg-stone-950 border-stone-800 text-stone-300" : "bg-stone-50 border-stone-200 text-stone-700"}`}
                            >
                              {date}
                              <button
                                type="button"
                                onClick={() => removeUnavailableDate(date)}
                                className="text-stone-400 hover:text-red-500"
                                aria-label={`Remove ${date}`}
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-stone-400 font-semibold">No unavailable dates set.</p>
                      )}

                      {unavailableDatesMessage && (
                        <p className="text-[11px] font-bold text-primary-600">{unavailableDatesMessage}</p>
                      )}

                      <button
                        type="button"
                        onClick={handleSaveUnavailableDates}
                        disabled={savingUnavailableDates}
                        className="w-fit rounded-full bg-slate-900 px-6 py-3 text-xs font-bold text-white transition-colors hover:bg-primary-600 disabled:opacity-50"
                      >
                        {savingUnavailableDates ? "Saving..." : "Save Unavailable Dates"}
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* ACCOUNT SETTINGS SECTION */}
            {activeTab === "account-settings" && (
              <div className="flex flex-col gap-8 max-w-3xl">

                {/* 1. APPEARANCE */}
                <div className={`rounded-3xl p-6 border shadow-none ${cardClass}`}>
                  <div className={`flex items-center justify-between pb-4 border-b mb-6 ${dividerClass}`}>
                    <div>
                      <h3 className={`font-extrabold text-base ${headingText}`}>Appearance</h3>
                      <p className="text-[10px] text-stone-400 font-semibold mt-0.5">Customize the look and feel of your dashboard</p>
                    </div>
                    <Palette className="w-5 h-5 text-stone-300" />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Light Mode Card */}
                    <button
                      type="button"
                      onClick={() => { if (isDarkMode) toggleTheme(); }}
                      className={`group relative flex flex-col items-center gap-4 p-5 rounded-2xl border-2 transition-all duration-300 cursor-pointer ${!isDarkMode
                        ? "border-[#EE7429] bg-gradient-to-br from-orange-50/80 to-amber-50/60 shadow-lg shadow-orange-500/10"
                        : "border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600 hover:shadow-md"
                        }`}
                    >
                      {!isDarkMode && (
                        <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#EE7429] flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        </div>
                      )}
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 ${!isDarkMode
                        ? "bg-[#EE7429] text-white shadow-lg shadow-orange-400/30"
                        : "bg-stone-100 dark:bg-stone-800 text-stone-400 group-hover:bg-stone-200 dark:group-hover:bg-stone-700"
                        }`}>
                        <SunIcon className="w-6 h-6" />
                      </div>
                      {/* Mini preview */}
                      <div className="w-full rounded-xl border border-stone-200 bg-white p-3 space-y-2 transition-all">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-stone-100"></div>
                          <div className="h-2 w-16 rounded-full bg-stone-200"></div>
                        </div>
                        <div className="h-2 w-full rounded-full bg-stone-100"></div>
                        <div className="h-2 w-3/4 rounded-full bg-stone-100"></div>
                      </div>
                      <div className="text-center">
                        <p className={`text-sm font-bold ${!isDarkMode ? "text-[#EE7429]" : "text-stone-600 dark:text-stone-400"}`}>Light</p>
                        <p className="text-[10px] text-stone-400 mt-0.5">Clean & bright</p>
                      </div>
                    </button>

                    {/* Dark Mode Card */}
                    <button
                      type="button"
                      onClick={() => { if (!isDarkMode) toggleTheme(); }}
                      className={`group relative flex flex-col items-center gap-4 p-5 rounded-2xl border-2 transition-all duration-300 cursor-pointer ${isDarkMode
                        ? "border-[#EE7429] bg-gradient-to-br from-stone-800/80 to-stone-900/60 shadow-lg shadow-orange-500/10"
                        : "border-stone-200 hover:border-stone-300 hover:shadow-md"
                        }`}
                    >
                      {isDarkMode && (
                        <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#EE7429] flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        </div>
                      )}
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 ${isDarkMode
                        ? "bg-[#EE7429] text-white shadow-lg shadow-orange-400/30"
                        : "bg-stone-100 text-stone-400 group-hover:bg-stone-200"
                        }`}>
                        <MoonIcon className="w-6 h-6" />
                      </div>
                      {/* Mini preview */}
                      <div className="w-full rounded-xl border border-stone-700 bg-stone-900 p-3 space-y-2 transition-all">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-stone-800"></div>
                          <div className="h-2 w-16 rounded-full bg-stone-700"></div>
                        </div>
                        <div className="h-2 w-full rounded-full bg-stone-800"></div>
                        <div className="h-2 w-3/4 rounded-full bg-stone-800"></div>
                      </div>
                      <div className="text-center">
                        <p className={`text-sm font-bold ${isDarkMode ? "text-[#EE7429]" : "text-stone-600"}`}>Dark</p>
                        <p className="text-[10px] text-stone-400 mt-0.5">Easy on the eyes</p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* 2. ACCOUNT SECURITY */}
                <div className={`rounded-3xl p-6 border shadow-none ${cardClass}`}>
                  <div className={`flex items-center justify-between pb-4 border-b mb-6 ${dividerClass}`}>
                    <div>
                      <h3 className={`font-extrabold text-base ${headingText}`}>Account Security</h3>
                      <p className="text-[10px] text-stone-400 font-semibold mt-0.5">Manage your vendor account password</p>
                    </div>
                    <Shield className="w-5 h-5 text-stone-300" />
                  </div>

                  <form onSubmit={handleChangePassword} className="space-y-5">
                    <div>
                      <label className="block text-xs font-bold mb-1.5 text-stone-500 uppercase tracking-wider">Current Password</label>
                      <div className="relative">
                        <LockIcon className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
                        <input
                          type="password"
                          required
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className={`w-full pl-9 pr-4 py-2.5 border rounded-xl text-sm outline-none transition-all ${isDarkMode ? "bg-stone-900 border-stone-800 text-stone-200 focus:border-primary-500" : "bg-stone-50 border-stone-200 focus:border-primary-400"}`}
                          placeholder="••••••••"
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider">New Password</label>
                        <button
                          type="button"
                          onClick={generateStrongPassword}
                          className="text-[10px] flex items-center gap-1 font-bold text-primary-600 hover:text-primary-700 transition-colors"
                        >
                          <Wand2 className="h-3 w-3" />
                          Generate Strong
                        </button>
                      </div>
                      <div className="relative">
                        <LockIcon className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          minLength={6}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className={`w-full pl-9 pr-10 py-2.5 border rounded-xl text-sm outline-none transition-all ${isDarkMode ? "bg-stone-900 border-stone-800 text-stone-200 focus:border-primary-500" : "bg-stone-50 border-stone-200 focus:border-primary-400"}`}
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-600 transition-colors"
                        >
                          {showPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                        </button>
                      </div>
                      <p className="text-[10px] text-stone-400 mt-1.5">Minimum 6 characters. Use a mix of letters, numbers, and symbols.</p>
                    </div>

                    {passwordMessage.text && (
                      <div className={`flex items-center gap-2 text-xs font-semibold p-3 rounded-xl ${passwordMessage.type === "error" ? "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-500/20" : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20"}`}>
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        {passwordMessage.text}
                      </div>
                    )}

                    <div className="pt-1">
                      <button
                        type="submit"
                        disabled={isChangingPassword}
                        className="flex items-center gap-2 bg-stone-900 dark:bg-stone-800 hover:bg-primary-600 dark:hover:bg-primary-600 text-white px-6 py-3 rounded-full text-xs font-bold transition-all disabled:opacity-50 shadow-sm"
                      >
                        {isChangingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Save New Password
                      </button>
                    </div>
                  </form>
                </div>

                {/* 3. SIGN OUT */}
                <div className={`rounded-3xl p-6 border shadow-none ${cardClass}`}>
                  <div className={`flex items-center justify-between pb-4 border-b mb-6 ${dividerClass}`}>
                    <div>
                      <h3 className={`font-extrabold text-base ${headingText}`}>Session</h3>
                      <p className="text-[10px] text-stone-400 font-semibold mt-0.5">Sign out of your vendor account on this device</p>
                    </div>
                    <LogOut className="w-5 h-5 text-stone-300" />
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 px-6 py-3 rounded-full text-xs font-bold transition-all border border-red-100 dark:border-red-500/20"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>

              </div>
            )}

            {/* SERVICES SECTION */}
            {activeTab === "services" && selectedCategory !== "venues" && (() => {
              const activeTab = selectedCategory; // override for internal logic
              const currentCat = VENDOR_CATEGORIES.find(c => c.slug === selectedCategory);
              const catLabel = currentCat ? currentCat.name : selectedCategory;
              return (
                <div className={`rounded-3xl p-0 border-0 shadow-none min-h-[400px]`}>
                  <div className={`flex items-center justify-between pb-4 border-b mb-6 ${dividerClass}`}>
                    <h3 className={`font-extrabold text-lg capitalize ${headingText}`}>My {catLabel}</h3>
                    {serviceView === "grid" && (
                      <div className="flex items-center gap-2">
                        <div className={`flex rounded-lg p-1 mr-2 ${isDarkMode ? "bg-stone-800" : "bg-stone-100"}`}>
                          <button 
                            onClick={() => setServiceLayout('grid')}
                            className={`p-1.5 rounded-md transition-all ${serviceLayout === 'grid' ? (isDarkMode ? 'bg-stone-700 shadow-sm text-primary-500' : 'bg-white shadow-sm text-primary-500') : 'text-stone-500 hover:text-stone-700 dark:hover:text-stone-300'}`}
                          >
                            <LayoutDashboard className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => setServiceLayout('list')}
                            className={`p-1.5 rounded-md transition-all ${serviceLayout === 'list' ? (isDarkMode ? 'bg-stone-700 shadow-sm text-primary-500' : 'bg-white shadow-sm text-primary-500') : 'text-stone-500 hover:text-stone-700 dark:hover:text-stone-300'}`}
                          >
                            <ClipboardList className="w-4 h-4" />
                          </button>
                        </div>
                        <button
                          onClick={() => openAddService(activeTab)}
                          className="flex items-center gap-1.5 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-bold text-xs transition-colors shadow-none"
                        >
                          <PlusIcon className="w-3.5 h-3.5" />
                          Add New
                        </button>
                      </div>
                    )}
                  </div>

                  <AnimatePresence>
                    {(serviceView === "add" || serviceView === "edit") && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm"
                      >
                        <motion.div
                          initial={{ scale: 0.95, opacity: 0, y: 10 }}
                          animate={{ scale: 1, opacity: 1, y: 0 }}
                          exit={{ scale: 0.95, opacity: 0, y: 10 }}
                          className={`w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 md:p-8 border shadow-none relative ${cardClass}`}
                          style={{ scrollbarWidth: 'none' }}
                        >
                          <button
                            onClick={() => setServiceView("grid")}
                            className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full bg-stone-100 hover:bg-stone-200 dark:hover:bg-stone-800 dark:hover:bg-stone-700 text-stone-500 transition-colors z-10 cursor-pointer"
                          >
                            <XIcon className="w-3.5 h-3.5" />
                          </button>
                          
                          <h3 className={`font-extrabold text-lg mb-6 ${headingText}`}>
                            {serviceView === "add" ? `Add New ${activeTab}` : `Edit ${activeTab}: ${editingService?.name}`}
                          </h3>

                          {serviceMessage && (
                            <div className={`mb-5 rounded-3xl px-4 py-3 text-xs font-bold border ${serviceMessage.includes("Failed") || serviceMessage.includes("required")
                              ? "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/25"
                              : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/25"
                              }`}>{serviceMessage}</div>
                          )}

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
                            <div className="flex flex-col gap-1.5">
                              <label className="font-bold text-stone-500 uppercase tracking-wider">Service Name *</label>
                              <input
                                type="text" value={serviceForm.name} required
                                onChange={e => setServiceForm({ ...serviceForm, name: e.target.value })}
                                placeholder="e.g. Royal Catering"
                                className={`border rounded-xl px-4 py-2.5 outline-none font-semibold ${isDarkMode ? "bg-stone-950 border-stone-800 text-stone-200" : "bg-white border-stone-200 text-stone-800"}`}
                                minLength={2}
                                maxLength={100}
                              />
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <label className="font-bold text-stone-500 uppercase tracking-wider">City *</label>
                              <input
                                type="text" value={serviceForm.city} required
                                onChange={e => setServiceForm({ ...serviceForm, city: e.target.value })}
                                placeholder="e.g. Mumbai"
                                className={`border rounded-xl px-4 py-2.5 outline-none font-semibold ${isDarkMode ? "bg-stone-950 border-stone-800 text-stone-200" : "bg-white border-stone-200 text-stone-800"}`}
                                minLength={2}
                                maxLength={50}
                              />
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <label className="font-bold text-stone-500 uppercase tracking-wider">Location / Address</label>
                              <input
                                type="text" value={serviceForm.location}
                                onChange={e => setServiceForm({ ...serviceForm, location: e.target.value })}
                                placeholder="e.g. Andheri West"
                                className={`border rounded-xl px-4 py-2.5 outline-none font-semibold ${isDarkMode ? "bg-stone-950 border-stone-800 text-stone-200" : "bg-white border-stone-200 text-stone-800"}`}
                                maxLength={255}
                              />
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <label className="font-bold text-stone-500 uppercase tracking-wider">Contact Phone</label>
                              <PhoneInput
                                value={serviceForm.contactPhone}
                                onChange={val => setServiceForm({ ...serviceForm, contactPhone: val })}
                                placeholder="e.g. +91 9876543210"
                                className={`border rounded-xl outline-none font-semibold ${isDarkMode ? "bg-stone-950 border-stone-800 text-stone-200" : "bg-white border-stone-200 text-stone-800"}`}
                              />
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <label className="font-bold text-stone-500 uppercase tracking-wider">Google Map Link</label>
                              <input
                                type="url" value={serviceForm.mapLink}
                                onChange={e => setServiceForm({ ...serviceForm, mapLink: e.target.value })}
                                placeholder="e.g. https://maps.google.com/..."
                                className={`border rounded-xl px-4 py-2.5 outline-none font-semibold ${isDarkMode ? "bg-stone-950 border-stone-800 text-stone-200" : "bg-white border-stone-200 text-stone-800"}`}
                                maxLength={255}
                              />
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <label className="font-bold text-stone-500 uppercase tracking-wider">Starting Price (₹)</label>
                              <input
                                type="number" value={serviceForm.priceFrom}
                                onChange={e => setServiceForm({ ...serviceForm, priceFrom: e.target.value })}
                                className={`border rounded-xl px-4 py-2.5 outline-none font-semibold ${isDarkMode ? "bg-stone-950 border-stone-800 text-stone-200" : "bg-white border-stone-200 text-stone-800"}`}
                                min={0}
                                max={100000000}
                              />
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <label className="font-bold text-stone-500 uppercase tracking-wider">Price Unit</label>
                              <select
                                value={serviceForm.priceUnit}
                                onChange={e => setServiceForm({ ...serviceForm, priceUnit: e.target.value })}
                                className={`border rounded-xl px-4 py-2.5 outline-none font-semibold ${isDarkMode ? "bg-stone-950 border-stone-800 text-stone-200" : "bg-white border-stone-200 text-stone-800"}`}
                              >
                                <option value="per event">per event</option>
                                <option value="per day">per day</option>
                                <option value="per plate">per plate</option>
                              </select>
                            </div>
                            {/* Detailed Pricing & Capacity */}
                            <div className="flex flex-col gap-1.5">
                              <label className="font-bold text-stone-500 uppercase tracking-wider">Price/Plate (Veg)</label>
                              <input
                                type="number" value={serviceForm.pricePerPlateVeg}
                                onChange={e => setServiceForm({ ...serviceForm, pricePerPlateVeg: e.target.value })}
                                placeholder="e.g. 800"
                                className={`border rounded-xl px-4 py-2.5 outline-none font-semibold ${isDarkMode ? "bg-stone-950 border-stone-800 text-stone-200" : "bg-white border-stone-200 text-stone-800"}`}
                                min={0}
                                max={100000000}
                              />
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <label className="font-bold text-stone-500 uppercase tracking-wider">Price/Plate (Non-Veg)</label>
                              <input
                                type="number" value={serviceForm.pricePerPlateNonVeg}
                                onChange={e => setServiceForm({ ...serviceForm, pricePerPlateNonVeg: e.target.value })}
                                placeholder="e.g. 1200"
                                className={`border rounded-xl px-4 py-2.5 outline-none font-semibold ${isDarkMode ? "bg-stone-950 border-stone-800 text-stone-200" : "bg-white border-stone-200 text-stone-800"}`}
                                min={0}
                                max={100000000}
                              />
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <label className="font-bold text-stone-500 uppercase tracking-wider">Min Guests</label>
                              <input
                                type="number" min="1" max={100000} value={serviceForm.minGuests}
                                onChange={e => setServiceForm({ ...serviceForm, minGuests: e.target.value })}
                                className={`border rounded-xl px-4 py-2.5 outline-none font-semibold ${isDarkMode ? "bg-stone-950 border-stone-800 text-stone-200" : "bg-white border-stone-200 text-stone-800"}`}
                              />
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <label className="font-bold text-stone-500 uppercase tracking-wider">Max Guests</label>
                              <input
                                type="number" min="1" max={100000} value={serviceForm.maxGuests}
                                onChange={e => setServiceForm({ ...serviceForm, maxGuests: e.target.value })}
                                className={`border rounded-xl px-4 py-2.5 outline-none font-semibold ${isDarkMode ? "bg-stone-950 border-stone-800 text-stone-200" : "bg-white border-stone-200 text-stone-800"}`}
                              />
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <label className="font-bold text-stone-500 uppercase tracking-wider">Number of Rooms</label>
                              <input
                                type="number" min="0" max={10000} value={serviceForm.rooms}
                                onChange={e => setServiceForm({ ...serviceForm, rooms: e.target.value })}
                                className={`border rounded-xl px-4 py-2.5 outline-none font-semibold ${isDarkMode ? "bg-stone-950 border-stone-800 text-stone-200" : "bg-white border-stone-200 text-stone-800"}`}
                              />
                            </div>
                            {/* ── Main Image ── */}
                            <div className="flex flex-col gap-1.5 md:col-span-2 mt-4">
                              <label className="font-bold text-stone-500 uppercase tracking-wider">Preview Card Image</label>
                              <ImageUploadInput
                                value={serviceForm.image}
                                onChange={(val) => setServiceForm(p => ({ ...p, image: val }))}
                                placeholder="e.g. /soulswed/vendors/1128.webp or upload one"
                                isDarkMode={isDarkMode}
                              />
                            </div>

                            {/* ── Amenities toggles ── */}
                            <div className="md:col-span-2 mt-2 text-xs">
                              <label className="font-bold text-stone-500 uppercase tracking-wider block mb-3">Amenities</label>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {(["outdoor", "indoor", "parking", "catering"] as const).map(key => (
                                  <button
                                    key={key}
                                    type="button"
                                    onClick={() => setServiceForm(p => ({ ...p, [key]: !p[key as keyof ServiceFormState] }))}
                                    className={`flex items-center justify-between px-4 py-2.5 rounded-xl border font-bold capitalize cursor-pointer transition-all ${serviceForm[key as keyof ServiceFormState]
                                      ? "bg-primary-500 border-primary-500 text-white"
                                      : isDarkMode
                                        ? "border-stone-700 text-stone-400 hover:border-stone-600"
                                        : "border-stone-200 text-stone-500 hover:border-stone-300"
                                      }`}
                                  >
                                    <span>{key}</span>
                                    <span className={`w-2.5 h-2.5 rounded-full ${serviceForm[key as keyof ServiceFormState] ? "bg-white" : isDarkMode ? "bg-stone-700" : "bg-stone-200"
                                      }`} />
                                  </button>
                                ))}
                              </div>
                            </div>
                            
                            <div className="flex flex-col gap-1.5 md:col-span-2 mt-3">
                              <label className="font-bold text-stone-500 uppercase tracking-wider">Hero Banner Image URL</label>
                              <ImageUploadInput
                                value={serviceForm.heroImage}
                                onChange={(val) => setServiceForm(p => ({ ...p, heroImage: val }))}
                                placeholder="URL of a large, high-quality image"
                                isDarkMode={isDarkMode}
                              />
                            </div>
                            
                            <div className="flex flex-col gap-1.5 md:col-span-2">
                              <label className="font-bold text-stone-500 uppercase tracking-wider">Gallery Photos</label>
                              <MediaGalleryInput
                                mode="image"
                                items={serviceForm.gallery}
                                onChange={(items) => setServiceForm(p => ({ ...p, gallery: items }))}
                                mainItem={serviceForm.image}
                                onSetMain={(url) => setServiceForm(p => ({ ...p, image: url }))}
                                isDarkMode={isDarkMode}
                              />
                            </div>

                            <div className="flex flex-col gap-1.5 md:col-span-2">
                              <label className="font-bold text-stone-500 uppercase tracking-wider">Videos</label>
                              <MediaGalleryInput
                                mode="video"
                                items={serviceForm.videos}
                                onChange={(items) => setServiceForm(p => ({ ...p, videos: items }))}
                                isDarkMode={isDarkMode}
                                max={10}
                              />
                            </div>

                            <div className="flex flex-col gap-1.5 md:col-span-2 mt-3">
                              <label className="font-bold text-stone-500 uppercase tracking-wider">Features (comma-separated)</label>
                              <input
                                type="text" value={serviceForm.features}
                                onChange={e => setServiceForm({ ...serviceForm, features: e.target.value })}
                                placeholder="e.g. Traditional, Modern, Destination Wedding"
                                className={`border rounded-xl px-4 py-2.5 outline-none font-semibold ${isDarkMode ? "bg-stone-950 border-stone-800 text-stone-200" : "bg-white border-stone-200 text-stone-800"}`}
                              />
                            </div>
                            <div className="flex flex-col gap-1.5 md:col-span-2">
                              <label className="font-bold text-stone-500 uppercase tracking-wider">Description</label>
                              <textarea
                                value={serviceForm.description}
                                onChange={e => setServiceForm({ ...serviceForm, description: e.target.value })}
                                rows={4}
                                className={`border rounded-xl px-4 py-2.5 outline-none font-semibold ${isDarkMode ? "bg-stone-950 border-stone-800 text-stone-200" : "bg-white border-stone-200 text-stone-800"}`}
                              />
                            </div>
                          </div>

                          <div className="mt-8 pt-6 border-t flex justify-end gap-3" style={{ borderColor: "var(--sw-light-gray)" }}>
                            <button
                              onClick={() => setServiceView("grid")}
                              className="px-6 py-2.5 rounded-full text-xs font-bold text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleSaveService()}
                              disabled={savingService}
                              className="flex items-center gap-2 px-8 py-2.5 rounded-full bg-[var(--sw-primary)] hover:brightness-110 text-white text-xs font-bold cursor-pointer transition-all shadow-md disabled:opacity-50"
                            >
                              {savingService && <Loader2 className="w-4 h-4 animate-spin" />}
                              {savingService ? "Saving..." : "Save Service"}
                            </button>
                          </div>
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>


                  {serviceView === "grid" && (
                    serviceLayout === "grid" ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 xl:gap-8 max-w-6xl">
                        {services.filter(s => s.category === activeTab).filter(s => {
                          const val = searchTerm.toLowerCase();
                          return !val || (s.name || "").toLowerCase().includes(val) || (s.city || "").toLowerCase().includes(val) || (s.category || "").toLowerCase().includes(val);
                        }).length === 0 ? (
                          <div className="col-span-full py-12 flex flex-col items-center justify-center text-center">
                            <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mb-4 border border-stone-200">
                              <ClipboardList className="w-6 h-6 text-stone-400" />
                            </div>
                            <h4 className="font-bold text-stone-800 mb-1">No listings yet</h4>
                            <p className="text-xs text-stone-500 mb-4 max-w-[200px]">{searchTerm ? "No services match your search." : `Create your first ${activeTab} listing to appear in the directory.`}</p>
                          </div>
                        ) : (
                          services.filter(s => s.category === activeTab).filter(s => {
                            const val = searchTerm.toLowerCase();
                            return !val || (s.name || "").toLowerCase().includes(val) || (s.city || "").toLowerCase().includes(val) || (s.category || "").toLowerCase().includes(val);
                          }).map((service) => (
                            <div key={service.serviceId} className="group h-[460px] sm:h-[500px] lg:h-[520px]">
                              <ListingCard
                                name={service.name}
                                image={service.image || ""}
                                location={service.city}
                                rating={service.rating || 0}
                                reviewCount={service.reviewCount}
                                priceDisplay={`₹${service.priceFrom?.toLocaleString("en-IN") || 0}`}
                                unit={service.priceUnit ? `/${service.priceUnit}` : undefined}
                                priceLabel="starting from"
                                badge={
                                  service.featured ? (
                                    <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold text-white shadow-sm" style={{ background: "var(--sw-primary)" }}>
                                      <Star className="w-3 h-3 inline-block" /> Featured
                                    </div>
                                  ) : undefined
                                }
                                topRight={
                                  <span className={`text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-wide shadow-sm ${service.active ? "bg-emerald-500 text-white" : "bg-amber-400 text-white"}`}>
                                    {service.active ? "Live" : "Pending"}
                                  </span>
                                }
                                tags={<CardTag tone="accent">{service.category}</CardTag>}
                                action={
                                  <div className="flex gap-2">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDeleteConfirmation({ isOpen: true, type: 'service', id: service.serviceId, apiId: service.serviceId, name: service.name });
                                      }}
                                      className="flex items-center justify-center w-9 h-9 rounded-full text-red-500 dark:text-red-400 bg-white/90 dark:bg-white/10 hover:bg-red-500 hover:text-white transition-all cursor-pointer shadow-sm"
                                      title="Delete Service"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => openEditService(service)}
                                      className="text-[13px] font-bold px-4 py-2.5 rounded-full text-white bg-primary-500 hover:bg-primary-600 transition-all cursor-pointer flex items-center gap-1 shadow-sm whitespace-nowrap"
                                    >
                                      Edit <Edit2 className="w-3 h-3 inline-block" />
                                    </button>
                                  </div>
                                }
                              />
                            </div>
                          ))
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        {services.filter(s => s.category === activeTab).filter(s => {
                          const val = searchTerm.toLowerCase();
                          return !val || (s.name || "").toLowerCase().includes(val) || (s.city || "").toLowerCase().includes(val) || (s.category || "").toLowerCase().includes(val);
                        }).length === 0 ? (
                          <div className="py-12 flex flex-col items-center justify-center text-center">
                            <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mb-4 border border-stone-200">
                              <ClipboardList className="w-6 h-6 text-stone-400" />
                            </div>
                            <h4 className="font-bold text-stone-800 mb-1">No listings yet</h4>
                            <p className="text-xs text-stone-500 mb-4 max-w-[200px]">{searchTerm ? "No services match your search." : `Create your first ${activeTab} listing to appear in the directory.`}</p>
                          </div>
                        ) : (
                          services.filter(s => s.category === activeTab).filter(s => {
                            const val = searchTerm.toLowerCase();
                            return !val || (s.name || "").toLowerCase().includes(val) || (s.city || "").toLowerCase().includes(val) || (s.category || "").toLowerCase().includes(val);
                          }).map((service) => {
                            const thumb = service.image || "";
                            return (
                              <div key={service.serviceId} className={`flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl border transition-all hover:border-primary-500/30 ${isDarkMode ? "bg-stone-900/60 border-stone-800" : "bg-white border-stone-200"}`}>
                                <div className="w-full sm:w-40 h-28 rounded-xl overflow-hidden shrink-0 relative">
                                   {thumb ? (
                                     <img src={thumb} alt={service.name} className="w-full h-full object-cover" />
                                   ) : (
                                     <div className={`w-full h-full flex items-center justify-center ${isDarkMode ? "bg-stone-800 text-stone-500" : "bg-stone-100 text-stone-400"}`}>
                                       <ClipboardList className="w-6 h-6 opacity-50" />
                                     </div>
                                   )}
                                   <span className={`absolute top-2 left-2 text-[8px] font-black px-2 py-0.5 rounded-full uppercase shadow-sm ${service.active ? "bg-emerald-500 text-white" : "bg-amber-400 text-white"}`}>
                                     {service.active ? "Live" : "Pending"}
                                   </span>
                                </div>
                                <div className="flex-1 min-w-0 w-full">
                                   <div className="flex items-start justify-between gap-4">
                                     <div>
                                       <h4 className={`font-bold text-base truncate ${headingText}`}>{service.name}</h4>
                                       <p className="text-xs text-stone-500 flex items-center gap-1 mt-1 truncate">
                                         <MapPinIcon className="w-3 h-3" /> {service.city}
                                       </p>
                                     </div>
                                     <div className="text-right shrink-0 hidden sm:block">
                                       <div className="text-xs text-stone-500">starting from</div>
                                       <div className={`font-black text-lg ${isDarkMode ? "text-primary-400" : "text-primary-600"}`}>₹{service.priceFrom?.toLocaleString("en-IN") || 0}<span className="text-xs text-stone-500 font-medium">/{service.priceUnit || "per event"}</span></div>
                                     </div>
                                   </div>
                                   <div className="flex items-center gap-3 mt-4 flex-wrap">
                                     <span className="text-[11px] font-semibold px-2.5 py-1 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 flex items-center gap-1.5">{service.category}</span>
                                   </div>
                                </div>
                                <div className="flex sm:flex-col items-center sm:items-end gap-2 w-full sm:w-auto mt-4 sm:mt-0 pt-4 sm:pt-0 border-t sm:border-l sm:border-t-0 border-stone-100 dark:border-stone-800 sm:pl-4">
                                    <button
                                      onClick={() => openEditService(service)}
                                      className="flex-1 sm:flex-none text-[12px] font-bold px-4 py-2 rounded-xl text-white bg-primary-500 hover:bg-primary-600 transition-all cursor-pointer flex justify-center items-center gap-1.5 sm:w-full"
                                    >
                                      Edit <Edit2 className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDeleteConfirmation({ isOpen: true, type: 'service', id: service.serviceId, apiId: service.serviceId, name: service.name });
                                      }}
                                      className="flex-1 sm:flex-none text-[12px] font-bold px-4 py-2 rounded-xl text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-500/10 hover:bg-red-500 hover:text-white transition-all cursor-pointer flex justify-center items-center gap-1.5 sm:w-full"
                                    >
                                      Delete <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )
                  )}
                </div>
              )
            })()}


          </motion.div>
        </AnimatePresence>
      </div>



      {/* Delete Confirmation Modal */}
      {mounted && deleteConfirmation?.isOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-[var(--sw-surface)] rounded-3xl p-6 max-w-sm w-full mx-4 text-center shadow-2xl border border-slate-100 dark:border-white/10 flex flex-col items-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center text-red-500 mb-4 animate-pulse">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-stone-200 mb-1">Delete {deleteConfirmation.type === 'venue' ? 'Venue' : 'Service'}?</h3>
            <p className="text-xs text-slate-500 dark:text-stone-400 mb-6 leading-relaxed">
              Are you sure you want to delete <span className="font-bold text-slate-700 dark:text-stone-300">{deleteConfirmation.name}</span>? This action cannot be undone.
            </p>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => setDeleteConfirmation(null)}
                className="flex-1 bg-slate-100 dark:bg-[var(--sw-surface)]/10 hover:bg-slate-200 text-slate-700 dark:text-stone-300 font-bold py-3 rounded-full text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={isDeletingItem}
                onClick={async () => {
                  setIsDeletingItem(true);
                  try {
                    if (deleteConfirmation.type === 'venue') {
                      const res = await fetch(`/api/venues?venueId=${deleteConfirmation.apiId || deleteConfirmation.id}`, { method: 'DELETE' });
                      if (res.ok) {
                        setVenues(prev => prev.filter(v => v._id !== deleteConfirmation.id && v.venueId !== deleteConfirmation.id));
                      } else {
                        const errData = await res.json().catch(() => ({}));
                        alert(errData.message || "Failed to delete venue.");
                      }
                    } else {
                      const res = await fetch(`/api/services?serviceId=${deleteConfirmation.apiId || deleteConfirmation.id}`, { method: 'DELETE' });
                      if (res.ok) {
                        setServices(prev => prev.filter(v => v.serviceId !== deleteConfirmation.id));
                      } else {
                        const errData = await res.json().catch(() => ({}));
                        alert(errData.message || "Failed to delete service.");
                      }
                    }
                  } catch (error) {
                    alert("An error occurred during deletion.");
                  } finally {
                    setIsDeletingItem(false);
                    setDeleteConfirmation(null);
                  }
                }}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-full text-xs transition-colors shadow-sm shadow-red-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeletingItem ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <PlanOfferModal open={showPlanOffer} onClose={() => setShowPlanOffer(false)} />
    </div>
  );
}
