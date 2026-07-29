"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "@/components/shared/CustomImage";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { formatAsCurrency } from "@/lib/currency";
import { Trash2 } from "lucide-react";
import { Star, Flower2, ClipboardList, BedDouble, Building2, LayoutDashboard, BookOpen, Map, Camera, Brush, UtensilsCrossed, Utensils, Palette, Package, Briefcase, Save, Loader2, Wand2, LogOut, Shield, AlertCircle, SearchX, Mail, Smartphone, Monitor, Tablet, KeyRound } from "lucide-react";
import { UserIcon } from "@/components/ui/user";
import { HomeIcon } from "@/components/ui/home";
import { MapPinIcon } from "@/components/ui/map-pin";
import { HeartIcon } from "@/components/ui/heart";
import { UsersIcon } from "@/components/ui/users";
import { SparklesIcon } from "@/components/ui/sparkles";
import { UserCheckIcon } from "@/components/ui/user-check";
import { HeartHandshakeIcon } from "@/components/ui/heart-handshake";
import { ChevronDownIcon } from "@/components/ui/chevron-down";
import { ChevronRightIcon } from "@/components/ui/chevron-right";
import { SettingsIcon } from "@/components/ui/settings";
import { LockIcon } from "@/components/ui/lock";
import { EyeIcon } from "@/components/ui/eye";
import { EyeOffIcon } from "@/components/ui/eye-off";
import { MoonIcon } from "@/components/ui/moon";
import { SunIcon } from "@/components/ui/sun";
import { SlidersHorizontalIcon } from "@/components/ui/sliders-horizontal";
import { SearchIcon } from "@/components/ui/search";
import { BellIcon } from "@/components/ui/bell";
import { RefreshCWIcon } from "@/components/ui/refresh-cw";
import { WalletIcon } from "@/components/ui/wallet";
import { CalendarCheckIcon } from "@/components/ui/calendar-check";
import { CopyIcon } from "@/components/ui/copy";
import { CheckIcon } from "@/components/ui/check";
import { MenuIcon } from "@/components/ui/menu";
import { XIcon } from "@/components/ui/x";
import { ChevronLeftIcon } from "@/components/ui/chevron-left";
import { PhoneIcon } from "@/components/ui/phone";
import { CalendarDaysIcon } from "@/components/ui/calendar-days";
import ThemeToggle from "@/components/shared/ThemeToggle";
import ListingCard, { CardTag } from "@/components/shared/ListingCard";
import { useTheme } from "@/lib/ThemeContext";
import AvatarUploader from "@/components/shared/AvatarUploader";
import { VENDOR_CATEGORIES } from "@/lib/config/categories";


interface AdminSession {
  id: string;
  name: string;
  email: string;
  role: string;
  profileImage?: string;
}

type TabType = "overview" | "approvals" | "vendors" | "bookings" | "users" | "services" | "inquiries" | "payouts" | "reviews" | "settings";

