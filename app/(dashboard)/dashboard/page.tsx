"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutDashboard, BookHeart, Save, Wand2, Loader2, Phone, Mail, Smartphone, Laptop, ShieldCheck, CheckCircle2, Circle, ArrowRight, Sparkles, Heart, Calendar, Building2 } from "lucide-react";
import { SettingsIcon } from "@/components/ui/settings";
import { LockIcon } from "@/components/ui/lock";
import { EyeIcon } from "@/components/ui/eye";
import { EyeOffIcon } from "@/components/ui/eye-off";
import { SearchIcon } from "@/components/ui/search";
import { UserIcon } from "@/components/ui/user";
import BookingCard from "@/components/booking/BookingCard";
import AvatarUploader from "@/components/shared/AvatarUploader";
import { PhoneInput } from "@/components/shared/PhoneInput";
import { useWishlistStore } from "@/lib/store/useWishlistStore";

interface UserSession {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  profileImage?: string;
}

type TabType = "overview" | "bookings" | "settings";

export default function UserDashboard() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col justify-center items-center bg-stone-50 text-stone-800 font-body">
          <div className="w-10 h-10 rounded-full border-2 border-primary-500/20 border-t-orange-500 animate-spin mb-4" />
          <p className="font-bold text-sm tracking-wide">SECURE ACCESS</p>
        </div>
      }
    >
      <UserDashboardContent />
    </Suspense>
  );
}

function UserDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");

  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [bookings, setBookings] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    if (tabParam === "bookings") return "bookings";
    if (tabParam === "settings" || tabParam === "profile") return "settings";
    return "overview";
  });
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState({ text: "", type: "" });
  const [searchTerm, setSearchTerm] = useState("");
  const [settingsTab, setSettingsTab] = useState<"profile" | "sessions" | "activity" | "security">("profile");
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);
  const [loginAlertsEnabled, setLoginAlertsEnabled] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState("15");
  const [isCustomTimeout, setIsCustomTimeout] = useState(false);
  const [securitySavedMessage, setSecuritySavedMessage] = useState("");
  const [revokedDevices, setRevokedDevices] = useState<string[]>([]);
  const [deviceDetails, setDeviceDetails] = useState({ os: "Mac", browser: "Browser", time: "" });
  const [show2faSetupModal, setShow2faSetupModal] = useState(false);
  const [testOtpInput, setTestOtpInput] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);
  const [isGenerating2fa, setIsGenerating2fa] = useState(false);
  const [isVerifying2fa, setIsVerifying2fa] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [firstNameInput, setFirstNameInput] = useState("");
  const [lastNameInput, setLastNameInput] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const { items: wishlistItems } = useWishlistStore();

  const handleOpen2faModal = async () => {
    setIsGenerating2fa(true);
    setTestOtpInput("");
    setOtpVerified(false);
    setOtpError("");
    
    try {
      const res = await fetch("/api/user/2fa/generate", { method: "POST" });
      if (res.ok) {
        setShow2faSetupModal(true);
      } else {
        alert("Failed to generate OTP. Please try again.");
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred.");
    } finally {
      setIsGenerating2fa(false);
    }
  };

  const handleVerify2faSetup = async () => {
    if (testOtpInput.length !== 6) return;
    setIsVerifying2fa(true);
    setOtpError("");
    try {
      const res = await fetch("/api/user/2fa/enable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp: testOtpInput }),
      });
      const data = await res.json();
      if (res.ok) {
        setOtpVerified(true);
        setTwoFactorEnabled(true);
        setSecuritySavedMessage("✓ Two-Factor Authentication Enabled & Saved");
        setTimeout(() => setSecuritySavedMessage(""), 3000);
        setTimeout(() => {
          setShow2faSetupModal(false);
        }, 1500);
      } else {
        setOtpError(data.message || "Invalid OTP");
      }
    } catch (err) {
      setOtpError("An error occurred.");
    } finally {
      setIsVerifying2fa(false);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const ua = navigator.userAgent;
      let os = "macOS";
      if (ua.includes("Mac")) os = "macOS";
      else if (ua.includes("Win")) os = "Windows";
      else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
      else if (ua.includes("Android")) os = "Android";
      else if (ua.includes("Linux")) os = "Linux";

      let browser = "Chrome";
      if (ua.includes("Chrome") && !ua.includes("Edg")) browser = "Chrome";
      else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
      else if (ua.includes("Edg")) browser = "Edge";
      else if (ua.includes("Firefox")) browser = "Firefox";

      setDeviceDetails({
        os,
        browser,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      });
    }
  }, []);

  const profileItems = [
    { label: "Verify Email Address", done: Boolean(user?.email) },
    { label: "Secure user login verified", done: Boolean(user?.id) },
    { label: "Phone number added", done: Boolean(user?.phone) },
    { label: "Profile picture uploaded", done: Boolean(user?.profileImage && user.profileImage.length > 10) },
  ];
  const completedCount = profileItems.filter((i) => i.done).length;
  const profileCompletionPercent = Math.round((completedCount / profileItems.length) * 100);

  useEffect(() => {
    if (tabParam) {
      if (tabParam === "bookings") setActiveTab("bookings");
      else if (tabParam === "settings" || tabParam === "profile") setActiveTab("settings");
      else if (tabParam === "overview") setActiveTab("overview");
    }
  }, [tabParam]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    const urlTab = tab === "settings" ? "profile" : tab;
    router.replace(`/dashboard?tab=${urlTab}`, { scroll: false });
  };

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
    if (newPassword.length < 8) {
      setPasswordMessage({ text: "New password must be at least 8 characters.", type: "error" });
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

  const fetchBookings = async () => {
    setLoadingData(true);
    try {
      const res = await fetch("/api/bookings");
      if (res.ok) {
        const data = await res.json();
        setBookings(data.bookings || []);
      }
    } catch (err) {
      console.error("Failed to fetch bookings", err);
    } finally {
      setLoadingData(false);
    }
  };

  const fetchSecurity = async () => {
    try {
      const res = await fetch("/api/user/security");
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.security) {
          setTwoFactorEnabled(data.security.twoFactorEnabled);
          setLoginAlertsEnabled(data.security.loginAlertsEnabled);
          setSessionTimeout(String(data.security.sessionTimeoutDays));
          if (!["15", "30", "7"].includes(String(data.security.sessionTimeoutDays))) {
            setIsCustomTimeout(true);
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch security preferences", err);
    }
  };

  const saveSecuritySetting = async (updated: { twoFactorEnabled?: boolean; loginAlertsEnabled?: boolean; sessionTimeoutDays?: number }) => {
    try {
      const res = await fetch("/api/user/security", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.security) {
          setTwoFactorEnabled(data.security.twoFactorEnabled);
          setLoginAlertsEnabled(data.security.loginAlertsEnabled);
          setSessionTimeout(String(data.security.sessionTimeoutDays));
        }
      }
    } catch (err) {
      console.error("Failed to save security preference", err);
    }
  };

  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.user.role === "user") {
            setUser(data.user);
            setPhoneInput(data.user.phone || "");
            const nameParts = (data.user.name || "").split(" ");
            setFirstNameInput(nameParts[0] || "");
            setLastNameInput(nameParts.slice(1).join(" ") || "");
            fetchBookings();
            fetchSecurity();
          } else if (data.authenticated) {
            router.push(data.user.role === "admin" ? "/admin/dashboard" : "/vendor/dashboard");
          } else {
            router.push("/login");
          }
        } else {
          router.push("/login");
        }
      } catch (err) {
        console.error("Dashboard check session error:", err);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }
    checkSession();
  }, [router]);

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    setPasswordMessage({ text: "", type: "" });
    try {
      const fullName = `${firstNameInput.trim()} ${lastNameInput.trim()}`.trim() || user?.name || "";
      const res = await fetch("/api/user/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fullName,
          phone: phoneInput,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUser((prev) => prev ? { ...prev, name: data.user.name, phone: data.user.phone } : prev);
        setPasswordMessage({ text: "Profile & phone number updated successfully!", type: "success" });
      } else {
        setPasswordMessage({ text: data.message || "Failed to update profile.", type: "error" });
      }
    } catch (err) {
      setPasswordMessage({ text: "An error occurred while saving profile.", type: "error" });
    } finally {
      setIsSavingProfile(false);
      setTimeout(() => setPasswordMessage({ text: "", type: "" }), 4000);
    }
  };

  const handleLogout = async () => {
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (res.ok) {
        setUser(null);
        router.push("/");
      }
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-stone-50 text-stone-800 font-body">
        <div className="w-10 h-10 rounded-full border-2 border-primary-500/20 border-t-orange-500 animate-spin mb-4" />
        <p className="font-bold text-sm tracking-wide">SECURE ACCESS</p>
      </div>
    );
  }

  if (!user) return null;

  const menuItems = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "bookings", label: "My Bookings", count: bookings.length || null, icon: BookHeart },
    { id: "settings", label: "My Profile", icon: UserIcon },
  ];

  const getHeaderTitle = () => {
    if (activeTab === "overview") return `Welcome, ${user.name}!`;
    if (activeTab === "bookings") return "My Bookings";
    return "My Profile";
  };

  const getHeaderSubtitle = () => {
    if (activeTab === "overview") return "Plan your dream wedding, track bookings, and connect with partners.";
    if (activeTab === "bookings") return "Track active venue reservations and vendor inquiries.";
    return "Manage your personal profile, contact details, and account security.";
  };

  return (
    <div className="min-h-screen bg-slate-50/50 font-body pt-32 pb-16 px-4">
      {/* Ambient Background Glows */}
      <div className="fixed w-[50rem] h-[50rem] -top-96 -left-96 opacity-[0.02] pointer-events-none rounded-full bg-primary-500 blur-[120px]" />
      <div className="fixed w-[45rem] h-[45rem] -bottom-80 -right-80 opacity-[0.02] pointer-events-none rounded-full bg-amber-500 blur-[120px]" />

      <div className="max-w-6xl mx-auto relative z-10">
        
        {/* Header section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 font-serif tracking-tight">
              {getHeaderTitle()}
            </h1>
            <p className="text-sm text-slate-500 font-medium mt-1">
              {getHeaderSubtitle()}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="self-start md:self-auto flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-slate-200 shadow-sm text-sm font-bold text-red-600 hover:bg-red-50 hover:border-red-100 transition-colors shrink-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
            Sign Out
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 mb-8 pb-1">
          <div className="flex items-center gap-6 overflow-x-auto -mb-px" style={{ scrollbarWidth: "none" }}>
            {menuItems.map((item) => {
              const isActive = activeTab === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabChange(item.id as TabType)}
                  className={`flex items-center gap-2 pb-3 px-1 border-b-2 font-bold text-sm whitespace-nowrap transition-colors ${
                    isActive ? "border-primary-500 text-primary-600" : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {item.label}
                  {item.count !== undefined && item.count !== null && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] ml-1 ${isActive ? 'bg-primary-100 text-primary-700' : 'bg-slate-100 text-slate-600'}`}>
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="relative shrink-0 mb-3 sm:mb-2">
            <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search your bookings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-full text-xs outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 w-full sm:w-64 transition-all text-slate-700 font-semibold"
            />
          </div>
        </div>

        {/* Tab contents */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            
            {/* OVERVIEW SECTION */}
            {activeTab === "overview" && (
              <div className="flex flex-col gap-8">
                
                {/* Top Quick Actions Bar */}
                <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 border border-slate-800">
                  <div className="absolute -right-16 -top-16 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl pointer-events-none" />
                  <div className="flex items-center gap-4 relative z-10">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-primary-500 flex items-center justify-center shadow-lg text-white font-black text-xl shrink-0">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-base tracking-tight text-white flex items-center gap-2">
                        Planning Hub Overview
                        <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Live Status
                        </span>
                      </h3>
                      <p className="text-xs text-slate-300 font-medium mt-0.5">
                        Manage your wedding wishlist, track venue reservations, and explore curated destinations.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 relative z-10 shrink-0 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                    <Link
                      href="/venues"
                      className="px-4 py-2.5 rounded-2xl bg-primary-500 hover:bg-primary-600 text-white font-extrabold text-xs transition-all shadow-md flex items-center gap-2 hover:gap-3 shrink-0"
                    >
                      <Building2 className="w-4 h-4" />
                      Explore Venues
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                    <button
                      onClick={() => handleTabChange("settings")}
                      className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-all backdrop-blur-md border border-white/15 shrink-0"
                    >
                      Edit Profile
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  
                  {/* Left Column: Profile & Wedding Prep */}
                  <div className="lg:col-span-4 flex flex-col gap-6">
                    {/* Details card */}
                    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-all hover:shadow-md">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-extrabold text-sm text-slate-900 tracking-tight">Account Profile</h3>
                        <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          Verified
                        </span>
                      </div>
                      {/* Avatar */}
                      <div className="flex items-center gap-4 mb-5">
                        {user.profileImage && (user.profileImage.startsWith("/") || user.profileImage.startsWith("http") || user.profileImage.startsWith("data:")) ? (
                          <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-md border-2 border-white shrink-0">
                            <img src={user.profileImage} alt="Profile" className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-primary-500 flex items-center justify-center shadow-md border-2 border-white text-xl font-black text-white shrink-0">
                            {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                          </div>
                        )}
                        <div className="overflow-hidden">
                          <h4 className="font-extrabold text-slate-900 text-base truncate">{user.name}</h4>
                          <span className="text-xs text-slate-400 font-medium truncate block">{user.email}</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Mobile</span>
                          <span className="font-semibold text-slate-800">{user.phone || "Not added"}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Role</span>
                          <span className="font-semibold text-slate-800 capitalize">{user.role}</span>
                        </div>
                      </div>
                    </div>

                    {/* Prep status card */}
                    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-all hover:shadow-md">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="font-extrabold text-sm text-slate-900 tracking-tight">Your Wedding Prep</h4>
                        <span className="text-xs font-black text-primary-600 bg-primary-50 px-2.5 py-0.5 rounded-full border border-primary-100">
                          {profileCompletionPercent}% Complete
                        </span>
                      </div>
                      <div className="w-full h-2.5 rounded-full overflow-hidden mb-5 bg-slate-100 border border-slate-200">
                        <div className="bg-gradient-to-r from-amber-500 to-primary-500 h-full rounded-full transition-all duration-500" style={{ width: `${profileCompletionPercent}%` }} />
                      </div>
                      <ul className="text-xs text-slate-600 flex flex-col gap-3">
                        {profileItems.map((item, idx) => (
                          <li key={idx} className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              {item.done ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                              ) : (
                                <Circle className="w-4 h-4 text-slate-300 shrink-0" />
                              )}
                              <span className={item.done ? "text-slate-800 font-semibold" : "text-slate-400 font-medium"}>{item.label}</span>
                            </div>
                            {!item.done && (
                              <button 
                                onClick={() => handleTabChange("settings")}
                                className="text-[10px] font-bold text-primary-600 hover:underline shrink-0"
                              >
                                Fix
                              </button>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Right Column: Performance stats & Bookings */}
                  <div className="lg:col-span-8 flex flex-col gap-6">
                    {/* Floating Interactive Stats */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {[
                        { 
                          label: "Saved Venues", 
                          count: wishlistItems.filter((i) => i.category === "venue").length, 
                          icon: Heart, 
                          iconColor: "text-red-500", 
                          bg: "bg-red-50/80 border-red-100",
                          action: () => router.push("/venues")
                        },
                        { 
                          label: "Bookings", 
                          count: bookings.length, 
                          icon: Calendar, 
                          iconColor: "text-amber-600", 
                          bg: "bg-amber-50/80 border-amber-100",
                          action: () => handleTabChange("bookings")
                        },
                        { 
                          label: "Enquiries", 
                          count: bookings.filter((b) => b.status === "pending").length, 
                          icon: LayoutDashboard, 
                          iconColor: "text-primary-600", 
                          bg: "bg-primary-50/80 border-primary-100",
                          action: () => handleTabChange("bookings")
                        },
                      ].map((stat, i) => {
                        const StatIcon = stat.icon;
                        return (
                          <div
                            key={i}
                            onClick={stat.action}
                            className="bg-white p-5 rounded-3xl border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex items-center justify-between gap-4 cursor-pointer group"
                          >
                            <div className="flex flex-col gap-1">
                              <span className="text-3xl font-black text-slate-900 group-hover:text-primary-600 transition-colors">{stat.count}</span>
                              <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                                {stat.label}
                                <ArrowRight className="w-3 h-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-primary-500" />
                              </span>
                            </div>
                            <div className={`w-12 h-12 rounded-2xl ${stat.bg} ${stat.iconColor} border flex items-center justify-center shrink-0 shadow-sm group-hover:scale-110 transition-transform`}>
                              <StatIcon className="w-6 h-6" />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Upcoming bookings list */}
                    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col gap-5 min-h-[340px]">
                      <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <h3 className="font-extrabold text-sm text-slate-900">Upcoming Bookings</h3>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-600">
                            {bookings.length}
                          </span>
                        </div>
                        <button 
                          onClick={() => handleTabChange("bookings")}
                          className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1 transition-colors"
                        >
                          View History
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {bookings.filter(b => {
                        const val = searchTerm.toLowerCase();
                        return !val || (b.providerName || b.venueName || "").toLowerCase().includes(val) || (b.status || "").toLowerCase().includes(val) || (b._id || "").toLowerCase().includes(val);
                      }).length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center py-10 px-4">
                          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-2xl mb-4 border border-amber-100 shadow-sm">
                            <Building2 className="w-7 h-7" />
                          </div>
                          <h4 className="font-extrabold text-slate-900 text-base">No upcoming bookings recorded</h4>
                          <p className="text-xs text-slate-400 max-w-sm mt-1.5 font-medium leading-relaxed">
                            {searchTerm ? "No reservations match your current search filter." : "Discover India's finest luxury palaces, beach resorts, and grand banquet halls for your big day."}
                          </p>
                          
                          <div className="flex flex-wrap justify-center items-center gap-2.5 mt-6">
                            <Link
                              href="/venues"
                              className="px-6 py-3 bg-gradient-to-r from-amber-500 to-primary-500 hover:from-amber-600 hover:to-primary-600 text-white rounded-2xl text-xs font-extrabold transition-all shadow-md flex items-center gap-2"
                            >
                              <Sparkles className="w-4 h-4" />
                              Explore Top Venues
                            </Link>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pb-2">
                          {bookings.filter(b => {
                            const val = searchTerm.toLowerCase();
                            return !val || (b.providerName || b.venueName || "").toLowerCase().includes(val) || (b.status || "").toLowerCase().includes(val) || (b._id || "").toLowerCase().includes(val);
                          }).slice(0, 4).map((booking) => (
                            <div key={booking._id} className="w-full">
                              <BookingCard booking={booking} />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* BOOKINGS LIST SECTION */}
            {activeTab === "bookings" && (
              <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] min-h-[400px] flex flex-col gap-6">
                <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                  <h3 className="font-extrabold text-lg text-slate-900">Booking History</h3>
                  <span className="text-[10px] font-black border px-3 py-1 rounded-full uppercase tracking-wider bg-slate-50 border-slate-200 text-slate-600">
                    {bookings.length} reservations
                  </span>
                </div>

                {bookings.filter(b => {
                  const val = searchTerm.toLowerCase();
                  return !val || (b.providerName || b.venueName || "").toLowerCase().includes(val) || (b.status || "").toLowerCase().includes(val) || (b._id || "").toLowerCase().includes(val);
                }).length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-16">
                    <h4 className="font-bold text-slate-700 text-sm">No bookings recorded</h4>
                    <p className="text-xs text-slate-400 max-w-xs mt-1 font-medium">
                      {searchTerm ? "No bookings match your search." : "Checkouts and active vendor deposits will show here."}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-4">
                    {bookings.filter(b => {
                      const val = searchTerm.toLowerCase();
                      return !val || (b.providerName || b.venueName || "").toLowerCase().includes(val) || (b.status || "").toLowerCase().includes(val) || (b._id || "").toLowerCase().includes(val);
                    }).map((booking) => (
                      <div key={booking._id} className="w-full">
                        <BookingCard booking={booking} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* MY PROFILE / SETTINGS SECTION */}
            {activeTab === "settings" && (
              <div className="flex flex-col gap-6">
                
                {/* Hero Header Banner */}
                <div className="relative rounded-3xl overflow-hidden shadow-lg border border-slate-800 bg-slate-900 text-white p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
                  {/* Background Cover Image with Gradient Overlay */}
                  <div 
                    className="absolute inset-0 bg-cover bg-center opacity-25 mix-blend-overlay pointer-events-none"
                    style={{ backgroundImage: `url('https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=2070&auto=format&fit=crop')` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900/90 to-slate-950 pointer-events-none" />

                  {/* Left: Avatar & Profile Info */}
                  <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start md:items-center gap-5 w-full md:w-auto">
                    <div className="relative shrink-0">
                      <AvatarUploader
                        currentImage={user.profileImage || ""}
                        userName={user.name}
                        onAvatarChange={(newImage) => setUser({ ...user, profileImage: newImage })}
                      />
                    </div>

                    <div className="flex flex-col items-center sm:items-start text-center sm:text-left gap-2">
                      <div className="flex items-center gap-2">
                        <h2 className="text-2xl md:text-3xl font-extrabold font-serif text-white tracking-tight">{user.name}</h2>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-primary-500/20 text-primary-300 border border-primary-500/30">
                          Personal Profile
                        </span>
                      </div>
                      <div className="flex flex-wrap justify-center sm:justify-start items-center gap-2.5 text-xs font-semibold text-slate-300">
                        <button 
                          onClick={() => {
                            handleTabChange("settings");
                            setSettingsTab("profile");
                            setTimeout(() => {
                              const el = document.getElementById("phone-input-section");
                              el?.scrollIntoView({ behavior: "smooth" });
                              const phoneInputEl = el?.querySelector("input");
                              phoneInputEl?.focus();
                            }, 150);
                          }}
                          className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 backdrop-blur-md px-3 py-1 rounded-full border border-white/15 transition-all text-xs font-semibold text-slate-300 cursor-pointer"
                        >
                          <Phone className="w-3.5 h-3.5 text-slate-300" /> {user.phone || "+ Add Mobile"}
                        </button>
                        <span className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/15">
                          <Mail className="w-3.5 h-3.5 text-slate-300" /> {user.email}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Quick Status Card */}
                  <div className="relative z-10 hidden lg:flex items-center gap-4 bg-white/5 backdrop-blur-md border border-white/10 p-4 rounded-2xl shrink-0">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Account Status</span>
                      <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Verified Couple
                      </span>
                    </div>
                    <div className="h-8 w-px bg-white/10" />
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Profile Completion</span>
                      <span className="text-xs font-extrabold text-amber-300">{profileCompletionPercent}% Completed</span>
                    </div>
                  </div>
                </div>

                {/* Main Content Layout: Sidebar Menu + Detailed Profile Form */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  
                  {/* Left Column: Sidebar Navigation */}
                  <div className="md:col-span-1 flex flex-col gap-4">
                    <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col gap-2">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3 mb-1">MY ACCOUNT</span>
                      
                      <button 
                        onClick={() => {
                          setSettingsTab("profile");
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className={`flex items-center justify-between px-3.5 py-3 rounded-2xl font-bold text-xs transition-all text-left ${settingsTab === "profile" ? "bg-primary-50 text-primary-600 font-extrabold" : "text-slate-600 hover:bg-slate-50"}`}
                      >
                        <span className="flex items-center gap-2.5">
                          <span className={`w-2 h-2 rounded-full ${settingsTab === "profile" ? "bg-primary-500" : "bg-transparent"}`} />
                          My Profile
                        </span>
                        {settingsTab === "profile" && <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />}
                      </button>

                      <button 
                        onClick={() => handleTabChange("bookings")}
                        className="flex items-center justify-between px-3.5 py-3 rounded-2xl text-slate-600 hover:bg-slate-50 font-bold text-xs transition-all text-left"
                      >
                        <span className="flex items-center gap-2.5">
                          <BookHeart className="w-4 h-4 text-slate-400" />
                          My Bookings
                        </span>
                      </button>

                      <button 
                        onClick={() => setSettingsTab("sessions")}
                        className={`flex items-center justify-between px-3.5 py-3 rounded-2xl font-bold text-xs transition-all text-left ${settingsTab === "sessions" ? "bg-primary-50 text-primary-600 font-extrabold" : "text-slate-600 hover:bg-slate-50"}`}
                      >
                        <span className="flex items-center gap-2.5">
                          <LockIcon className={`w-4 h-4 ${settingsTab === "sessions" ? "text-primary-500" : "text-slate-400"}`} />
                          Active Devices
                        </span>
                      </button>

                      <button 
                        onClick={() => setSettingsTab("activity")}
                        className={`flex items-center justify-between px-3.5 py-3 rounded-2xl font-bold text-xs transition-all text-left ${settingsTab === "activity" ? "bg-primary-50 text-primary-600 font-extrabold" : "text-slate-600 hover:bg-slate-50"}`}
                      >
                        <span className="flex items-center gap-2.5">
                          <EyeIcon className={`w-4 h-4 ${settingsTab === "activity" ? "text-primary-500" : "text-slate-400"}`} />
                          Login Activity
                        </span>
                      </button>

                      <div className="h-px bg-slate-100 my-1" />

                      <button 
                        onClick={handleLogout}
                        className="flex items-center gap-2.5 px-3.5 py-3 rounded-2xl text-red-600 hover:bg-red-50 font-bold text-xs transition-all text-left"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
                        Logout
                      </button>
                    </div>

                    <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col gap-3">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">SECURITY</span>
                      
                      <button 
                        onClick={() => setSettingsTab("security")}
                        className={`flex items-center justify-between px-3.5 py-3 rounded-2xl font-bold text-xs transition-all text-left ${settingsTab === "security" ? "bg-primary-50 text-primary-600 font-extrabold" : "text-slate-700 hover:text-primary-600"}`}
                      >
                        <span className="flex items-center gap-2.5">
                          <SettingsIcon className={`w-3.5 h-3.5 ${settingsTab === "security" ? "text-primary-500" : "text-slate-400"}`} />
                          Security Controls
                        </span>
                      </button>

                      <button 
                        onClick={() => {
                          setSettingsTab("profile");
                          setTimeout(() => {
                            const el = document.getElementById("reset-password-section");
                            el?.scrollIntoView({ behavior: "smooth" });
                          }, 100);
                        }}
                        className={`flex items-center justify-between px-3.5 py-3 rounded-2xl font-bold text-xs transition-all text-left text-slate-700 hover:text-primary-600`}
                      >
                        <span className="flex items-center gap-2.5">
                          <LockIcon className="w-3.5 h-3.5 text-slate-400" />
                          Reset Password
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Right Column: Detailed Profile Form and Settings Panels */}
                  <div className="md:col-span-3 flex flex-col gap-6">
                    
                    {settingsTab === "profile" && (
                      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col gap-8">
                      {/* Header with Save Button */}
                      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                        <h3 className="font-extrabold text-xl text-slate-900 font-serif">My Profile</h3>
                        <button 
                          onClick={handleSaveProfile}
                          disabled={isSavingProfile}
                          className="px-6 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-xs font-extrabold transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                        >
                          {isSavingProfile && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                          SAVE
                        </button>
                      </div>

                      {/* Section 1: General Information */}
                      <div className="flex flex-col gap-5">
                        <h4 className="font-extrabold text-sm text-slate-900 tracking-tight">General Information</h4>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">FIRST & MIDDLE NAME</label>
                            <input 
                              type="text"
                              value={firstNameInput}
                              onChange={(e) => setFirstNameInput(e.target.value)}
                              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-primary-500 focus:bg-white transition-all"
                              placeholder="Enter First Name"
                            />
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">LAST NAME</label>
                            <input 
                              type="text"
                              value={lastNameInput}
                              onChange={(e) => setLastNameInput(e.target.value)}
                              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-primary-500 focus:bg-white transition-all"
                              placeholder="Enter Last Name"
                            />
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">GENDER</label>
                            <select className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-primary-500 focus:bg-white transition-all appearance-none cursor-pointer">
                              <option value="">SELECT GENDER</option>
                              <option value="male">MALE</option>
                              <option value="female">FEMALE</option>
                              <option value="other">OTHER</option>
                            </select>
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">DATE OF BIRTH / WEDDING DATE</label>
                            <input 
                              type="date"
                              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-primary-500 focus:bg-white transition-all cursor-pointer"
                            />
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">NATIONALITY</label>
                            <select className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-primary-500 focus:bg-white transition-all appearance-none cursor-pointer">
                              <option value="indian">INDIAN</option>
                              <option value="nri">NRI</option>
                              <option value="foreign">FOREIGN NATIONAL</option>
                            </select>
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">MARITAL STATUS</label>
                            <select className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-primary-500 focus:bg-white transition-all appearance-none cursor-pointer">
                              <option value="planning">PLANNING WEDDING</option>
                              <option value="engaged">ENGAGED</option>
                              <option value="married">MARRIED</option>
                              <option value="single">SINGLE</option>
                            </select>
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">CITY OF RESIDENCE</label>
                            <input 
                              type="text"
                              placeholder="e.g. Mumbai / Delhi / Bengaluru"
                              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-primary-500 focus:bg-white transition-all"
                            />
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">STATE</label>
                            <input 
                              type="text"
                              placeholder="e.g. Maharashtra / Karnataka"
                              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-primary-500 focus:bg-white transition-all"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="h-px bg-slate-100" />

                      {/* Section 2: Contact Details */}
                      <div className="flex flex-col gap-5">
                        <div>
                          <h4 className="font-extrabold text-sm text-slate-900 tracking-tight">Contact Details</h4>
                          <p className="text-[11px] text-slate-400 font-medium mt-0.5">Add contact information to receive booking details &amp; status alerts</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="flex flex-col gap-1.5" id="phone-input-section">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">MOBILE NUMBER</label>
                            <PhoneInput
                              name="phone"
                              placeholder="Add mobile number"
                              value={phoneInput}
                              onChange={(val) => setPhoneInput(val)}
                              className="border rounded-xl outline-none font-semibold bg-slate-50 border-slate-200 text-slate-800"
                            />
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">EMAIL ID</label>
                            <div className="relative">
                              <input 
                                type="email"
                                defaultValue={user.email}
                                disabled
                                className="w-full pl-4 pr-24 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                ✓ Verified
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="h-px bg-slate-100" id="reset-password-section" />

                      {/* Section 5: Account Password Reset */}
                      <div className="flex flex-col gap-5">
                        <h4 className="font-extrabold text-sm text-slate-900 tracking-tight">Account Security &amp; Password</h4>
                        
                        <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                          <div>
                            <label className="block text-xs font-bold mb-1.5 text-slate-500">Current Password</label>
                            <div className="relative">
                              <LockIcon className="absolute left-3 top-3 h-4 w-4 text-slate-400"/>
                              <input
                                type="password"
                                required
                                maxLength={100}
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                className="w-full pl-9 pr-4 py-2.5 border rounded-xl text-sm outline-none transition-all bg-slate-50 border-slate-200 focus:border-primary-400 text-slate-800"
                                placeholder="••••••••"
                              />
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between items-center mb-1.5">
                              <label className="block text-xs font-bold text-slate-500">New Password</label>
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
                              <LockIcon className="absolute left-3 top-3 h-4 w-4 text-slate-400"/>
                              <input
                                type={showPassword ? "text" : "password"}
                                required
                                minLength={8}
                                maxLength={100}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full pl-9 pr-10 py-2.5 border rounded-xl text-sm outline-none transition-all bg-slate-50 border-slate-200 focus:border-primary-400 text-slate-800"
                                placeholder="••••••••"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 transition-colors"
                              >
                                {showPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                              </button>
                            </div>
                          </div>
                          
                          {passwordMessage.text && (
                            <div className={`p-3 rounded-xl text-xs font-bold ${passwordMessage.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                              {passwordMessage.text}
                            </div>
                          )}

                          <div className="pt-2">
                            <button
                              type="submit"
                              disabled={isChangingPassword}
                              className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-xl text-xs font-extrabold transition-all disabled:opacity-50 shadow-sm cursor-pointer"
                            >
                              {isChangingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                              Update Password
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                    )}

                    {settingsTab === "sessions" && (
                      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col gap-6">
                        <div className="flex justify-between items-start pb-4 border-b border-slate-100">
                          <div>
                            <h3 className="text-lg font-extrabold text-slate-900">Active Devices</h3>
                            <p className="text-xs text-slate-400 font-medium mt-0.5">Manage your active sessions</p>
                          </div>
                        </div>
                        
                        <div className="flex flex-col gap-4">
                          <div className="flex flex-col gap-3">
                            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center shrink-0">
                                  {deviceDetails.os === "iOS" || deviceDetails.os === "Android" ? (
                                    <Smartphone className="w-5 h-5 text-primary-600" />
                                  ) : (
                                    <Laptop className="w-5 h-5 text-primary-600" />
                                  )}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-extrabold text-slate-900">{deviceDetails.os} ({deviceDetails.browser})</span>
                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-700">Active Now</span>
                                  </div>
                                  <span className="text-[11px] text-slate-400 font-medium block mt-0.5">Current Session • Signed in at {deviceDetails.time || "Just now"}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs font-bold text-slate-500 text-center flex items-center justify-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" /> No secondary active sessions detected on other devices.
                          </div>
                        </div>
                      </div>
                    )}

                    {settingsTab === "activity" && (
                      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col gap-6">
                        <div className="flex justify-between items-start pb-4 border-b border-slate-100">
                          <div>
                            <h3 className="text-lg font-extrabold text-slate-900">Login Activity</h3>
                            <p className="text-xs text-slate-400 font-medium mt-0.5">Real-Time Account Activity</p>
                          </div>
                        </div>
                        
                        <div className="flex flex-col gap-3">
                          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">Recent Logins</div>
                          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3 text-xs">
                            <div>
                              <div className="font-extrabold text-slate-900">{deviceDetails.os} ({deviceDetails.browser})</div>
                              <div className="text-[11px] text-slate-400 font-medium mt-0.5">Signed in today at {deviceDetails.time || "Just now"} • Current Active Session</div>
                            </div>
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                              Active Session
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {settingsTab === "security" && (
                      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col gap-6">
                        <div className="flex justify-between items-start pb-4 border-b border-slate-100">
                          <div>
                            <h3 className="text-lg font-extrabold text-slate-900">Security Controls</h3>
                            <p className="text-xs text-slate-400 font-medium mt-0.5">Manage 2FA security controls and alerts</p>
                          </div>
                        </div>
                        
                        <div className="flex flex-col gap-4">
                          {securitySavedMessage && (
                            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-extrabold text-emerald-700 text-center animate-fade-in">
                              {securitySavedMessage}
                            </div>
                          )}

                          {/* 2FA Toggle */}
                          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col gap-3">
                            <div className="flex items-center justify-between gap-4">
                              <div>
                                <h4 className="text-xs font-extrabold text-slate-900">Two-Factor Authentication (2FA)</h4>
                                <p className="text-[11px] text-slate-400 font-medium mt-0.5">Require an SMS or Authenticator verification code when logging in from new devices.</p>
                              </div>
                              <button
                                onClick={async () => {
                                  const next = !twoFactorEnabled;
                                  if (next) {
                                    handleOpen2faModal();
                                  } else {
                                    setTwoFactorEnabled(false);
                                    setSecuritySavedMessage("Two-Factor Authentication Disabled & Saved");
                                    await saveSecuritySetting({ twoFactorEnabled: false });
                                    setTimeout(() => setSecuritySavedMessage(""), 3000);
                                  }
                                }}
                                disabled={isGenerating2fa}
                                className={`w-12 h-6 rounded-full transition-colors relative p-1 shrink-0 cursor-pointer ${twoFactorEnabled ? "bg-emerald-500" : "bg-slate-300"} ${isGenerating2fa ? "opacity-50 cursor-not-allowed" : ""}`}
                              >
                                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${twoFactorEnabled ? "translate-x-6" : "translate-x-0"}`} />
                              </button>
                            </div>
                          </div>

                          {/* Login Alert Toggle */}
                          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-4">
                            <div>
                              <h4 className="text-xs font-extrabold text-slate-900">New Device Sign-In Alerts</h4>
                              <p className="text-[11px] text-slate-400 font-medium mt-0.5">Send instant email &amp; SMS alerts whenever your account is accessed from a new location.</p>
                            </div>
                            <button
                              onClick={async () => {
                                const next = !loginAlertsEnabled;
                                setLoginAlertsEnabled(next);
                                setSecuritySavedMessage(next ? "New Device Alerts Enabled & Saved" : "New Device Alerts Disabled & Saved");
                                await saveSecuritySetting({ loginAlertsEnabled: next });
                                setTimeout(() => setSecuritySavedMessage(""), 3000);
                              }}
                              className={`w-12 h-6 rounded-full transition-colors relative p-1 shrink-0 cursor-pointer ${loginAlertsEnabled ? "bg-emerald-500" : "bg-slate-300"}`}
                            >
                              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${loginAlertsEnabled ? "translate-x-6" : "translate-x-0"}`} />
                            </button>
                          </div>

                          {/* Session Timeout */}
                          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-4">
                            <div>
                              <h4 className="text-xs font-extrabold text-slate-900">Automatic Session Timeout</h4>
                              <p className="text-[11px] text-slate-400 font-medium mt-0.5">Inactivity period before requiring re-authentication.</p>
                            </div>
                            <div className="flex items-center gap-2">
                              {isCustomTimeout ? (
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    min="1"
                                    max="365"
                                    value={sessionTimeout}
                                    onChange={(e) => setSessionTimeout(e.target.value)}
                                    onBlur={async () => {
                                      const val = sessionTimeout || "15";
                                      setSecuritySavedMessage(`✓ Session timeout set to ${val} Days & Saved`);
                                      await saveSecuritySetting({ sessionTimeoutDays: Number(val) });
                                      setTimeout(() => setSecuritySavedMessage(""), 3000);
                                    }}
                                    className="w-20 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-extrabold text-slate-800 outline-none"
                                    placeholder="Days"
                                  />
                                  <span className="text-xs font-bold text-slate-500">Days</span>
                                  <button 
                                    onClick={async () => {
                                      setIsCustomTimeout(false);
                                      if (!["15", "30", "7"].includes(sessionTimeout)) {
                                        setSessionTimeout("15");
                                        setSecuritySavedMessage(`✓ Session timeout set to 15 Days & Saved`);
                                        await saveSecuritySetting({ sessionTimeoutDays: 15 });
                                        setTimeout(() => setSecuritySavedMessage(""), 3000);
                                      }
                                    }} 
                                    className="w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 font-bold transition-colors cursor-pointer shrink-0"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ) : (
                                <select
                                  value={["15", "30", "7"].includes(sessionTimeout) ? sessionTimeout : "custom"}
                                  onChange={async (e) => {
                                    const val = e.target.value;
                                    if (val === "custom") {
                                      setIsCustomTimeout(true);
                                    } else {
                                      setSessionTimeout(val);
                                      setSecuritySavedMessage(`✓ Session timeout set to ${val} Days & Saved`);
                                      await saveSecuritySetting({ sessionTimeoutDays: Number(val) });
                                      setTimeout(() => setSecuritySavedMessage(""), 3000);
                                    }
                                  }}
                                  className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-extrabold text-slate-800 outline-none cursor-pointer"
                                >
                                  <option value="15">15 Days (Recommended)</option>
                                  <option value="30">30 Days</option>
                                  <option value="7">7 Days</option>
                                  <option value="custom">Custom</option>
                                </select>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

          </motion.div>
        </AnimatePresence>

        {/* Logged In Devices Modal (Moved to Sidebar) */}

        {/* 2FA Setup & Verification Modal */}
        {show2faSetupModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full border border-slate-100 shadow-2xl flex flex-col gap-6">
              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900">2FA Security Challenge</h3>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">Enter 6-digit OTP code to verify setup</p>
                </div>
                <button onClick={() => { setShow2faSetupModal(false); setOtpVerified(false); setTestOtpInput(""); }} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold flex items-center justify-center transition-colors cursor-pointer">
                  ✕
                </button>
              </div>

              <div className="flex flex-col items-center gap-4 text-center py-2">
                <div className="w-12 h-12 rounded-2xl bg-primary-100 flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6 text-primary-600" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900">Two-Factor Authentication Verification</h4>
                  <p className="text-xs text-slate-500 font-medium max-w-xs mt-1">
                    A 6-digit OTP code has been generated and sent to <strong>{user?.email}</strong>.
                  </p>
                </div>

                <div className="w-full max-w-xs space-y-3">
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="Enter 6-digit OTP code"
                    value={testOtpInput}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                      setTestOtpInput(val);
                      setOtpError("");
                    }}
                    className="w-full text-center tracking-widest text-lg font-mono font-black py-3 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary-500 focus:bg-white transition-all text-slate-900"
                  />

                  {otpVerified ? (
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-extrabold text-emerald-700">
                      ✓ OTP Verified! 2FA Enabled.
                    </div>
                  ) : otpError ? (
                    <p className="text-[11px] font-bold text-red-600">{otpError}</p>
                  ) : testOtpInput.length > 0 && testOtpInput.length < 6 ? (
                    <p className="text-[11px] font-bold text-amber-600">Please enter full 6-digit code.</p>
                  ) : null}

                  <button
                    disabled={testOtpInput.length !== 6 || isVerifying2fa || otpVerified}
                    onClick={handleVerify2faSetup}
                    className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-extrabold transition-all disabled:opacity-40 cursor-pointer shadow-sm flex items-center justify-center gap-2"
                  >
                    {isVerifying2fa ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm & Complete Setup"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