export default function AdminDashboard() {
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingData, setLoadingData] = useState(false);

  // Tab control & search
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [selectedCategory, setSelectedCategory] = useState("venues");
  const [selectedVendorFilter, setSelectedVendorFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [venueLayout, setVenueLayout] = useState<"grid" | "list">("grid");
  const [serviceLayout, setServiceLayout] = useState<"grid" | "list">("grid");
  const [error, setError] = useState<string | null>(null);

  // Live database data
  const [stats, setStats] = useState<any>(null);
  const [vendors, setVendors] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [venuesList, setVenuesList] = useState<any[]>([]);
  const [servicesList, setServicesList] = useState<any[]>([]);
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [payoutsData, setPayoutsData] = useState<any>(null);
  const [reviewsList, setReviewsList] = useState<any[]>([]);
  const [inquiryStatusFilter, setInquiryStatusFilter] = useState<string>("all");

  // CopyIcon state for feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { isDark: isDarkMode, toggleTheme } = useTheme();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [servicesExpanded, setServicesExpanded] = useState(false);

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
      const res = await fetch("/api/admin/settings/password", {
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


  const fetchAllData = async () => {
    setLoadingData(true);
    setError(null);
    try {
      const [statsRes, vendorsRes, bookingsRes, usersRes, venuesRes, servicesRes, inquiriesRes, payoutsRes, reviewsRes] = await Promise.all([
        fetch("/api/admin/stats"),
        fetch("/api/admin/vendors"),
        fetch("/api/admin/bookings"),
        fetch("/api/admin/users"),
        fetch("/api/venues?limit=100"),
        fetch("/api/services?limit=500"),
        fetch("/api/admin/inquiries"),
        fetch("/api/admin/payouts"),
        fetch("/api/admin/reviews"),
      ]);

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.stats);
      } else {
        throw new Error("Failed to load statistics.");
      }

      if (vendorsRes.ok) {
        const data = await vendorsRes.json();
        setVendors(data.vendors || []);
      }

      if (bookingsRes.ok) {
        const data = await bookingsRes.json();
        setBookings(data.bookings || []);
      }

      if (usersRes.ok) {
        const data = await usersRes.json();
        setUsers(data.users || []);
      }

      if (venuesRes.ok) {
        const data = await venuesRes.json();
        setVenuesList(data.venues || []);
      }

      if (servicesRes.ok) {
        const data = await servicesRes.json();
        setServicesList(data.services || []);
      }

      if (inquiriesRes.ok) {
        const data = await inquiriesRes.json();
        setInquiries(data.inquiries || []);
      }

      if (payoutsRes.ok) {
        const data = await payoutsRes.json();
        setPayoutsData(data);
      }

      if (reviewsRes.ok) {
        const data = await reviewsRes.json();
        setReviewsList(data.reviews || []);
      }
    } catch (err: any) {
      console.error("Failed to load admin dashboard data:", err);
      setError(err.message || "Failed to retrieve dashboard databases.");
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.user.role === "admin") {
            setAdmin(data.user);
            fetchAllData();
          } else if (data.authenticated) {
            router.push(data.user.role === "vendor" ? "/vendor/dashboard" : "/dashboard");
          } else {
            router.push("/admin");
          }
        } else {
          router.push("/admin");
        }
      } catch (err) {
        console.error("Admin dashboard session check error:", err);
        router.push("/admin");
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

  // ─── Moderation Operations ───

  const handleUpdateVendorStatus = async (vendorId: string, verified?: boolean, featured?: boolean) => {
    try {
      const res = await fetch("/api/admin/vendors", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendorId, verified, featured }),
      });
      const data = await res.json();
      if (res.ok) {
        notify("Vendor profile updated");
        fetchAllData();
      } else {
        notify(data.message || "Failed to update vendor.", "error");
      }
    } catch (err) {
      console.error(err);
      notify("Network error while updating vendor.", "error");
    }
  };

  const handleUpdateServiceStatus = async (serviceId: string, verified?: boolean, featured?: boolean, active?: boolean) => {
    try {
      const res = await fetch("/api/services", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId, verified, featured, active }),
      });
      const data = await res.json();
      if (res.ok) {
        notify("Listing updated");
        fetchAllData();
      } else {
        notify(data.message || "Failed to update listing.", "error");
      }
    } catch (err) {
      console.error(err);
      notify("Network error while updating listing.", "error");
    }
  };

  const handleDeleteVendor = (vendorId: string) => {
    setConfirmDialog({
      title: "Delete this vendor?",
      desc: "The vendor profile will be permanently removed from the platform. This action cannot be undone.",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/vendors?vendorId=${vendorId}`, {
            method: "DELETE",
          });
          const data = await res.json();
          if (res.ok) {
            notify("Vendor deleted");
            fetchAllData();
          } else {
            notify(data.message || "Failed to delete vendor.", "error");
          }
        } catch (err) {
          console.error(err);
          notify("Network error while deleting vendor.", "error");
        }
      },
    });
  };

  const handleDeleteService = (serviceId: string) => {
    setConfirmDialog({
      title: "Delete this listing?",
      desc: "The service listing will be permanently removed from the platform. This action cannot be undone.",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/services?serviceId=${serviceId}`, {
            method: "DELETE",
          });
          const data = await res.json();
          if (res.ok) {
            notify("Listing deleted");
            fetchAllData();
          } else {
            notify(data.message || "Failed to delete listing.", "error");
          }
        } catch (err) {
          console.error(err);
          notify("Network error while deleting listing.", "error");
        }
      },
    });
  };

  const handleUpdateBookingStatus = async (bookingId: string, status: string) => {
    try {
      const res = await fetch("/api/admin/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, status }),
      });
      const data = await res.json();
      if (res.ok) {
        notify("Booking status updated");
        fetchAllData();
      } else {
        notify(data.message || "Failed to update booking status.", "error");
        // Confirming an unpaid booking is now rejected server-side. Refetch so
        // the dropdown snaps back to the real status instead of showing a
        // change that didn't happen.
        fetchAllData();
      }
    } catch (err) {
      console.error(err);
      notify("Network error while updating booking.", "error");
      fetchAllData();
    }
  };

  /**
   * Record a payment that arrived outside Stripe (bank transfer, cash, cheque).
   * This is the only admin path that can mark a booking paid — status changes
   * alone no longer imply money was received.
   */
  const handleRecordOfflinePayment = async (bookingId: string, suggestedAmount: number) => {
    const entered = window.prompt(
      "Record a payment received outside Stripe.\n\nAmount actually received (₹):",
      String(suggestedAmount || "")
    );
    if (entered === null) return;

    const amount = Number(entered.replace(/[^0-9.]/g, ""));
    if (!Number.isFinite(amount) || amount <= 0) {
      notify("Enter a valid amount.", "error");
      return;
    }

    const note = window.prompt("Reference or note (optional) — e.g. UTR number, cheque no.", "") ?? "";

    try {
      const res = await fetch("/api/admin/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          recordOfflinePayment: true,
          offlineAmount: amount,
          offlineNote: note,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        notify("Payment recorded — booking confirmed");
      } else {
        notify(data.message || "Failed to record payment.", "error");
      }
      fetchAllData();
    } catch (err) {
      console.error(err);
      notify("Network error while recording payment.", "error");
    }
  };

  const handleDeleteBooking = (bookingId: string) => {
    setConfirmDialog({
      title: "Delete this booking?",
      desc: "The booking record and its payment history will be permanently removed. This action cannot be undone.",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/bookings?bookingId=${bookingId}`, {
            method: "DELETE",
          });
          const data = await res.json();
          if (res.ok) {
            notify("Booking deleted");
            fetchAllData();
          } else {
            notify(data.message || "Failed to delete booking.", "error");
          }
        } catch (err) {
          console.error(err);
          notify("Network error while deleting booking.", "error");
        }
      },
    });
  };

  const handleUpdateUserRole = async (userId: string, role: string) => {
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role }),
      });
      const data = await res.json();
      if (res.ok) {
        notify("User role updated");
        fetchAllData();
      } else {
        notify(data.message || "Failed to update user role.", "error");
      }
    } catch (err) {
      console.error(err);
      notify("Network error while updating user role.", "error");
    }
  };

  const handleDeleteUser = (userId: string) => {
    setConfirmDialog({
      title: "Delete this user?",
      desc: "The user account and profile will be permanently removed. This action cannot be undone.",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/users?userId=${userId}`, {
            method: "DELETE",
          });
          const data = await res.json();
          if (res.ok) {
            notify("User deleted");
            fetchAllData();
          } else {
            notify(data.message || "Failed to delete user.", "error");
          }
        } catch (err) {
          console.error(err);
          notify("Network error while deleting user.", "error");
        }
      },
    });
  };

  const handleUpdateInquiryStatus = async (inquiryId: string, status: string) => {
    try {
      const res = await fetch("/api/admin/inquiries", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inquiryId, status }),
      });
      const data = await res.json();
      if (res.ok) {
        notify("Inquiry status updated");
        fetchAllData();
      } else {
        notify(data.message || "Failed to update inquiry status.", "error");
      }
    } catch (err) {
      notify("Network error updating inquiry.", "error");
    }
  };

  const handleDeleteInquiry = (inquiryId: string) => {
    setConfirmDialog({
      title: "Delete this inquiry?",
      desc: "This message inquiry will be permanently deleted.",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/inquiries?inquiryId=${inquiryId}`, {
            method: "DELETE",
          });
          if (res.ok) {
            notify("Inquiry deleted");
            fetchAllData();
          } else {
            notify("Failed to delete inquiry.", "error");
          }
        } catch (err) {
          notify("Network error deleting inquiry.", "error");
        }
      },
    });
  };

  const handleUpdatePayoutStatus = async (bookingId: string, payoutStatus: string, payoutRef?: string) => {
    try {
      const res = await fetch("/api/admin/payouts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, payoutStatus, payoutRef }),
      });
      const data = await res.json();
      if (res.ok) {
        notify(`Payout marked as ${payoutStatus}`);
        fetchAllData();
      } else {
        notify(data.message || "Failed to update payout.", "error");
      }
    } catch (err) {
      notify("Network error updating payout.", "error");
    }
  };

  const handleDeleteReview = (vendorId: string, reviewId: string) => {
    setConfirmDialog({
      title: "Delete this review?",
      desc: "This review will be permanently removed from the vendor profile.",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/reviews?vendorId=${vendorId}&reviewId=${reviewId}`, {
            method: "DELETE",
          });
          if (res.ok) {
            notify("Review removed");
            fetchAllData();
          } else {
            notify("Failed to delete review.", "error");
          }
        } catch (err) {
          notify("Network error deleting review.", "error");
        }
      },
    });
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "N/A";
    try {
      return format(new Date(dateStr), "MMM d, yyyy");
    } catch (e) {
      return "Invalid Date";
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 1500);
  };

  // ─── Dynamic Aggregations & Charts Data ───

  const getMonthlyStats = () => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const now = new Date();

    interface MonthlyAgg {
      monthName: string;
      year: number;
      monthIndex: number;
      bookings: number;
      confirmed: number;
      revenue: number;
    }

    const last6Months: MonthlyAgg[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      last6Months.push({
        monthName: months[d.getMonth()],
        year: d.getFullYear(),
        monthIndex: d.getMonth(),
        bookings: 0,
        confirmed: 0,
        revenue: 0,
      });
    }

    bookings.forEach(b => {
      if (!b.createdAt) return;
      const date = new Date(b.createdAt);
      const m = date.getMonth();
      const y = date.getFullYear();

      const target = last6Months.find(item => item.monthIndex === m && item.year === y);
      if (target) {
        target.bookings += 1;
        if (b.status === "confirmed" || b.status === "completed") {
          target.confirmed += 1;
          target.revenue += b.advanceAmount || 0;
        }
      }
    });

    return last6Months.map(item => ({
      month: item.monthName,
      bookings: item.bookings,
      confirmed: item.confirmed,
      revenue: item.revenue,
    }));
  };

  const monthlyData = getMonthlyStats();
  const maxBookings = Math.max(...monthlyData.map(d => d.bookings), 1);
  const maxRevenue = Math.max(...monthlyData.map(d => d.revenue), 1);

  const thisMonth = monthlyData[monthlyData.length - 1];
  const prevMonth = monthlyData[monthlyData.length - 2];
  const pctChange = (curr: number, prev: number) =>
    prev > 0 ? Math.round(((curr - prev) / prev) * 1000) / 10 : curr > 0 ? 100 : 0;
  const revenueChange = pctChange(thisMonth?.revenue || 0, prevMonth?.revenue || 0);
  const bookingsChange = pctChange(thisMonth?.bookings || 0, prevMonth?.bookings || 0);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const newUsersThisMonth = users.filter(u => u.createdAt && new Date(u.createdAt) > thirtyDaysAgo).length;
  const newVendorsThisMonth = vendors.filter(v => v.createdAt && new Date(v.createdAt) > thirtyDaysAgo).length;

  const catServices = (c: string) => servicesList.filter((s: any) => s.category === c);
  const categoryStats = [
    { id: "venues", label: "Venues", count: venuesList.length, live: venuesList.filter((v: any) => v.active).length },
    { id: "planners", label: "Planners", count: catServices("planners").length, live: catServices("planners").filter((s: any) => s.active).length },
    { id: "caterers", label: "Caterers", count: catServices("caterers").length, live: catServices("caterers").filter((s: any) => s.active).length },
    { id: "decorators", label: "Decorators", count: catServices("decorators").length, live: catServices("decorators").filter((s: any) => s.active).length },
    { id: "photography", label: "Photography", count: catServices("photography").length, live: catServices("photography").filter((s: any) => s.active).length },
    { id: "rooms", label: "Rooms", count: catServices("rooms").length, live: catServices("rooms").filter((s: any) => s.active).length },
  ].sort((a, b) => b.count - a.count);
  const totalListings = venuesList.length + servicesList.length;
  const liveListings = categoryStats.reduce((sum, c) => sum + c.live, 0);

  const cityCounts: Record<string, number> = {};
  vendors.forEach(v => {
    const city = (v.city || "").trim();
    if (city) cityCounts[city] = (cityCounts[city] || 0) + 1;
  });
  const topCities = Object.entries(cityCounts).sort((a, b) => b[1] - a[1]).slice(0, 4);
  const maxCityCount = topCities[0]?.[1] || 1;

  const arcColors = ["#EE7429", "#FCCB11", isDarkMode ? "#A8A29E" : "#2F3843"];
  const bubbleColors = ["bg-primary-500 text-white", "bg-primary-300 text-white", "bg-primary-200 text-primary-800", "bg-primary-100 text-primary-700"];
  const bubbleDots = ["bg-primary-500", "bg-primary-300", "bg-primary-200", "bg-primary-100"];
  const deltaBadge = (label: string, positive: boolean) => (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black whitespace-nowrap ${positive
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
      : "bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400"
      }`}>{label}</span>
  );
  const pendingApprovals = vendors.filter(v => !v.verified);

  const filteredApprovals = pendingApprovals.filter(v => {
    const val = searchTerm.toLowerCase();
    return (
      (v.businessName || "").toLowerCase().includes(val) ||
      (v.name || "").toLowerCase().includes(val) ||
      (v.city || "").toLowerCase().includes(val) ||
      (v.category || "").toLowerCase().includes(val)
    );
  });

  const filteredVendors = vendors.filter(v => {
    const val = searchTerm.toLowerCase();
    return (
      (v.businessName || "").toLowerCase().includes(val) ||
      (v.name || "").toLowerCase().includes(val) ||
      (v.city || "").toLowerCase().includes(val) ||
      (v.category || "").toLowerCase().includes(val)
    );
  });

  const filteredBookings = bookings.filter(b => {
    const val = searchTerm.toLowerCase();
    return (
      (b.providerName || b.venueName || "").toLowerCase().includes(val) ||
      (b.userName || "").toLowerCase().includes(val) ||
      (b.userEmail || "").toLowerCase().includes(val) ||
      (b.userPhone || "").toLowerCase().includes(val) ||
      (b.status || "").toLowerCase().includes(val) ||
      (b._id || "").toLowerCase().includes(val)
    );
  });

  const filteredUsers = users.filter(u => {
    const val = searchTerm.toLowerCase();
    return (
      (u.name || "").toLowerCase().includes(val) ||
      (u.email || "").toLowerCase().includes(val) ||
      (u.phone || "").toLowerCase().includes(val) ||
      (u.role || "").toLowerCase().includes(val)
    );
  });

  const filteredVenuesList = venuesList.filter(v => {
    if (selectedVendorFilter !== "all" && v.vendorId !== selectedVendorFilter) return false;
    const val = searchTerm.toLowerCase();
    return (
      (v.name || "").toLowerCase().includes(val) ||
      (v.city || "").toLowerCase().includes(val) ||
      (v.type || "").toLowerCase().includes(val) ||
      (v.venueId || "").toLowerCase().includes(val)
    );
  });

  const filteredPayouts = (payoutsData?.payouts || []).filter((p: any) => {
    const val = searchTerm.toLowerCase();
    return (
      (p.providerName || "").toLowerCase().includes(val) ||
      (p.userName || "").toLowerCase().includes(val) ||
      (p.bookingType || "").toLowerCase().includes(val) ||
      (p.payoutStatus || "").toLowerCase().includes(val)
    );
  });

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // ─── Toast notifications ───
  const [toast, setToast] = useState<{ id: number; msg: string; type: "success" | "error" } | null>(null);
  const notify = (msg: string, type: "success" | "error" = "success") => {
    const id = Date.now();
    setToast({ id, msg, type });
    setTimeout(() => setToast(t => (t && t.id === id ? null : t)), 3200);
  };

  // ─── Destructive-action confirmation dialog ───
  const [confirmDialog, setConfirmDialog] = useState<{ title: string; desc: string; onConfirm: () => void } | null>(null);

  // ─── Table pagination ───
  const PAGE_SIZE = 8;
  const [tablePage, setTablePage] = useState(1);
  useEffect(() => { setTablePage(1); }, [activeTab, searchTerm]);
  const paginate = (arr: any[]) => arr.slice((tablePage - 1) * PAGE_SIZE, tablePage * PAGE_SIZE);
  const TablePager = ({ total }: { total: number }) => {
    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (total <= PAGE_SIZE) return null;
    const start = (tablePage - 1) * PAGE_SIZE + 1;
    const end = Math.min(tablePage * PAGE_SIZE, total);
    return (
      <div className="flex items-center justify-between pt-4">
        <span className="text-[11px] font-semibold text-stone-400">Showing {start}–{end} of {total}</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTablePage(p => Math.max(1, p - 1))}
            disabled={tablePage === 1}
            className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-default ${isDarkMode ? "border-stone-800 text-stone-300 hover:bg-stone-800" : "border-stone-200 text-stone-600 hover:bg-stone-50"}`}
          >
            <ChevronLeftIcon className="w-4 h-4" />
          </button>
          <span className={`text-[11px] font-black px-1 ${isDarkMode ? "text-stone-300" : "text-stone-600"}`}>{tablePage} / {pages}</span>
          <button
            onClick={() => setTablePage(p => Math.min(pages, p + 1))}
            disabled={tablePage === pages}
            className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-default ${isDarkMode ? "border-stone-800 text-stone-300 hover:bg-stone-800" : "border-stone-200 text-stone-600 hover:bg-stone-50"}`}
          >
            <ChevronRightIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-stone-50 text-stone-800 font-body">
        <div className="w-10 h-10 rounded-full border-2 border-primary-500/20 border-t-orange-500 animate-spin mb-4" />
        <p className="font-bold text-sm tracking-wide">SECURE CONSOLE</p>
      </div>
    );
  }

  if (!admin) return null;

  const menuItems: any[] = [
    { id: "overview", label: "Dashboard", count: null, icon: LayoutDashboard },
    {
      id: "services",
      label: "Services & Venues",
      icon: Briefcase,
      count: venuesList.length + servicesList.length || null
    },
    { id: "approvals", label: "Approvals", count: pendingApprovals.length || null, icon: UserCheckIcon },
    { id: "vendors", label: "Vendors", count: vendors.length || null, icon: Building2 },
    { id: "users", label: "Customers", count: users.length || null, icon: UsersIcon },
    { id: "inquiries", label: "Inquiries Queue", count: inquiries.filter(i => i.status === "new").length || null, icon: Mail },
    { id: "reviews", label: "Reviews", count: reviewsList.length || null, icon: Star },
    { id: "bookings", label: "Bookings", count: bookings.length || null, icon: BookOpen },
    { id: "payouts", label: "Payouts & Revenue", count: payoutsData?.payouts?.length || null, icon: WalletIcon },

    { id: "settings", label: "Settings", count: null, icon: SettingsIcon },
    { id: "home", label: "Back to Home", icon: HomeIcon, href: "/" },
  ];

  // Standard theme variables for consistency (corrected colors from non-standard)
  const containerBg = isDarkMode ? "bg-stone-950 text-stone-200" : "bg-[#f4f1ec] text-stone-800";
  const sidebarClass = isDarkMode ? "border-stone-800 bg-stone-900/80 text-stone-300" : "border-stone-200 bg-white/70 text-stone-600";
  const cardClass = isDarkMode ? "bg-stone-900/60 border-stone-800 text-stone-300" : "bg-white/70 border-stone-200 text-stone-600";
  const headingText = isDarkMode ? "text-white" : "text-stone-900";
  const dividerClass = isDarkMode ? "border-stone-800" : "border-stone-100";
  const subCardClass = isDarkMode ? "bg-stone-950/60 border-stone-800" : "bg-[#fafaf9] border-stone-200";

  return (
    <div className={`h-screen font-body flex relative overflow-hidden p-0 sm:p-2 transition-colors duration-300 ${containerBg} ${isDarkMode ? "dark" : ""}`}>

      {/* Background Decorative Ambient Shapes */}
      <div className="absolute w-[50rem] h-[50rem] -top-96 -left-96 opacity-[0.03] pointer-events-none rounded-full bg-primary-500 blur-[150px]" />
      <div className="absolute w-[45rem] h-[45rem] -bottom-80 -right-80 opacity-[0.03] pointer-events-none rounded-full bg-amber-500 blur-[150px]" />

      {/* ─── FLOATING SIDEBAR ─── */}
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
              <p className="text-[9px] font-bold text-primary-600 uppercase tracking-widest mt-1 whitespace-nowrap">Admin Control</p>
            </div>
          ) : (
            <h2 className={`font-extrabold text-sm tracking-tight uppercase mx-auto ${isDarkMode ? 'text-white' : 'text-stone-900'}`}>SW</h2>
          )}
        </div>

        {/* Navigation Link list */}
        <nav className="flex-1 px-4 py-6 flex flex-col gap-1.5 overflow-y-auto overflow-x-hidden">
          {menuItems.map((item) => {
            const hasSubItems = item.subItems && item.subItems.length > 0;
            const isSubActive = hasSubItems && item.subItems.some((sub: any) => sub.id === activeTab);
            const isActive = activeTab === item.id || isSubActive;
            const Icon = item.icon;

            const groupLabel = ({ overview: "Menu", bookings: "Financial", settings: "Tools" } as Record<string, string>)[item.id];

            return (
              <div key={item.id} className="w-full">
                {groupLabel && (
                  <p className={`px-3.5 pt-3 pb-1.5 text-[9px] font-black uppercase tracking-[0.18em] text-stone-400 whitespace-nowrap transition-all duration-300 ${sidebarCollapsed ? 'opacity-0 max-h-0 py-0 overflow-hidden pointer-events-none' : 'opacity-100 max-h-10'}`}>{groupLabel}</p>
                )}
                <button
                  onClick={() => {
                    if (item.href) {
                      router.push(item.href);
                    } else if (hasSubItems) {
                      setServicesExpanded(!servicesExpanded);
                      if (sidebarCollapsed) setSidebarCollapsed(false);
                    } else {
                      setActiveTab(item.id as TabType);
                      setSearchTerm("");
                    }
                  }}
                  className={`w-full relative flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'} px-3.5 py-3 rounded-2xl text-xs font-bold transition-all duration-200 cursor-pointer ${isActive
                    ? "bg-primary-500 text-white shadow-lg shadow-primary-500/30"
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
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black transition-opacity duration-300 whitespace-nowrap ${isActive
                      ? "bg-white/20 text-white"
                      : isDarkMode
                        ? "bg-stone-800 text-stone-400 border border-stone-700"
                        : "bg-stone-100 text-stone-500 border border-stone-200"
                      }`}>
                      {item.count}
                    </span>
                  )}
                  {!sidebarCollapsed && hasSubItems && (
                    servicesExpanded ? <ChevronDownIcon className="w-4 h-4 opacity-70 shrink-0" /> : <ChevronRightIcon className="w-4 h-4 opacity-70 shrink-0" />
                  )}
                  {sidebarCollapsed && item.count !== undefined && item.count !== null && !hasSubItems && (
                    <span className={`absolute right-1.5 top-1.5 px-1.5 py-0.5 rounded-full text-[8px] font-black ${isActive
                      ? "bg-white text-primary-600"
                      : isDarkMode
                        ? "bg-stone-800 text-stone-400 border border-stone-700"
                        : "bg-stone-100 text-stone-500 border border-stone-200"
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
                            onClick={() => {
                              setActiveTab(subItem.id as TabType);
                              setSearchTerm("");
                            }}
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

        {/* Footer: promo-style approvals card + collapse/logout */}
        <div className="p-4 flex flex-col gap-2">
          <div className={`transition-all duration-300 overflow-hidden ${sidebarCollapsed ? 'opacity-0 max-h-0 p-0 pointer-events-none' : 'opacity-100 max-h-64'}`}>
            <div className="relative overflow-hidden rounded-3xl bg-stone-900 p-5 text-white">
              <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-primary-500/30 blur-2xl pointer-events-none" />
              <div className="absolute -bottom-12 -left-8 w-28 h-28 rounded-full bg-amber-500/20 blur-2xl pointer-events-none" />
              <div className="relative">
                <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center mb-3">
                  <SparklesIcon className="w-4 h-4 text-amber-300" />
                </div>
                <p className="font-extrabold text-sm whitespace-nowrap">Approvals Queue</p>
                <p className="text-[10px] text-stone-400 font-semibold mt-1 leading-relaxed">
                  {pendingApprovals.length > 0
                    ? `${pendingApprovals.length} vendor${pendingApprovals.length === 1 ? "" : "s"} awaiting review`
                    : "All caught up — no pending vendors"}
                </p>
                <button
                  onClick={() => setActiveTab("approvals")}
                  className="w-full mt-4 bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs py-2.5 rounded-xl transition-colors cursor-pointer whitespace-nowrap"
                >
                  {pendingApprovals.length > 0 ? "Review now" : "Open queue"}
                </button>
              </div>
            </div>
          </div>

          <div className={`flex items-center gap-2 ${sidebarCollapsed ? "flex-col" : "justify-between"}`}>
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${isDarkMode
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

            <button
              onClick={handleLogout}
              title="Sign Out"
              className={`shrink-0 p-2 rounded-xl transition-colors cursor-pointer ${isDarkMode ? 'text-stone-400 hover:text-red-400 hover:bg-red-950/30' : 'text-stone-500 hover:text-red-500 hover:bg-red-50'}`}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ─── MAIN CONTENT CONTAINER ─── */}
      <div className="flex-1 min-w-0 flex flex-col p-3 gap-4 overflow-y-auto">

        {/* Top Header — title & date left, action cluster right */}
        <header className="px-2 pt-2 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4 min-w-0">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`lg:hidden px-3 py-1.5 rounded-xl border text-xs font-bold ${isDarkMode ? "border-stone-800 text-stone-300 hover:bg-stone-800" : "border-stone-200 hover:bg-stone-50"
                }`}
            >
              {mobileMenuOpen ? <XIcon className="w-4 h-4" /> : <MenuIcon className="w-4 h-4" />}
            </button>

            <div className="min-w-0">
              <h1 className={`font-extrabold text-xl md:text-2xl tracking-tight capitalize truncate ${headingText}`}>
                {activeTab === "overview" ? "Dashboard" : (menuItems.find(i => i.id === activeTab) || menuItems.find(i => i.subItems?.some((s: any) => s.id === activeTab))?.subItems?.find((s: any) => s.id === activeTab))?.label}
              </h1>
              <p className="text-[11px] text-stone-500 font-semibold mt-0.5">
                {loadingData ? "Syncing live data..." : format(new Date(), "EEEE, MMMM do yyyy")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* SearchIcon */}
            <div className={`hidden md:flex items-center gap-2 px-4 h-10 rounded-full border transition-colors ${isDarkMode ? "bg-stone-900 border-stone-800" : "bg-white border-stone-200"
              }`}>
              <SearchIcon className="w-4 h-4 text-stone-400" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search records..."
                className={`bg-transparent outline-none text-xs font-semibold w-36 ${isDarkMode ? "text-stone-200 placeholder:text-stone-500" : "text-stone-700 placeholder:text-stone-400"}`}
              />
            </div>

            {/* Refresh */}
            <button
              onClick={fetchAllData}
              disabled={loadingData}
              title="Refresh data"
              className={`w-10 h-10 rounded-full border flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50 ${isDarkMode ? "bg-stone-900 border-stone-800 text-stone-300 hover:bg-stone-800" : "bg-white border-stone-200 text-stone-600 hover:bg-stone-50"
                }`}
            >
              <RefreshCWIcon className={`w-4 h-4 ${loadingData ? "animate-spin" : ""}`} />
            </button>

            {/* Notifications */}
            <button
              onClick={() => setActiveTab("approvals")}
              title={`${pendingApprovals.length} pending approvals`}
              className={`relative w-10 h-10 rounded-full border flex items-center justify-center transition-colors cursor-pointer ${isDarkMode ? "bg-stone-900 border-stone-800 text-stone-300 hover:bg-stone-800" : "bg-white border-stone-200 text-stone-600 hover:bg-stone-50"
                }`}
            >
              <BellIcon className="w-4 h-4" />
              {pendingApprovals.length > 0 && (
                <span className={`absolute top-2 right-2.5 w-2 h-2 rounded-full bg-primary-500 ring-2 ${isDarkMode ? "ring-stone-900" : "ring-white"}`} />
              )}
            </button>

            <ThemeToggle />

            {/* Profile */}
            <div className="flex items-center gap-2.5 pl-1.5">
              {admin.profileImage ? (
                <img src={admin.profileImage} alt={admin.name} className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-400 dark:text-stone-500 flex items-center justify-center">
                  <UserIcon className="w-5 h-5" />
                </div>
              )}
              <div className="hidden sm:block leading-tight">
                <p className={`text-xs font-extrabold ${headingText}`}>{admin.name}</p>
                <p className="text-[10px] font-semibold text-stone-500">Marketplace Admin</p>
              </div>
            </div>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`lg:hidden border rounded-3xl px-6 py-4 absolute w-full top-[68px] z-30 shadow-none flex flex-col gap-2 ${isDarkMode ? "bg-stone-900 border-stone-800 text-white" : "bg-white border-stone-200 text-stone-800"
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
                          setSearchTerm("");
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
                        {item.count !== null && item.count !== undefined && !hasSubItems && (
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${activeTab === item.id ? "bg-white/20 text-white" : "bg-stone-105 text-stone-600"
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
                              setSearchTerm("");
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
                            {subItem.count !== null && subItem.count !== undefined && (
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

        {/* Global Error Notice */}
        {error && (
          <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/25 text-red-700 dark:text-red-400 flex gap-3 items-start">
            <div>
              <p className="text-xs font-black">Sync Failure Encountered</p>
              <p className="text-[11px] text-red-600 dark:text-red-400 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Dynamic Tab Panel */}
        <main className="flex-1 z-10 w-full mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
            >

              {/* ─── TAB: OVERVIEW (loading skeleton) ─── */}
              {activeTab === "overview" && loadingData && !stats && (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
                  <div className="xl:col-span-2 flex flex-col gap-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {[...Array(4)].map((_, i) => (
                        <div key={i} className={`h-44 rounded-3xl animate-pulse ${isDarkMode ? "bg-stone-900/70" : "bg-white/80"}`} />
                      ))}
                    </div>
                    <div className={`h-96 rounded-3xl animate-pulse ${isDarkMode ? "bg-stone-900/70" : "bg-white/80"}`} />
                  </div>
                  <div className="flex flex-col gap-6">
                    <div className={`h-[420px] rounded-3xl animate-pulse ${isDarkMode ? "bg-stone-900/70" : "bg-white/80"}`} />
                    <div className={`h-72 rounded-3xl animate-pulse ${isDarkMode ? "bg-stone-900/70" : "bg-white/80"}`} />
                  </div>
                </div>
              )}

              {/* ─── TAB: OVERVIEW ─── */}
              {activeTab === "overview" && !(loadingData && !stats) && (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">

                  {/* ── Left: KPI grid + booking activity chart ── */}
                  <div className="xl:col-span-2 flex flex-col gap-6">

                    {/* KPI cards 2x2 */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

                      {/* 1. Total Revenue — filled primary card */}
                      <div className="relative overflow-hidden rounded-3xl p-6 bg-primary-500 text-white shadow-xl shadow-primary-500/25">
                        <div className="absolute -top-12 -right-12 w-44 h-44 rounded-full bg-white/10 blur-2xl pointer-events-none" />
                        <div className="relative flex items-start justify-between">
                          <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-sm">
                            <WalletIcon className="w-5 h-5 text-primary-500" />
                          </div>
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-white/20 text-white">
                            {revenueChange >= 0 ? "+" : ""}{revenueChange}%
                          </span>
                        </div>
                        <p className="relative text-sm font-bold text-white/85 mt-6">Total Revenue</p>
                        <div className="relative flex items-end gap-3 mt-2">
                          <h3 className="text-2xl md:text-3xl font-black tracking-tight leading-none">{formatAsCurrency(stats?.totalRevenue || 0, "INR")}</h3>
                          <span className="text-[10px] font-semibold text-white/70 leading-tight whitespace-pre-line">{"Revenue vs\nlast month"}</span>
                        </div>
                      </div>

                      {/* 2-4. White KPI cards */}
                      {[
                        { label: "Total Bookings", value: stats?.totalBookings ?? bookings.length, icon: CalendarCheckIcon, badge: `${bookingsChange >= 0 ? "+" : ""}${bookingsChange}%`, positive: bookingsChange >= 0, sub: "Bookings vs\nlast month" },
                        { label: "Registered Users", value: stats?.totalUsers ?? users.length, icon: UsersIcon, badge: `+${newUsersThisMonth}`, positive: true, sub: "New in\nlast 30 days" },
                        { label: "Partner Vendors", value: stats?.totalVendors ?? vendors.length, icon: Building2, badge: `+${newVendorsThisMonth}`, positive: true, sub: "Joined in\nlast 30 days" },
                      ].map((card, i) => (
                        <div key={i} className={`rounded-3xl p-6 border shadow-none ${cardClass}`}>
                          <div className="flex items-start justify-between">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isDarkMode ? "bg-stone-800" : "bg-stone-100"}`}>
                              <card.icon className="w-5 h-5 text-primary-500" />
                            </div>
                            {deltaBadge(card.badge, card.positive)}
                          </div>
                          <p className="text-sm font-bold text-stone-500 mt-6">{card.label}</p>
                          <div className="flex items-end gap-3 mt-2">
                            <h3 className={`text-2xl md:text-3xl font-black tracking-tight leading-none ${headingText}`}>{card.value}</h3>
                            <span className="text-[10px] font-semibold text-stone-400 leading-tight whitespace-pre-line">{card.sub}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Booking Activity — paired bar chart */}
                    <div className={`rounded-3xl border p-6 shadow-none ${cardClass}`}>
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div>
                          <h4 className={`font-extrabold text-lg tracking-tight ${headingText}`}>Booking Activity</h4>
                          <p className="text-[11px] text-stone-400 font-semibold mt-0.5">Track total vs confirmed bookings</p>
                        </div>
                      </div>

                      {/* Legend */}
                      <div className="flex items-center gap-5 mt-4">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-stone-400">
                          <span className={`w-2.5 h-2.5 rounded-full ${isDarkMode ? "bg-stone-700" : "bg-stone-300"}`} /> All bookings
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-primary-500">
                          <span className="w-2.5 h-2.5 rounded-full bg-primary-500" /> Confirmed
                        </div>
                      </div>

                      {/* Chart canvas */}
                      <div className="flex gap-3 mt-6">
                        {/* Y axis */}
                        <div className="flex flex-col justify-between h-48 pb-6 text-[10px] font-bold text-stone-400 text-right shrink-0">
                          <span>{maxBookings}</span>
                          <span>{Math.round(maxBookings / 2)}</span>
                          <span>0</span>
                        </div>
                        <div className="flex-1 flex items-end justify-between gap-2">
                          {monthlyData.map((d, idx) => (
                            <div key={idx} className="flex flex-col items-center flex-1 group relative">
                              {/* Tooltip */}
                              <div className="absolute bottom-full mb-2 bg-stone-950 text-white text-[10px] font-bold py-2 px-3.5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-20 whitespace-nowrap flex flex-col gap-1 border border-stone-800">
                                <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-stone-400 inline-block" /> {d.bookings} bookings</span>
                                <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-primary-400 inline-block" /> {d.confirmed} confirmed</span>
                              </div>

                              {/* Paired pill bars */}
                              <div className="flex gap-1.5 items-end h-44 w-full justify-center">
                                <div
                                  className={`w-4 sm:w-5 rounded-full transition-all duration-300 ${isDarkMode ? "bg-stone-800 group-hover:bg-stone-700" : "bg-stone-200 group-hover:bg-stone-300"}`}
                                  style={{ height: `${Math.max((d.bookings / maxBookings) * 100, 4)}%` }}
                                />
                                <div
                                  className="w-4 sm:w-5 rounded-full bg-primary-500 group-hover:bg-primary-600 transition-all duration-300"
                                  style={{ height: `${Math.max((d.confirmed / maxBookings) * 100, 4)}%` }}
                                />
                              </div>
                              <span className="text-[10px] font-bold text-stone-400 mt-2.5">{d.month}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ── Right: listing statistics + vendor growth ── */}
                  <div className="flex flex-col gap-6">

                    {/* Listing Statistics — concentric radial arcs */}
                    <div className={`rounded-3xl border p-6 shadow-none ${cardClass}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className={`font-extrabold text-lg tracking-tight ${headingText}`}>Listing Statistics</h4>
                          <p className="text-[11px] text-stone-400 font-semibold mt-0.5">Track listings by category</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-5">
                        <svg className="w-36 h-36 -rotate-90 shrink-0" viewBox="0 0 120 120">
                          {categoryStats.slice(0, 3).map((cat, i) => {
                            const r = [52, 40, 28][i];
                            const circ = 2 * Math.PI * r;
                            const frac = 0.2 + 0.55 * (cat.count / (categoryStats[0].count || 1));
                            return (
                              <g key={cat.id}>
                                <circle cx="60" cy="60" r={r} fill="transparent" strokeWidth="8" className={isDarkMode ? "stroke-stone-800" : "stroke-stone-100"} />
                                <circle cx="60" cy="60" r={r} fill="transparent" strokeWidth="8" strokeLinecap="round" stroke={arcColors[i]} strokeDasharray={circ} strokeDashoffset={circ * (1 - frac)} className="transition-all duration-1000" />
                              </g>
                            );
                          })}
                        </svg>
                        <div className="min-w-0">
                          <h3 className={`text-3xl font-black tracking-tight leading-none ${headingText}`}>{totalListings}</h3>
                          <p className="text-[11px] font-semibold text-stone-400 mt-1.5">Total Listings</p>
                          <span className="inline-block mt-2">{deltaBadge(`${liveListings} live`, true)}</span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-3 mt-5">
                        {categoryStats.map((cat, i) => (
                          <div key={cat.id} className="flex items-center gap-2.5">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: i < 3 ? arcColors[i] : "#A8A29E" }} />
                            <span className={`flex-1 text-xs font-bold ${isDarkMode ? "text-stone-300" : "text-stone-600"}`}>{cat.label}</span>
                            <span className={`text-sm font-black ${headingText}`}>{cat.count}</span>
                            {deltaBadge(`${cat.live} live`, cat.live > 0)}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Vendor Growth — bubble cluster + city list */}
                    <div className={`rounded-3xl border p-6 shadow-none ${cardClass}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className={`font-extrabold text-lg tracking-tight ${headingText}`}>Vendor Growth</h4>
                          <p className="text-[11px] text-stone-400 font-semibold mt-0.5">Track vendors by city</p>
                        </div>
                      </div>

                      {topCities.length === 0 ? (
                        <p className="text-xs font-semibold text-stone-400 text-center py-10">No vendor locations recorded yet.</p>
                      ) : (
                        <div className="flex items-center gap-5 mt-6 flex-wrap sm:flex-nowrap">
                          {/* Bubble cluster */}
                          <div className="relative w-40 h-44 shrink-0 mx-auto">
                            {topCities.map(([city, count], i) => {
                              const size = Math.round(40 + 60 * Math.sqrt(count / maxCityCount));
                              const pos = [
                                { top: 0, right: 0 },
                                { bottom: 0, left: 0 },
                                { top: 12, left: 4 },
                                { bottom: 8, right: 4 },
                              ][i];
                              return (
                                <div
                                  key={city}
                                  className={`absolute rounded-full flex items-center justify-center font-black text-xs ${bubbleColors[i]}`}
                                  style={{ width: size, height: size, ...pos }}
                                >
                                  {count}
                                </div>
                              );
                            })}
                          </div>

                          {/* City list */}
                          <div className="flex-1 min-w-[150px] flex flex-col gap-3.5">
                            {topCities.map(([city, count], i) => (
                              <div key={city} className="flex items-center gap-2.5">
                                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${bubbleDots[i]}`} />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className={`text-xs font-bold truncate ${isDarkMode ? "text-stone-300" : "text-stone-600"}`}>{city}</span>
                                    <span className="text-[10px] font-black text-stone-400">{count}</span>
                                  </div>
                                  <div className={`h-1 rounded-full mt-1.5 ${isDarkMode ? "bg-stone-800" : "bg-stone-100"}`}>
                                    <div className="h-1 rounded-full bg-primary-500" style={{ width: `${(count / maxCityCount) * 100}%` }} />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ─── TAB: VENDOR APPROVALS ─── */}
              {activeTab === "approvals" && (
                <div className={`border rounded-3xl p-6 shadow-none ${cardClass}`}>
                  <div className={`flex justify-between items-center pb-4 border-b mb-6 ${dividerClass}`}>
                    <div>
                      <h3 className={`font-extrabold text-base ${headingText}`}>New Vendor Registrations</h3>
                      <p className="text-[10px] text-stone-400 font-semibold mt-0.5">Verify and moderate brand profile requests in the onboarding pipeline</p>
                    </div>
                    <span className="text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1 rounded-full uppercase tracking-wider dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/25">
                      {filteredApprovals.length} pending
                    </span>
                  </div>

                  {loadingData && filteredApprovals.length === 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className={`h-96 rounded-3xl animate-pulse ${isDarkMode ? "bg-stone-800/60" : "bg-stone-100"}`} />
                      ))}
                    </div>
                  ) : filteredApprovals.length === 0 ? (
                    <div className="py-20 flex flex-col items-center justify-center text-center gap-3">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isDarkMode ? "bg-stone-800" : "bg-stone-100"}`}>
                        <UserCheckIcon className="w-6 h-6 text-stone-400" />
                      </div>
                      <h4 className={`font-bold text-sm ${headingText}`}>Approvals queue is clear</h4>
                      <p className="text-xs text-stone-400 max-w-xs">All submitted vendor profile requests have been moderated.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                      {filteredApprovals.map((v) => (
                        <div key={v._id} className={`rounded-3xl border overflow-hidden flex flex-col transition-shadow hover:shadow-lg ${isDarkMode ? "border-stone-800 bg-stone-900/40 hover:shadow-black/30" : "border-stone-200 bg-white hover:shadow-stone-200/60"}`}>
                          {/* Cover image */}
                          <div className={`relative h-36 shrink-0 ${isDarkMode ? "bg-stone-800" : "bg-stone-100"}`}>
                            {v.images && v.images.length > 0 ? (
                              <img src={v.images[0]} alt={v.businessName || "Vendor"} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Camera className="w-7 h-7 text-stone-400" />
                              </div>
                            )}
                            <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wide bg-stone-950/70 text-white backdrop-blur-sm">{v.category}</span>
                            <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wide bg-amber-400 text-amber-950">Pending</span>
                          </div>

                          {/* Body */}
                          <div className="p-5 flex flex-col flex-1">
                            <h3 className={`font-extrabold text-sm leading-snug line-clamp-1 ${headingText}`}>{v.businessName || "No Business Name"}</h3>
                            <p className="flex items-center gap-1 text-[11px] font-semibold text-stone-400 mt-1">
                              <MapPinIcon className="w-3 h-3" /> {v.city || "Not specified"}
                            </p>

                            <div className={`flex flex-col divide-y rounded-2xl border mt-4 text-[11px] ${isDarkMode ? "divide-stone-800 border-stone-800" : "divide-stone-100 border-stone-100"}`}>
                              <div className="flex items-center gap-2 px-3 py-2">
                                <UsersIcon className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                                <span className={`font-bold truncate ${isDarkMode ? "text-stone-300" : "text-stone-600"}`}>{v.name}</span>
                              </div>
                              <div className="flex items-center gap-2 px-3 py-2">
                                <Mail className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                                <span className={`font-semibold truncate ${isDarkMode ? "text-stone-300" : "text-stone-600"}`}>{v.email}</span>
                              </div>
                              <div className="flex items-center gap-2 px-3 py-2">
                                <PhoneIcon className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                                <span className={`font-semibold ${isDarkMode ? "text-stone-300" : "text-stone-600"}`}>{v.phone || "Not provided"}</span>
                              </div>
                              <div className="flex items-center gap-2 px-3 py-2">
                                <CalendarDaysIcon className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                                <span className={`font-semibold ${isDarkMode ? "text-stone-300" : "text-stone-600"}`}>Applied {formatDate(v.createdAt)}</span>
                              </div>
                            </div>

                            {v.images && v.images.length > 1 && (
                              <div className="flex gap-1.5 mt-3 overflow-x-auto pb-0.5" style={{ scrollbarWidth: "none" }}>
                                {v.images.slice(1, 6).map((imgUrl: string, idx: number) => (
                                  <img key={idx} src={imgUrl} alt="Showcase" className={`w-10 h-10 rounded-lg object-cover border shrink-0 ${isDarkMode ? "border-stone-800" : "border-stone-100"}`} />
                                ))}
                              </div>
                            )}

                            <div className="flex gap-2.5 mt-auto pt-4">
                              <button
                                onClick={() => handleUpdateVendorStatus(v._id, true)}
                                className="flex-1 bg-primary-500 hover:bg-primary-600 text-white font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleDeleteVendor(v._id)}
                                className={`flex-1 font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer border ${isDarkMode ? "bg-red-500/10 text-red-400 border-red-500/25 hover:bg-red-500/20" : "bg-red-50 text-red-600 border-red-100 hover:bg-red-100"}`}
                              >
                                Reject
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ─── TAB: VENDORS DIRECTORY ─── */}
              {activeTab === "vendors" && (
                <div className={`border rounded-3xl overflow-hidden p-6 shadow-none ${cardClass}`}>
                  <div className={`flex justify-between items-center pb-4 border-b mb-6 ${dividerClass}`}>
                    <div>
                      <h3 className={`font-extrabold text-base ${headingText}`}>Partners Directory</h3>
                      <p className="text-[10px] text-stone-400 font-semibold mt-0.5">Manage and review all partner accounts register status and features</p>
                    </div>
                  </div>

                  {loadingData && filteredVendors.length === 0 ? (
                    <div className="flex flex-col gap-3">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className={`h-14 rounded-2xl animate-pulse ${isDarkMode ? "bg-stone-800/60" : "bg-stone-100"}`} />
                      ))}
                    </div>
                  ) : filteredVendors.length === 0 ? (
                    <div className="py-20 flex flex-col items-center justify-center text-center gap-3">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isDarkMode ? "bg-stone-800" : "bg-stone-100"}`}>
                        <SearchX className="w-6 h-6 text-stone-400" />
                      </div>
                      <h4 className={`font-bold text-sm ${headingText}`}>No vendors found</h4>
                      <p className="text-xs text-stone-400 max-w-xs">{searchTerm ? `Nothing matches "${searchTerm}" — try a different search.` : "No vendor profiles have been registered yet."}</p>
                    </div>
                  ) : (
                    <div className={`overflow-x-auto border rounded-2xl ${dividerClass}`}>
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className={`border-b text-[10px] uppercase tracking-wider font-black text-stone-400 ${isDarkMode ? 'bg-stone-900/50' : 'bg-[#fafaf9]'}`}>
                            <th className="p-4">Brand / Owner</th>
                            <th className="p-4">Category</th>
                            <th className="p-4">City</th>
                            <th className="p-4">Review Score</th>
                            <th className="p-4">Verification</th>
                            <th className="p-4">Featured badge</th>
                            <th className="p-4 text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginate(filteredVendors).map((v: any) => (
                            <tr key={v._id} className={`border-b last:border-0 transition-colors ${isDarkMode ? "border-stone-800 hover:bg-stone-900/40" : "border-stone-200 hover:bg-primary-50/20"
                              }`}>
                              <td className="p-4">
                                <div className="flex items-center gap-3">
                                  <div className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center font-black text-xs uppercase ${isDarkMode ? "bg-primary-500/15 text-primary-400" : "bg-primary-50 text-primary-600"}`}>
                                    {(v.businessName || v.name || "?").slice(0, 1)}
                                  </div>
                                  <div className="min-w-0">
                                    <p className={`font-black text-sm truncate ${isDarkMode ? 'text-stone-200' : 'text-stone-800'}`}>{v.businessName || "No Business Name"}</p>
                                    <p className="text-[10px] text-stone-400 font-semibold mt-0.5 truncate">{v.name} • {v.email}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="p-4">
                                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black border uppercase tracking-wide ${isDarkMode ? "bg-stone-800 border-stone-700 text-stone-300" : "bg-stone-100 border-stone-200 text-stone-600"
                                  }`}>
                                  {v.category}
                                </span>
                              </td>
                              <td className={`p-4 font-semibold ${isDarkMode ? 'text-stone-300' : 'text-stone-700'}`}>{v.city || "N/A"}</td>
                              <td className="p-4">
                                <span className={`flex items-center gap-1 font-bold ${isDarkMode ? 'text-stone-300' : 'text-stone-700'}`}>
                                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                                  {v.rating || 0}
                                  <span className="text-[10px] text-stone-400 font-semibold">({v.reviewCount || 0})</span>
                                </span>
                              </td>
                              <td className="p-4">
                                <button
                                  onClick={() => handleUpdateVendorStatus(v._id, !v.verified)}
                                  className={`px-3 py-1 rounded-full text-[10px] font-black cursor-pointer border transition-all ${v.verified
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900"
                                    : "bg-stone-50 text-stone-500 border-stone-200 hover:bg-stone-100 dark:hover:bg-stone-900 dark:border-stone-800 dark:text-stone-400"
                                    }`}
                                >
                                  {v.verified ? "Verified" : "Pending"}
                                </button>
                              </td>
                              <td className="p-4">
                                <button
                                  onClick={() => handleUpdateVendorStatus(v._id, undefined, !v.featured)}
                                  className={`px-3 py-1 rounded-full text-[10px] font-black cursor-pointer border transition-all ${v.featured
                                    ? "bg-primary-50 text-primary-700 border-primary-200 hover:bg-primary-100 dark:hover:bg-primary-950/20 dark:text-primary-400 dark:border-primary-900"
                                    : "bg-stone-50 text-stone-500 border-stone-200 hover:bg-stone-100 dark:hover:bg-stone-900 dark:border-stone-800 dark:text-stone-400"
                                    }`}
                                >
                                  {v.featured ? "Featured" : "Regular"}
                                </button>
                              </td>
                              <td className="p-4 text-center">
                                <button
                                  onClick={() => handleDeleteVendor(v._id)}
                                  title="Delete vendor"
                                  className={`p-2 rounded-xl transition-colors cursor-pointer ${isDarkMode ? "text-stone-500 hover:text-red-400 hover:bg-red-500/10" : "text-stone-400 hover:text-red-600 hover:bg-red-50"}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <TablePager total={filteredVendors.length} />
                </div>
              )}

              {/* ─── TAB: BOOKINGS LEDGER ─── */}
              {activeTab === "bookings" && (
                <div className={`border rounded-3xl overflow-hidden p-6 shadow-none ${cardClass}`}>
                  <div className={`flex justify-between items-center pb-4 border-b mb-6 ${dividerClass}`}>
                    <div>
                      <h3 className={`font-extrabold text-base ${headingText}`}>Bookings Ledger</h3>
                      <p className="text-[10px] text-stone-400 font-semibold mt-0.5">Monitor client checkout orders, payments, and service statuses</p>
                    </div>
                  </div>

                  {loadingData && filteredBookings.length === 0 ? (
                    <div className="flex flex-col gap-3">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className={`h-14 rounded-2xl animate-pulse ${isDarkMode ? "bg-stone-800/60" : "bg-stone-100"}`} />
                      ))}
                    </div>
                  ) : filteredBookings.length === 0 ? (
                    <div className="py-20 flex flex-col items-center justify-center text-center gap-3">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isDarkMode ? "bg-stone-800" : "bg-stone-100"}`}>
                        <SearchX className="w-6 h-6 text-stone-400" />
                      </div>
                      <h4 className={`font-bold text-sm ${headingText}`}>No bookings found</h4>
                      <p className="text-xs text-stone-400 max-w-xs">{searchTerm ? `Nothing matches "${searchTerm}" — try a different search.` : "No booking orders have been placed yet."}</p>
                    </div>
                  ) : (
                    <div className={`overflow-x-auto border rounded-2xl ${dividerClass}`}>
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className={`border-b text-[10px] uppercase tracking-wider font-black text-stone-400 ${isDarkMode ? 'bg-stone-900/50' : 'bg-[#fafaf9]'}`}>
                            <th className="p-4">Booking Info</th>
                            <th className="p-4">Client Details</th>
                            <th className="p-4">Specifications</th>
                            <th className="p-4">Dates</th>
                            <th className="p-4">Amount / Payment</th>
                            <th className="p-4">Status</th>
                            <th className="p-4 text-center">Delete</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginate(filteredBookings).map((b: any) => (
                            <tr key={b._id} className={`border-b last:border-0 transition-colors ${isDarkMode ? "border-stone-800 hover:bg-stone-900/40" : "border-stone-200 hover:bg-primary-50/20"
                              }`}>
                              <td className="p-4">
                                {/* Bookings store the listing name as `providerName`; this read
                                    `b.venueName`, which doesn't exist on the model, so the column
                                    rendered blank and the ledger gave no clue which venue a
                                    booking belonged to. */}
                                <p className={`font-black text-sm leading-tight ${isDarkMode ? 'text-stone-200' : 'text-stone-800'}`}>{b.providerName || "—"}</p>
                                <div className="flex items-center gap-1.5 mt-1">
                                  <span className="text-[9px] text-stone-400 font-mono">ID: {b._id.slice(0, 8)}...</span>
                                  <button
                                    onClick={() => copyToClipboard(b._id)}
                                    title="Copy booking ID"
                                    className={`p-1 rounded-md transition-colors cursor-pointer ${copiedId === b._id ? "text-emerald-500" : "text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"}`}
                                  >
                                    {copiedId === b._id ? <CheckIcon className="w-3 h-3" /> : <CopyIcon className="w-3 h-3" />}
                                  </button>
                                </div>
                              </td>
                              <td className="p-4">
                                <p className={`font-bold ${isDarkMode ? 'text-stone-300' : 'text-stone-700'}`}>{b.userName}</p>
                                <p className="text-[10px] text-stone-450 mt-0.5">{b.userEmail} • {b.userPhone || "No Phone"}</p>
                              </td>
                              <td className="p-4">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border uppercase ${isDarkMode ? "bg-stone-800 border-stone-700 text-stone-300" : "bg-stone-100 border-stone-200 text-stone-600"
                                  }`}>
                                  {b.bookingType}
                                </span>
                                <p className="text-[10px] font-semibold text-stone-500 mt-1.5">
                                  {b.bookingType === "venue" ? `${b.guestCount || 0} Guests` : `${b.roomCount || 0} Rooms`}
                                </p>
                              </td>
                              <td className="p-4">
                                {b.bookingType !== "room" ? (
                                  <div className={`font-semibold ${isDarkMode ? 'text-stone-300' : 'text-stone-700'}`}>
                                    {b.eventDates && b.eventDates.length > 0 ? (
                                      <p className="text-xs">{b.eventDates.map((d: any) => format(new Date(d), "MMM d")).join(", ")}</p>
                                    ) : (
                                      <p className="text-xs">{formatDate(b.eventDate)}</p>
                                    )}
                                  </div>
                                ) : (
                                  <div className={`font-semibold ${isDarkMode ? 'text-stone-300' : 'text-stone-700'}`}>
                                    <p className="text-xs">In: {formatDate(b.checkIn)}</p>
                                    <p className="text-[10px] text-stone-400 font-medium mt-0.5">Out: {formatDate(b.checkOut)}</p>
                                  </div>
                                )}
                              </td>
                              {/* This column used to be headed "Advance Paid" while showing the
                                  advance DUE — an unpaid booking displayed "Adv: ₹11,400" when
                                  ₹0 had been collected. Paid vs due is now explicit. */}
                              <td className="p-4">
                                <p className={`font-black ${isDarkMode ? 'text-stone-200' : 'text-stone-800'}`}>{formatAsCurrency(b.totalAmount, b.currency || "INR")}</p>
                                {b.paymentStatus === "paid" ? (
                                  <p className="text-[10px] font-bold mt-0.5 text-emerald-600 dark:text-emerald-400">
                                    Paid: {formatAsCurrency(b.amountPaid || 0, b.currency || "INR")}
                                    {b.paidMethod === "offline" && " (offline)"}
                                  </p>
                                ) : (
                                  <div className="mt-0.5 space-y-1">
                                    <p className="text-[10px] text-stone-450 font-bold">
                                      Unpaid — adv due {formatAsCurrency(b.advanceAmount, b.currency || "INR")}
                                    </p>
                                    {b.status !== "cancelled" && (
                                      <button
                                        onClick={() => handleRecordOfflinePayment(b._id, b.advanceAmount)}
                                        className="text-[9px] font-black uppercase tracking-wide px-2 py-0.5 rounded-md border border-stone-300 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:border-primary-400 hover:text-primary-600 transition-colors cursor-pointer"
                                      >
                                        Record payment
                                      </button>
                                    )}
                                  </div>
                                )}
                              </td>
                              <td className="p-4">
                                <select
                                  value={b.status}
                                  onChange={(e) => handleUpdateBookingStatus(b._id, e.target.value)}
                                  className={`text-[10px] font-extrabold rounded-lg border px-2.5 py-1 bg-white outline-none cursor-pointer transition-colors dark:bg-stone-900 bg-none ${b.status === "confirmed"
                                    ? "text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/25 bg-emerald-50/70 dark:text-emerald-400 dark:border-emerald-900"
                                    : b.status === "completed"
                                      ? "text-blue-700 border-blue-200 bg-blue-50/70 dark:text-blue-400 dark:border-blue-900"
                                      : b.status === "cancelled"
                                        ? "text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/25 bg-red-50/70 dark:text-red-400 dark:border-red-900"
                                        : "text-amber-700 border-amber-200 bg-amber-50/70 dark:text-amber-400 dark:border-amber-900"
                                    }`}
                                >
                                  <option value="pending" className="text-amber-700 font-bold bg-white dark:bg-stone-900">Pending</option>
                                  <option value="confirmed" className="text-emerald-700 dark:text-emerald-400 font-bold bg-white dark:bg-stone-900">Confirmed</option>
                                  <option value="completed" className="text-blue-700 font-bold bg-white dark:bg-stone-900">Completed</option>
                                  <option value="cancelled" className="text-red-700 dark:text-red-400 font-bold bg-white dark:bg-stone-900">Cancelled</option>
                                </select>
                              </td>
                              <td className="p-4 text-center">
                                <button
                                  onClick={() => handleDeleteBooking(b._id)}
                                  title="Delete booking"
                                  className={`p-2 rounded-xl transition-colors cursor-pointer ${isDarkMode ? "text-stone-500 hover:text-red-400 hover:bg-red-500/10" : "text-stone-400 hover:text-red-600 hover:bg-red-50"}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <TablePager total={filteredBookings.length} />
                </div>
              )}

              {/* ─── TAB: USERS REGISTRY ─── */}
              {activeTab === "users" && (
                <div className={`border rounded-3xl overflow-hidden p-6 shadow-none ${cardClass}`}>
                  <div className={`flex justify-between items-center pb-4 border-b mb-6 ${dividerClass}`}>
                    <div>
                      <h3 className={`font-extrabold text-base ${headingText}`}>User Registry</h3>
                      <p className="text-[10px] text-stone-400 font-semibold mt-0.5">Moderate system users login authorization and profiles</p>
                    </div>
                  </div>

                  {loadingData && filteredUsers.length === 0 ? (
                    <div className="flex flex-col gap-3">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className={`h-14 rounded-2xl animate-pulse ${isDarkMode ? "bg-stone-800/60" : "bg-stone-100"}`} />
                      ))}
                    </div>
                  ) : filteredUsers.length === 0 ? (
                    <div className="py-20 flex flex-col items-center justify-center text-center gap-3">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isDarkMode ? "bg-stone-800" : "bg-stone-100"}`}>
                        <SearchX className="w-6 h-6 text-stone-400" />
                      </div>
                      <h4 className={`font-bold text-sm ${headingText}`}>No users found</h4>
                      <p className="text-xs text-stone-400 max-w-xs">{searchTerm ? `Nothing matches "${searchTerm}" — try a different search.` : "No user accounts have been created yet."}</p>
                    </div>
                  ) : (
                    <div className={`overflow-x-auto border rounded-2xl ${dividerClass}`}>
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className={`border-b text-[10px] uppercase tracking-wider font-black text-stone-400 ${isDarkMode ? 'bg-stone-900/50' : 'bg-[#fafaf9]'}`}>
                            <th className="p-4">Name</th>
                            <th className="p-4">Email Address</th>
                            <th className="p-4">Contact Phone</th>
                            <th className="p-4">Access Role</th>
                            <th className="p-4">Signup Date</th>
                            <th className="p-4 text-center">Delete</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginate(filteredUsers).map((u: any) => (
                            <tr key={u._id} className={`border-b last:border-0 transition-colors ${isDarkMode ? "border-stone-800 hover:bg-stone-900/40" : "border-stone-200 hover:bg-primary-50/20"
                              }`}>
                              <td className="p-4">
                                <div className="flex items-center gap-3">
                                  <div className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center font-black text-xs uppercase ${isDarkMode ? "bg-primary-500/15 text-primary-400" : "bg-primary-50 text-primary-600"}`}>
                                    {(u.name || "?").slice(0, 1)}
                                  </div>
                                  <span className={`font-black text-sm ${isDarkMode ? 'text-stone-200' : 'text-stone-800'}`}>{u.name}</span>
                                </div>
                              </td>
                              <td className={`p-4 font-semibold ${isDarkMode ? 'text-stone-300' : 'text-stone-700'}`}>{u.email}</td>
                              <td className={`p-4 font-medium ${isDarkMode ? 'text-stone-300' : 'text-stone-700'}`}>{u.phone || "N/A"}</td>
                              <td className="p-4">
                                <select
                                  value={u.role}
                                  onChange={(e) => handleUpdateUserRole(u._id, e.target.value)}
                                  className="text-[10px] font-black bg-white border border-stone-300 text-stone-700 rounded-xl px-2.5 py-1 outline-none cursor-pointer hover:border-stone-400 transition-colors dark:bg-stone-900 dark:border-stone-700 dark:text-stone-300 bg-none"
                                >
                                  <option value="user">User</option>
                                  <option value="couple">Couple</option>
                                  <option value="vendor">Vendor</option>
                                </select>
                              </td>
                              <td className="p-4 text-stone-500 font-semibold">{formatDate(u.createdAt)}</td>
                              <td className="p-4 text-center">
                                <button
                                  onClick={() => handleDeleteUser(u._id)}
                                  title="Delete user"
                                  className={`p-2 rounded-xl transition-colors cursor-pointer ${isDarkMode ? "text-stone-500 hover:text-red-400 hover:bg-red-500/10" : "text-stone-400 hover:text-red-600 hover:bg-red-50"}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <TablePager total={filteredUsers.length} />
                </div>
              )}

              {/* ─── TAB: INQUIRIES QUEUE ─── */}
              {activeTab === "inquiries" && (
                <div className={`border rounded-3xl overflow-hidden p-6 shadow-none ${cardClass}`}>
                  <div className={`flex flex-col md:flex-row md:items-center justify-between pb-4 border-b mb-6 gap-4 ${dividerClass}`}>
                    <div>
                      <h3 className={`font-extrabold text-base ${headingText}`}>Customer Inquiries Queue</h3>
                      <p className="text-[10px] text-stone-400 font-semibold mt-0.5">Manage customer inquiries, quote requests, and support messages</p>
                    </div>

                    {/* Status Filter Pills */}
                    <div className="flex items-center gap-1.5 p-1 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-100/50 dark:bg-stone-900/50">
                      {["all", "new", "responded", "closed"].map((st) => (
                        <button
                          key={st}
                          onClick={() => setInquiryStatusFilter(st)}
                          className={`px-3 py-1 rounded-xl text-[10px] font-black capitalize transition-all cursor-pointer ${inquiryStatusFilter === st
                            ? "bg-primary-500 text-white shadow-sm"
                            : "text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white"
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>

                  {(() => {
                    const filteredInquiries = inquiries.filter((inq) => {
                      const matchesStatus = inquiryStatusFilter === "all" || inq.status === inquiryStatusFilter;
                      const q = searchTerm.toLowerCase();
                      const matchesSearch = !q || 
                        inq.firstName?.toLowerCase().includes(q) ||
                        inq.lastName?.toLowerCase().includes(q) ||
                        inq.email?.toLowerCase().includes(q) ||
                        inq.message?.toLowerCase().includes(q);
                      return matchesStatus && matchesSearch;
                    });

                    return loadingData && filteredInquiries.length === 0 ? (
                      <div className="flex flex-col gap-3">
                        {[...Array(4)].map((_, i) => (
                          <div key={i} className={`h-16 rounded-2xl animate-pulse ${isDarkMode ? "bg-stone-800/60" : "bg-stone-100"}`} />
                        ))}
                      </div>
                    ) : filteredInquiries.length === 0 ? (
                      <div className="py-20 flex flex-col items-center justify-center text-center gap-3">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isDarkMode ? "bg-stone-800" : "bg-stone-100"}`}>
                          <Mail className="w-6 h-6 text-stone-400" />
                        </div>
                        <h4 className={`font-bold text-sm ${headingText}`}>No inquiries found</h4>
                        <p className="text-xs text-stone-400 max-w-xs">There are no customer inquiries matching your selected filter.</p>
                      </div>
                    ) : (
                      <div className={`overflow-x-auto border rounded-2xl ${dividerClass}`}>
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className={`border-b text-[10px] uppercase tracking-wider font-black text-stone-400 ${isDarkMode ? 'bg-stone-900/50' : 'bg-[#fafaf9]'}`}>
                              <th className="p-4">Customer</th>
                              <th className="p-4">Contact</th>
                              <th className="p-4">Message</th>
                              <th className="p-4">Date</th>
                              <th className="p-4">Status</th>
                              <th className="p-4 text-center">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {paginate(filteredInquiries).map((inq: any) => (
                              <tr key={inq._id} className={`border-b last:border-0 transition-colors ${isDarkMode ? "border-stone-800 hover:bg-stone-900/40" : "border-stone-200 hover:bg-primary-50/20"}`}>
                                <td className="p-4 font-black">
                                  <p className={isDarkMode ? 'text-stone-200' : 'text-stone-800'}>{inq.firstName} {inq.lastName}</p>
                                </td>
                                <td className="p-4">
                                  <p className={`font-semibold ${isDarkMode ? 'text-stone-300' : 'text-stone-700'}`}>{inq.email}</p>
                                  {inq.phone && <p className="text-[10px] text-stone-400 mt-0.5">{inq.phone}</p>}
                                </td>
                                <td className="p-4 max-w-xs">
                                  <p className={`text-xs font-medium line-clamp-2 ${isDarkMode ? 'text-stone-300' : 'text-stone-600'}`}>{inq.message}</p>
                                </td>
                                <td className="p-4 text-stone-500 font-semibold">{formatDate(inq.createdAt)}</td>
                                <td className="p-4">
                                  <select
                                    value={inq.status || "new"}
                                    onChange={(e) => handleUpdateInquiryStatus(inq._id, e.target.value)}
                                    className={`text-[10px] font-black rounded-xl border px-2.5 py-1 outline-none cursor-pointer ${
                                      inq.status === "responded"
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900"
                                        : inq.status === "closed"
                                        ? "bg-stone-100 text-stone-600 border-stone-200 dark:bg-stone-800 dark:text-stone-400 dark:border-stone-700"
                                        : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900"
                                    }`}
                                  >
                                    <option value="new">New</option>
                                    <option value="responded">Responded</option>
                                    <option value="closed">Closed</option>
                                  </select>
                                </td>
                                <td className="p-4 text-center">
                                  <button
                                    onClick={() => handleDeleteInquiry(inq._id)}
                                    title="Delete inquiry"
                                    className={`p-2 rounded-xl transition-colors cursor-pointer ${isDarkMode ? "text-stone-500 hover:text-red-400 hover:bg-red-500/10" : "text-stone-400 hover:text-red-600 hover:bg-red-50"}`}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}
                  <TablePager total={inquiries.length} />
                </div>
              )}

              {/* ─── TAB: PAYOUTS & REVENUE ─── */}
              {activeTab === "payouts" && (
                <div className="flex flex-col gap-6">
                  {/* Revenue Summary Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className={`p-5 rounded-3xl border ${cardClass}`}>
                      <p className="text-[10px] font-black uppercase text-stone-400 tracking-wider">Gross Booking Volume</p>
                      <p className={`text-xl font-extrabold mt-2 ${headingText}`}>
                        {formatAsCurrency(payoutsData?.stats?.totalGrossVolume || 0, "INR")}
                      </p>
                      <p className="text-[10px] text-stone-400 font-semibold mt-1">Total value of all confirmed bookings</p>
                    </div>

                    <div className={`p-5 rounded-3xl border ${cardClass}`}>
                      <p className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">Platform Commission (15%)</p>
                      <p className="text-xl font-extrabold mt-2 text-emerald-600 dark:text-emerald-400">
                        {formatAsCurrency(payoutsData?.stats?.totalCommission || 0, "INR")}
                      </p>
                      <p className="text-[10px] text-stone-400 font-semibold mt-1">SoulsWed platform earnings</p>
                    </div>

                    <div className={`p-5 rounded-3xl border ${cardClass}`}>
                      <p className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 tracking-wider">Pending Vendor Payouts</p>
                      <p className="text-xl font-extrabold mt-2 text-amber-600 dark:text-amber-400">
                        {formatAsCurrency(payoutsData?.stats?.pendingPayoutsAmount || 0, "INR")}
                      </p>
                      <p className="text-[10px] text-stone-400 font-semibold mt-1">Awaiting bank transfer release</p>
                    </div>

                    <div className={`p-5 rounded-3xl border ${cardClass}`}>
                      <p className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 tracking-wider">Released Payouts</p>
                      <p className="text-xl font-extrabold mt-2 text-blue-600 dark:text-blue-400">
                        {formatAsCurrency(payoutsData?.stats?.releasedPayoutsAmount || 0, "INR")}
                      </p>
                      <p className="text-[10px] text-stone-400 font-semibold mt-1">Successfully remitted to vendors</p>
                    </div>
                  </div>

                  {/* Payout Ledger Table */}
                  <div className={`border rounded-3xl overflow-hidden p-6 shadow-none ${cardClass}`}>
                    <div className={`flex justify-between items-center pb-4 border-b mb-6 ${dividerClass}`}>
                      <div>
                        <h3 className={`font-extrabold text-base ${headingText}`}>Vendor Payout Ledger</h3>
                        <p className="text-[10px] text-stone-400 font-semibold mt-0.5">Track vendor net earnings, platform commission deductions, and release payouts</p>
                      </div>
                    </div>

                    {loadingData && !payoutsData ? (
                      <div className="flex flex-col gap-3">
                        {[...Array(4)].map((_, i) => (
                          <div key={i} className={`h-14 rounded-2xl animate-pulse ${isDarkMode ? "bg-stone-800/60" : "bg-stone-100"}`} />
                        ))}
                      </div>
                    ) : !payoutsData?.payouts || payoutsData.payouts.length === 0 ? (
                      <div className="py-20 flex flex-col items-center justify-center text-center gap-3">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isDarkMode ? "bg-stone-800" : "bg-stone-100"}`}>
                          <WalletIcon className="w-6 h-6 text-stone-400" />
                        </div>
                        <h4 className={`font-bold text-sm ${headingText}`}>No payouts recorded</h4>
                        <p className="text-xs text-stone-400 max-w-xs">Payout records will automatically appear when bookings are confirmed or completed.</p>
                      </div>
                    ) : filteredPayouts.length === 0 ? (
                      <div className="py-20 flex flex-col items-center justify-center text-center gap-3">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isDarkMode ? "bg-stone-800" : "bg-stone-100"}`}>
                          <SearchX className="w-6 h-6 text-stone-400" />
                        </div>
                        <h4 className={`font-bold text-sm ${headingText}`}>No matching payouts</h4>
                        <p className="text-xs text-stone-400 max-w-xs">No vendor, customer, or status matches "{searchTerm}".</p>
                      </div>
                    ) : (
                      <div className={`overflow-x-auto border rounded-2xl ${dividerClass}`}>
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className={`border-b text-[10px] uppercase tracking-wider font-black text-stone-400 ${isDarkMode ? 'bg-stone-900/50' : 'bg-[#fafaf9]'}`}>
                              <th className="p-4">Vendor Partner</th>
                              <th className="p-4">Customer</th>
                              <th className="p-4">Gross Total</th>
                              <th className="p-4">Platform Fee (15%)</th>
                              <th className="p-4">Net Vendor Payout</th>
                              <th className="p-4">Payout Status</th>
                              <th className="p-4 text-center">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {paginate(filteredPayouts).map((p: any) => (
                              <tr key={p.bookingId} className={`border-b last:border-0 transition-colors ${isDarkMode ? "border-stone-800 hover:bg-stone-900/40" : "border-stone-200 hover:bg-primary-50/20"}`}>
                                <td className="p-4">
                                  <p className={`font-black text-sm ${isDarkMode ? 'text-stone-200' : 'text-stone-800'}`}>{p.providerName}</p>
                                  <p className="text-[10px] text-stone-400 font-semibold uppercase">{p.bookingType}</p>
                                </td>
                                <td className={`p-4 font-semibold ${isDarkMode ? 'text-stone-300' : 'text-stone-700'}`}>{p.userName}</td>
                                <td className={`p-4 font-black ${isDarkMode ? 'text-stone-200' : 'text-stone-800'}`}>{formatAsCurrency(p.totalAmount, "INR")}</td>
                                <td className="p-4 font-bold text-emerald-600 dark:text-emerald-400">{formatAsCurrency(p.commissionAmount, "INR")}</td>
                                <td className="p-4 font-extrabold text-primary-600 dark:text-primary-400">{formatAsCurrency(p.netVendorPayout, "INR")}</td>
                                <td className="p-4">
                                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide border ${
                                    p.payoutStatus === "released"
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900"
                                      : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900"
                                  }`}>
                                    {p.payoutStatus === "released" ? "Released" : "Pending"}
                                  </span>
                                </td>
                                <td className="p-4 text-center">
                                  <button
                                    onClick={() => handleUpdatePayoutStatus(p.bookingId, p.payoutStatus === "released" ? "pending" : "released")}
                                    className={`px-3 py-1 rounded-xl text-[10px] font-black border transition-all cursor-pointer ${
                                      p.payoutStatus === "released"
                                        ? "bg-stone-100 text-stone-600 border-stone-200 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-400 dark:border-stone-700"
                                        : "bg-primary-500 text-white border-primary-500 hover:bg-primary-600"
                                    }`}
                                  >
                                    {p.payoutStatus === "released" ? "Mark Pending" : "Release Payout"}
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    <TablePager total={filteredPayouts.length} />
                  </div>
                </div>
              )}

              {/* ─── TAB: REVIEWS MODERATION ─── */}
              {activeTab === "reviews" && (
                <div className={`border rounded-3xl overflow-hidden p-6 shadow-none ${cardClass}`}>
                  <div className={`flex justify-between items-center pb-4 border-b mb-6 ${dividerClass}`}>
                    <div>
                      <h3 className={`font-extrabold text-base ${headingText}`}>Customer Reviews Moderation</h3>
                      <p className="text-[10px] text-stone-400 font-semibold mt-0.5">Audit, verify, and moderate customer ratings and review submissions</p>
                    </div>
                  </div>

                  {loadingData && reviewsList.length === 0 ? (
                    <div className="flex flex-col gap-3">
                      {[...Array(4)].map((_, i) => (
                        <div key={i} className={`h-16 rounded-2xl animate-pulse ${isDarkMode ? "bg-stone-800/60" : "bg-stone-100"}`} />
                      ))}
                    </div>
                  ) : reviewsList.length === 0 ? (
                    <div className="py-20 flex flex-col items-center justify-center text-center gap-3">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isDarkMode ? "bg-stone-800" : "bg-stone-100"}`}>
                        <Star className="w-6 h-6 text-stone-400" />
                      </div>
                      <h4 className={`font-bold text-sm ${headingText}`}>No reviews found</h4>
                      <p className="text-xs text-stone-400 max-w-xs">No vendor reviews have been posted yet.</p>
                    </div>
                  ) : (
                    <div className={`overflow-x-auto border rounded-2xl ${dividerClass}`}>
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className={`border-b text-[10px] uppercase tracking-wider font-black text-stone-400 ${isDarkMode ? 'bg-stone-900/50' : 'bg-[#fafaf9]'}`}>
                            <th className="p-4">Author</th>
                            <th className="p-4">Target Vendor</th>
                            <th className="p-4">Rating</th>
                            <th className="p-4">Review Comment</th>
                            <th className="p-4">Date</th>
                            <th className="p-4 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginate(reviewsList).map((r: any) => (
                            <tr key={r.reviewId} className={`border-b last:border-0 transition-colors ${isDarkMode ? "border-stone-800 hover:bg-stone-900/40" : "border-stone-200 hover:bg-primary-50/20"}`}>
                              <td className="p-4 font-black">
                                <p className={isDarkMode ? 'text-stone-200' : 'text-stone-800'}>{r.author}</p>
                              </td>
                              <td className="p-4 font-bold text-primary-600 dark:text-primary-400">{r.vendorName}</td>
                              <td className="p-4">
                                <div className="flex items-center gap-1">
                                  {[...Array(5)].map((_, idx) => (
                                    <Star
                                      key={idx}
                                      className={`w-3.5 h-3.5 ${idx < r.rating ? "text-amber-400 fill-amber-400" : "text-stone-300 dark:text-stone-700"}`}
                                    />
                                  ))}
                                  <span className="text-[10px] font-extrabold ml-1">{r.rating}</span>
                                </div>
                              </td>
                              <td className="p-4 max-w-xs">
                                <p className={`text-xs font-medium line-clamp-2 ${isDarkMode ? 'text-stone-300' : 'text-stone-600'}`}>{r.text}</p>
                              </td>
                              <td className="p-4 text-stone-500 font-semibold">{formatDate(r.date)}</td>
                              <td className="p-4 text-center">
                                <button
                                  onClick={() => handleDeleteReview(r.vendorId, r.reviewId)}
                                  title="Delete review"
                                  className={`p-2 rounded-xl transition-colors cursor-pointer ${isDarkMode ? "text-stone-500 hover:text-red-400 hover:bg-red-500/10" : "text-stone-400 hover:text-red-600 hover:bg-red-50"}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <TablePager total={reviewsList.length} />
                </div>
              )}



              {/* ─── TAB: SETTINGS ─── */}
              {activeTab === "settings" && (
                <div className="flex flex-col gap-8 max-w-3xl">

                  {/* 1. PROFILE AVATAR */}
                  <div className={`rounded-3xl p-6 border shadow-none ${cardClass}`}>
                    <div className={`flex items-center justify-between pb-4 border-b mb-6 ${dividerClass}`}>
                      <div>
                        <h3 className={`font-extrabold text-base ${headingText}`}>Profile Avatar</h3>
                        <p className="text-[10px] text-stone-400 font-semibold mt-0.5">Your administrator profile picture</p>
                      </div>
                    </div>
                    <AvatarUploader
                      currentImage={admin?.profileImage || ""}
                      userName={admin?.name || "Admin"}
                      onAvatarChange={(newImage) => admin && setAdmin({ ...admin, profileImage: newImage })}
                    />
                  </div>

                  {/* 2. APPEARANCE */}
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

                  {/* 3. ACCOUNT SECURITY */}
                  <div className={`rounded-3xl p-6 border shadow-none ${cardClass}`}>
                    <div className={`flex items-center justify-between pb-4 border-b mb-6 ${dividerClass}`}>
                      <div>
                        <h3 className={`font-extrabold text-base ${headingText}`}>Account Security</h3>
                        <p className="text-[10px] text-stone-400 font-semibold mt-0.5">Manage your administrator account password</p>
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

                  {/* 4. SIGN OUT */}
                  <div className={`rounded-3xl p-6 border shadow-none ${cardClass}`}>
                    <div className={`flex items-center justify-between pb-4 border-b mb-6 ${dividerClass}`}>
                      <div>
                        <h3 className={`font-extrabold text-base ${headingText}`}>Session</h3>
                        <p className="text-[10px] text-stone-400 font-semibold mt-0.5">Sign out of your admin account on this device</p>
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

              {/* ─── TAB: SERVICES & VENUES DIRECTORY ─── */}
              {activeTab === "services" && (
                <div className="flex flex-col gap-6">
                  {/* Category Selector */}
                  <div className={`p-5 border rounded-3xl ${cardClass} flex flex-col gap-4`}>
                    <div className="flex items-center justify-between pb-4 border-b border-stone-100 dark:border-stone-800/50">
                      <div>
                        <h3 className={`font-extrabold text-base ${isDarkMode ? "text-white" : "text-slate-900"}`}>Categories</h3>
                        <p className="text-[10px] text-stone-400 font-semibold mt-0.5">Filter the directory by vendor category</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[11px] font-black uppercase tracking-wider ${isDarkMode ? "text-stone-500" : "text-stone-400"}`}>Vendor:</span>
                        <select 
                          value={selectedVendorFilter}
                          onChange={e => setSelectedVendorFilter(e.target.value)}
                          className={`text-xs font-bold rounded-xl px-3 py-2 outline-none border transition-colors cursor-pointer ${isDarkMode ? "bg-stone-900 border-stone-800 text-stone-300 focus:border-primary-500/50" : "bg-white border-stone-200 text-stone-700 focus:border-primary-500/50"}`}
                        >
                          <option value="all">All Vendors</option>
                          {vendors.map(v => (
                            <option key={v._id} value={v._id}>{v.businessName || v.name}</option>
                          ))}
                        </select>
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

                  {selectedCategory === "venues" ? (
                <div className={`border rounded-3xl overflow-hidden p-6 shadow-none ${cardClass}`}>
                  <div className={`flex justify-between items-center pb-4 border-b mb-6 ${dividerClass}`}>
                    <div>
                      <h3 className={`font-extrabold text-base ${headingText}`}>Venue Directory</h3>
                      <p className="text-[10px] text-stone-400 font-semibold mt-0.5">Toggle live status, verified flags, and details on all listings</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-200 px-3.5 py-1.5 rounded-full uppercase tracking-wider dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900">
                        {filteredVenuesList.length} venues total
                      </span>
                      <div className="hidden sm:flex items-center bg-stone-100 dark:bg-stone-800 p-0.5 rounded-lg border border-stone-200 dark:border-stone-700">
                        <button
                          onClick={() => setVenueLayout('grid')}
                          className={`p-1.5 rounded-md transition-all ${venueLayout === 'grid' ? (isDarkMode ? 'bg-stone-700 shadow-sm text-primary-500' : 'bg-white shadow-sm text-primary-500') : 'text-stone-500 hover:text-stone-700 dark:hover:text-stone-300'}`}
                        >
                          <LayoutDashboard className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setVenueLayout('list')}
                          className={`p-1.5 rounded-md transition-all ${venueLayout === 'list' ? (isDarkMode ? 'bg-stone-700 shadow-sm text-primary-500' : 'bg-white shadow-sm text-primary-500') : 'text-stone-500 hover:text-stone-700 dark:hover:text-stone-300'}`}
                        >
                          <ClipboardList className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {loadingData && filteredVenuesList.length === 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 xl:gap-8 max-w-6xl">
                      {[...Array(4)].map((_, i) => (
                        <div key={i} className={`h-[460px] sm:h-[500px] lg:h-[520px] rounded-3xl animate-pulse ${isDarkMode ? "bg-stone-800/60" : "bg-stone-100"}`} />
                      ))}
                    </div>
                  ) : filteredVenuesList.length === 0 ? (
                    <div className="py-20 flex flex-col items-center justify-center text-center gap-3">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isDarkMode ? "bg-stone-800" : "bg-stone-100"}`}>
                        <SearchX className="w-6 h-6 text-stone-400" />
                      </div>
                      <h4 className={`font-bold text-sm ${headingText}`}>No venues found</h4>
                      <p className="text-xs text-stone-400 max-w-xs">{searchTerm ? `Nothing matches "${searchTerm}" — try a different search.` : "No venue listings have been added yet."}</p>
                    </div>
                  ) : (
                    venueLayout === "grid" ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 xl:gap-8 max-w-6xl">
                        {filteredVenuesList.map((v) => {
                          const vendor = vendors.find(vend => vend._id === v.vendorId);
                          const vendorName = vendor ? (vendor.businessName || vendor.name) : "Unknown Vendor";
                          return (
                          <div key={v._id} className="group h-[460px] sm:h-[500px] lg:h-[520px]">
                            <ListingCard
                              name={v.name}
                              image={v.image || (v.gallery && v.gallery[0]) || ""}
                              location={`${v.location || v.city}${v.country ? `, ${v.country}` : ""}`}
                              rating={v.rating || 0}
                              reviewCount={v.reviewCount}
                              priceDisplay={v.price ? `₹${Number(v.price).toLocaleString("en-IN")}` : "—"}
                              unit={`/${v.priceUnit || "per day"}`}
                              priceLabel="starting from"
                              badge={
                                v.featured ? (
                                  <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold text-white shadow-sm" style={{ background: "var(--sw-primary)" }}>
                                    <Star className="w-3 h-3 inline-block" /> Featured
                                  </div>
                                ) : undefined
                              }
                              topRight={
                                <span className={`text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-wide shadow-sm ${v.active ? "bg-emerald-500 text-white" : "bg-amber-400 text-white"}`}>
                                  {v.active ? "Live" : "Hidden"}
                                </span>
                              }
                              tags={
                                <>
                                  <CardTag><UsersIcon className="w-3 h-3" /> {v.minGuests}–{v.maxGuests} pax</CardTag>
                                  {v.type && <CardTag tone="accent">{v.type}</CardTag>}
                                </>
                              }
                              body={
                                <div className="flex items-center gap-1.5 mb-2 mt-[-4px]">
                                  <UserIcon className="w-3 h-3 text-slate-500 dark:text-stone-400" />
                                  <span className="text-[11px] font-medium text-slate-600 dark:text-stone-300 line-clamp-1">By {vendorName}</span>
                                </div>
                              }
                              action={
                                <button
                                  onClick={() => setConfirmDialog({
                                    title: `Delete "${v.name}"?`,
                                    desc: "This venue listing will be permanently removed from the platform. This action cannot be undone.",
                                    onConfirm: async () => {
                                      await fetch(`/api/venues?venueId=${v.venueId}`, { method: "DELETE" });
                                      notify("Venue deleted");
                                      fetchAllData();
                                    },
                                  })}
                                  className="flex items-center justify-center w-9 h-9 rounded-full text-red-500 bg-stone-100 dark:bg-stone-800 hover:bg-red-500 hover:text-white transition-all cursor-pointer shadow-sm"
                                  title="Delete venue"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              }
                              footer={
                                <div className="flex flex-wrap gap-2 mt-[-4px]">
                                  <button
                                    onClick={async () => {
                                      await fetch("/api/venues", {
                                        method: "PATCH",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ venueId: v.venueId, verified: !v.verified }),
                                      });
                                      notify(v.verified ? "Venue marked as pending" : "Venue verified");
                                      fetchAllData();
                                    }}
                                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-all ${v.verified
                                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 hover:bg-emerald-500/20"
                                      : "bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700"
                                      }`}
                                  >
                                    {v.verified ? "Verified" : "Pending"}
                                  </button>
                                  <button
                                    onClick={async () => {
                                      await fetch("/api/venues", {
                                        method: "PATCH",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ venueId: v.venueId, featured: !v.featured }),
                                      });
                                      notify(v.featured ? "Removed from featured" : "Venue featured");
                                      fetchAllData();
                                    }}
                                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-all ${v.featured
                                      ? "bg-orange-500/10 text-orange-600 dark:text-orange-500 hover:bg-orange-500/20"
                                      : "bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700"
                                      }`}
                                  >
                                    {v.featured ? "Featured" : "Regular"}
                                  </button>
                                  <button
                                    onClick={async () => {
                                      await fetch("/api/venues", {
                                        method: "PATCH",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ venueId: v.venueId, active: !v.active }),
                                      });
                                      notify(v.active ? "Venue hidden from site" : "Venue is now live");
                                      fetchAllData();
                                    }}
                                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-all ${v.active
                                      ? "bg-blue-500/10 text-blue-600 dark:text-blue-500 hover:bg-blue-500/20"
                                      : "bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700"
                                      }`}
                                  >
                                    {v.active ? "Live" : "Hidden"}
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
                        {filteredVenuesList.map((v) => {
                          const vendor = vendors.find(vend => vend._id === v.vendorId);
                          const vendorName = vendor ? (vendor.businessName || vendor.name) : "Unknown Vendor";
                          const thumb = v.image || (v.gallery && v.gallery[0]) || "";
                          const price = v.price || "—";
                          
                          return (
                            <div key={v._id} className={`flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl border transition-all hover:border-primary-500/30 ${isDarkMode ? "bg-stone-900/60 border-stone-800" : "bg-white border-stone-200"}`}>
                              <div className="w-full sm:w-40 h-28 rounded-xl overflow-hidden shrink-0 relative">
                                 {thumb ? (
                                   <img src={thumb} alt={v.name} className="w-full h-full object-cover" />
                                 ) : (
                                   <div className={`w-full h-full flex items-center justify-center ${isDarkMode ? "bg-stone-800 text-stone-500" : "bg-stone-100 text-stone-400"}`}>
                                     <Building2 className="w-6 h-6 opacity-50" />
                                   </div>
                                 )}
                                 <span className={`absolute top-2 left-2 text-[8px] font-black px-2 py-0.5 rounded-full uppercase shadow-sm ${v.active ? "bg-emerald-500 text-white" : "bg-amber-400 text-white"}`}>
                                   {v.active ? "Live" : "Pending"}
                                 </span>
                              </div>
                              <div className="flex-1 min-w-0 w-full">
                                 <div className="flex items-start justify-between gap-4">
                                   <div>
                                     <h4 className={`font-bold text-base truncate ${headingText}`}>{v.name}</h4>
                                     <div className="flex flex-col gap-1 mt-1">
                                       <p className="text-xs text-stone-500 flex items-center gap-1 truncate">
                                         <MapPinIcon className="w-3 h-3" /> {`${v.location || v.city}${v.country ? `, ${v.country}` : ""}`}
                                       </p>
                                       <p className="text-xs text-stone-500 flex items-center gap-1 truncate">
                                         <UserIcon className="w-3 h-3" /> By {vendorName}
                                       </p>
                                     </div>
                                   </div>
                                   <div className="text-right shrink-0 hidden sm:block">
                                     <div className="text-xs text-stone-500">starting from</div>
                                     <div className={`font-black text-lg ${isDarkMode ? "text-primary-400" : "text-primary-600"}`}>₹{Number(price).toLocaleString("en-IN") || "—"}<span className="text-xs text-stone-500 font-medium">/{v.priceUnit || "per day"}</span></div>
                                   </div>
                                 </div>
                                 <div className="flex items-center gap-3 mt-4 flex-wrap">
                                   <button
                                     onClick={async () => {
                                       await fetch("/api/venues", {
                                         method: "PATCH",
                                         headers: { "Content-Type": "application/json" },
                                         body: JSON.stringify({ venueId: v.venueId, verified: !v.verified }),
                                       });
                                       notify(v.verified ? "Venue marked as pending" : "Venue verified");
                                       fetchAllData();
                                     }}
                                     className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-all ${v.verified
                                       ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 hover:bg-emerald-500/20"
                                       : "bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700"
                                       }`}
                                   >
                                     {v.verified ? "Verified" : "Pending"}
                                   </button>
                                   <button
                                     onClick={async () => {
                                       await fetch("/api/venues", {
                                         method: "PATCH",
                                         headers: { "Content-Type": "application/json" },
                                         body: JSON.stringify({ venueId: v.venueId, featured: !v.featured }),
                                       });
                                       notify(v.featured ? "Removed from featured" : "Venue featured");
                                       fetchAllData();
                                     }}
                                     className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-all ${v.featured
                                       ? "bg-orange-500/10 text-orange-600 dark:text-orange-500 hover:bg-orange-500/20"
                                       : "bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700"
                                       }`}
                                   >
                                     {v.featured ? "Featured" : "Regular"}
                                   </button>
                                   <button
                                     onClick={async () => {
                                       await fetch("/api/venues", {
                                         method: "PATCH",
                                         headers: { "Content-Type": "application/json" },
                                         body: JSON.stringify({ venueId: v.venueId, active: !v.active }),
                                       });
                                       notify(v.active ? "Venue hidden from site" : "Venue is now live");
                                       fetchAllData();
                                     }}
                                     className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-all ${v.active
                                       ? "bg-blue-500/10 text-blue-600 dark:text-blue-500 hover:bg-blue-500/20"
                                       : "bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700"
                                       }`}
                                   >
                                     {v.active ? "Live" : "Hidden"}
                                   </button>
                                   <span className="text-[11px] ml-auto font-semibold px-2.5 py-1 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 flex items-center gap-1.5"><UsersIcon className="w-3.5 h-3.5 text-stone-400" /> {v.minGuests || 50}–{v.maxGuests || 500} pax</span>
                                   <span className="text-[11px] font-semibold px-2.5 py-1 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 flex items-center gap-1.5">{v.type || "Venue"}</span>
                                 </div>
                              </div>
                              <div className="flex sm:flex-col items-center sm:items-end gap-2 w-full sm:w-auto mt-4 sm:mt-0 pt-4 sm:pt-0 border-t sm:border-l sm:border-t-0 border-stone-100 dark:border-stone-800 sm:pl-4">
                                  <button
                                    onClick={() => setConfirmDialog({
                                      title: `Delete "${v.name}"?`,
                                      desc: "This venue listing will be permanently removed from the platform. This action cannot be undone.",
                                      onConfirm: async () => {
                                        await fetch(`/api/venues?venueId=${v.venueId}`, { method: "DELETE" });
                                        notify("Venue deleted");
                                        fetchAllData();
                                      },
                                    })}
                                    className="flex items-center justify-center w-9 h-9 rounded-full text-red-500 bg-stone-100 dark:bg-stone-800 hover:bg-red-500 hover:text-white transition-all cursor-pointer shadow-sm"
                                    title="Delete venue"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )
                  )}
                </div>
              ) : (() => {
                const currentCat = VENDOR_CATEGORIES.find(c => c.slug === selectedCategory);
                    const catLabel = currentCat ? currentCat.name : selectedCategory;
                    const filteredServices = servicesList.filter(s => {
                      if (s.category !== selectedCategory) return false;
                      if (selectedVendorFilter !== "all" && s.vendorId !== selectedVendorFilter) return false;
                      const term = searchTerm.toLowerCase();
                      return s.name.toLowerCase().includes(term) || s.city.toLowerCase().includes(term);
                    });
                return (
                  <div className={`border rounded-3xl overflow-hidden p-6 shadow-none ${cardClass}`}>
                    <div className={`flex justify-between items-center pb-4 border-b mb-6 ${dividerClass}`}>
                      <div>
                        <h3 className={`font-extrabold text-base capitalize ${headingText}`}>{catLabel} Directory</h3>
                        <p className="text-[10px] text-stone-400 font-semibold mt-0.5">Toggle live status, verified flags, and details on all listings</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-200 px-3.5 py-1.5 rounded-full uppercase tracking-wider dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900">
                          {filteredServices.length} {catLabel} total
                        </span>
                        <div className="hidden sm:flex items-center bg-stone-100 dark:bg-stone-800 p-0.5 rounded-lg border border-stone-200 dark:border-stone-700">
                          <button
                            onClick={() => setServiceLayout('grid')}
                            className={`p-1.5 rounded-md transition-all ${serviceLayout === 'grid' ? (isDarkMode ? 'bg-stone-700 shadow-sm text-primary-500' : 'bg-white shadow-sm text-primary-500') : 'text-stone-500 hover:text-stone-700 dark:hover:text-stone-300'}`}
                          >
                            <LayoutDashboard className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setServiceLayout('list')}
                            className={`p-1.5 rounded-md transition-all ${serviceLayout === 'list' ? (isDarkMode ? 'bg-stone-700 shadow-sm text-primary-500' : 'bg-white shadow-sm text-primary-500') : 'text-stone-500 hover:text-stone-700 dark:hover:text-stone-300'}`}
                          >
                            <ClipboardList className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {loadingData && filteredServices.length === 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 xl:gap-8 max-w-6xl">
                        {[...Array(4)].map((_, i) => (
                          <div key={i} className={`h-[460px] sm:h-[500px] lg:h-[520px] rounded-3xl animate-pulse ${isDarkMode ? "bg-stone-800/60" : "bg-stone-100"}`} />
                        ))}
                      </div>
                    ) : filteredServices.length === 0 ? (
                      <div className="py-20 flex flex-col items-center justify-center text-center gap-3">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isDarkMode ? "bg-stone-800" : "bg-stone-100"}`}>
                          <SearchX className="w-6 h-6 text-stone-400" />
                        </div>
                        <h4 className={`font-bold text-sm capitalize ${headingText}`}>No {catLabel} found</h4>
                        <p className="text-xs text-stone-400 max-w-xs">{searchTerm ? `Nothing matches "${searchTerm}" — try a different search.` : `No ${catLabel} listings have been added yet.`}</p>
                      </div>
                    ) : (
                      serviceLayout === "grid" ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 xl:gap-8 max-w-6xl">
                          {filteredServices.map(s => {
                            const vendor = vendors.find(vend => vend._id === s.vendorId);
                            const vendorName = vendor ? (vendor.businessName || vendor.name) : "Unknown Vendor";
                            return (
                            <div key={s._id} className={`group h-[460px] sm:h-[500px] lg:h-[520px] ${!s.active ? "opacity-70" : ""}`}>
                              <ListingCard
                                name={s.name}
                                image={s.image || ""}
                                location={s.city}
                                rating={s.rating || 0}
                                reviewCount={s.reviewCount}
                                priceDisplay={`₹${Number(s.priceFrom || 0).toLocaleString("en-IN")}`}
                                unit={s.priceUnit ? `/${s.priceUnit}` : undefined}
                                priceLabel="starting at"
                                badge={
                                  s.featured ? (
                                    <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold text-white shadow-sm" style={{ background: "var(--sw-primary)" }}>
                                      <Star className="w-3 h-3 inline-block" /> Featured
                                    </div>
                                  ) : undefined
                                }
                                topRight={
                                  <span className={`text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-wide shadow-sm ${s.active ? "bg-emerald-500 text-white" : "bg-amber-400 text-white"}`}>
                                    {s.active ? "Live" : "Hidden"}
                                  </span>
                                }
                                tags={<CardTag tone="accent">{s.category}</CardTag>}
                                body={
                                  <div className="flex items-center gap-1.5 mb-2 mt-[-4px]">
                                    <UserIcon className="w-3 h-3 text-slate-500 dark:text-stone-400" />
                                    <span className="text-[11px] font-medium text-slate-600 dark:text-stone-300 line-clamp-1">By {vendorName}</span>
                                  </div>
                                }
                                action={
                                  <button
                                    onClick={() => handleDeleteService(s.serviceId)}
                                    className="flex items-center justify-center w-9 h-9 rounded-full text-red-500 bg-stone-100 dark:bg-stone-800 hover:bg-red-500 hover:text-white transition-all cursor-pointer shadow-sm"
                                    title="Delete listing"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                }
                                footer={
                                <div className="flex flex-wrap gap-2 mt-[-4px]">
                                  <button
                                    onClick={() => handleUpdateServiceStatus(s.serviceId, !s.verified, s.featured, s.active)}
                                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-all ${s.verified
                                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 hover:bg-emerald-500/20"
                                      : "bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700"
                                      }`}
                                  >
                                    {s.verified ? "Verified" : "Pending"}
                                  </button>
                                  <button
                                    onClick={() => handleUpdateServiceStatus(s.serviceId, s.verified, !s.featured, s.active)}
                                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-all ${s.featured
                                      ? "bg-orange-500/10 text-orange-600 dark:text-orange-500 hover:bg-orange-500/20"
                                      : "bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700"
                                      }`}
                                  >
                                    {s.featured ? "Featured" : "Regular"}
                                  </button>
                                  <button
                                    onClick={() => handleUpdateServiceStatus(s.serviceId, s.verified, s.featured, !s.active)}
                                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-all ${s.active
                                      ? "bg-blue-500/10 text-blue-600 dark:text-blue-500 hover:bg-blue-500/20"
                                      : "bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700"
                                      }`}
                                  >
                                    {s.active ? "Live" : "Hidden"}
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
                          {filteredServices.map(s => {
                            const vendor = vendors.find(vend => vend._id === s.vendorId);
                            const vendorName = vendor ? (vendor.businessName || vendor.name) : "Unknown Vendor";
                            const thumb = s.image || "";
                            const price = s.priceFrom || 0;
                            
                            return (
                              <div key={s._id} className={`flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl border transition-all hover:border-primary-500/30 ${!s.active ? "opacity-70" : ""} ${isDarkMode ? "bg-stone-900/60 border-stone-800" : "bg-white border-stone-200"}`}>
                                <div className="w-full sm:w-40 h-28 rounded-xl overflow-hidden shrink-0 relative">
                                   {thumb ? (
                                     <img src={thumb} alt={s.name} className="w-full h-full object-cover" />
                                   ) : (
                                     <div className={`w-full h-full flex items-center justify-center ${isDarkMode ? "bg-stone-800 text-stone-500" : "bg-stone-100 text-stone-400"}`}>
                                       <Brush className="w-6 h-6 opacity-50" />
                                     </div>
                                   )}
                                   <span className={`absolute top-2 left-2 text-[8px] font-black px-2 py-0.5 rounded-full uppercase shadow-sm ${s.active ? "bg-emerald-500 text-white" : "bg-amber-400 text-white"}`}>
                                     {s.active ? "Live" : "Pending"}
                                   </span>
                                </div>
                                <div className="flex-1 min-w-0 w-full">
                                   <div className="flex items-start justify-between gap-4">
                                     <div>
                                       <h4 className={`font-bold text-base truncate ${headingText}`}>{s.name}</h4>
                                       <div className="flex flex-col gap-1 mt-1">
                                         <p className="text-xs text-stone-500 flex items-center gap-1 truncate">
                                           <MapPinIcon className="w-3 h-3" /> {s.city}
                                         </p>
                                         <p className="text-xs text-stone-500 flex items-center gap-1 truncate">
                                           <UserIcon className="w-3 h-3" /> By {vendorName}
                                         </p>
                                       </div>
                                     </div>
                                     <div className="text-right shrink-0 hidden sm:block">
                                       <div className="text-xs text-stone-500">starting at</div>
                                       <div className={`font-black text-lg ${isDarkMode ? "text-primary-400" : "text-primary-600"}`}>₹{Number(price).toLocaleString("en-IN")}<span className="text-xs text-stone-500 font-medium">/{s.priceUnit || "event"}</span></div>
                                     </div>
                                   </div>
                                   <div className="flex items-center gap-3 mt-4 flex-wrap">
                                     <button
                                       onClick={() => handleUpdateServiceStatus(s.serviceId, !s.verified, s.featured, s.active)}
                                       className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-all ${s.verified
                                         ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 hover:bg-emerald-500/20"
                                         : "bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700"
                                         }`}
                                     >
                                       {s.verified ? "Verified" : "Pending"}
                                     </button>
                                     <button
                                       onClick={() => handleUpdateServiceStatus(s.serviceId, s.verified, !s.featured, s.active)}
                                       className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-all ${s.featured
                                         ? "bg-orange-500/10 text-orange-600 dark:text-orange-500 hover:bg-orange-500/20"
                                         : "bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700"
                                         }`}
                                     >
                                       {s.featured ? "Featured" : "Regular"}
                                     </button>
                                     <button
                                       onClick={() => handleUpdateServiceStatus(s.serviceId, s.verified, s.featured, !s.active)}
                                       className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-all ${s.active
                                         ? "bg-blue-500/10 text-blue-600 dark:text-blue-500 hover:bg-blue-500/20"
                                         : "bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700"
                                         }`}
                                     >
                                       {s.active ? "Live" : "Hidden"}
                                     </button>
                                     <span className="text-[11px] ml-auto font-semibold px-2.5 py-1 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 flex items-center gap-1.5"><Star className="w-3.5 h-3.5 text-stone-400" /> {s.rating || 0} ({s.reviewCount || 0})</span>
                                     <span className="text-[11px] font-semibold px-2.5 py-1 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 flex items-center gap-1.5">{s.category || "Service"}</span>
                                   </div>
                                </div>
                                <div className="flex sm:flex-col items-center sm:items-end gap-2 w-full sm:w-auto mt-4 sm:mt-0 pt-4 sm:pt-0 border-t sm:border-l sm:border-t-0 border-stone-100 dark:border-stone-800 sm:pl-4">
                                    <button
                                      onClick={() => handleDeleteService(s.serviceId)}
                                      className="flex items-center justify-center w-9 h-9 rounded-full text-red-500 bg-stone-100 dark:bg-stone-800 hover:bg-red-500 hover:text-white transition-all cursor-pointer shadow-sm"
                                      title="Delete listing"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )
                    )}
                  </div>
                );
              })()}
              </div>
            )}


            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* ─── Destructive-action confirmation dialog ─── */}
      <AnimatePresence>
        {confirmDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-stone-950/50 backdrop-blur-sm"
            onClick={() => setConfirmDialog(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.18 }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-sm rounded-3xl border p-6 ${isDarkMode ? "bg-stone-900 border-stone-800" : "bg-white border-stone-200"}`}
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${isDarkMode ? "bg-red-500/10" : "bg-red-50"}`}>
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <h3 className={`font-extrabold text-base ${headingText}`}>{confirmDialog.title}</h3>
              <p className="text-xs text-stone-400 font-semibold mt-1.5 leading-relaxed">{confirmDialog.desc}</p>
              <div className="flex gap-2.5 mt-6">
                <button
                  onClick={() => setConfirmDialog(null)}
                  className={`flex-1 font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer border ${isDarkMode ? "border-stone-700 text-stone-300 hover:bg-stone-800" : "border-stone-200 text-stone-600 hover:bg-stone-50"}`}
                >
                  Cancel
                </button>
                <button
                  onClick={() => { const fn = confirmDialog.onConfirm; setConfirmDialog(null); fn(); }}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Toast notifications ─── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            className="fixed bottom-6 right-6 z-[95] flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-stone-950 text-white border border-stone-800 shadow-2xl"
          >
            <span className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${toast.type === "success" ? "bg-emerald-500/20" : "bg-red-500/20"}`}>
              {toast.type === "success" ? <CheckIcon className="w-3.5 h-3.5 text-emerald-400" /> : <AlertCircle className="w-3.5 h-3.5 text-red-400" />}
            </span>
            <span className="text-xs font-bold">{toast.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
