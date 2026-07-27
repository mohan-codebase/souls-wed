"use client";

// INPUT_CLS / ICON_CLS: shared Tailwind strings used on every field.
// Keeping them as constants avoids the CSS-specificity clash that caused
// global .field-input padding to override Tailwind pl-11.
const INPUT_CLS =
  "w-full bg-white border border-slate-200 rounded-xl px-4 py-3 pl-11 text-sm text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400 transition-all";
const INPUT_PR_CLS =
  "w-full bg-white border border-slate-200 rounded-xl px-4 py-3 pl-11 pr-12 text-sm text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400 transition-all";
const SELECT_CLS =
  "w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400 transition-all appearance-none";
const ICON_CLS = "absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none";

import React, { Suspense, useState, useLayoutEffect, useEffect } from "react";
import Link from "next/link";
import Image from "@/components/shared/CustomImage";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Building, Loader2, AlertCircle, KeyRound, Store, Building2, Wand2 } from "lucide-react";
import { UserIcon } from "@/components/ui/user";
import { PhoneIcon } from "@/components/ui/phone";
import { EyeIcon } from "@/components/ui/eye";
import { EyeOffIcon } from "@/components/ui/eye-off";
import { ArrowLeftIcon } from "@/components/ui/arrow-left";
import { ShieldCheckIcon } from "@/components/ui/shield-check";
import { SparklesIcon } from "@/components/ui/sparkles";

import { PhoneInput } from "@/components/shared/PhoneInput";

type UserRole = "user" | "vendor" | "admin";

import { VENDOR_CATEGORIES } from "@/lib/config/categories";

const categories = VENDOR_CATEGORIES.map(c => c.name);

const cities = ["Mumbai", "Goa", "Udaipur", "Jaipur", "Delhi", "Dubai", "Bali", "Maldives"];

const ROLES: { id: UserRole; label: string; icon: React.ReactNode; subtitle: string }[] = [
  {
    id: "user",
    label: "User",
    icon: <UserIcon className="w-4 h-4" />,
    subtitle: "Create an account to explore venues & manage bookings",
  },
  {
    id: "vendor",
    label: "Vendor",
    icon: <Store className="w-4 h-4" />,
    subtitle: "List your services and start receiving booking inquiries",
  },

  {
    id: "admin",
    label: "Admin",
    icon: <ShieldCheckIcon className="w-4 h-4" />,
    subtitle: "Restricted — authorized personnel only",
  },
];

// Per-role accent palette — identical to the login page
const ACCENT: Record<UserRole, { from: string; to: string; glow: string }> = {
  user: { from: "#f97316", to: "#ea580c", glow: "rgba(249,115,22,0.25)" },
  vendor: { from: "#0ea5e9", to: "#0284c7", glow: "rgba(14,165,233,0.25)" },
  admin: { from: "#7c3aed", to: "#6d28d9", glow: "rgba(124,58,237,0.25)" },
};

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-6 h-6 animate-spin text-primary-500" /></div>}>
      <SignupContent />
    </Suspense>
  );
}

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialRole = (): UserRole => {
    const p = searchParams.get("role");
    return p === "vendor" || p === "admin" || p === "user" ? p : "user";
  };

  const [role, setRole] = useState<UserRole>(initialRole);

  // Common fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState("");

  // Vendor-only
  const [businessName, setBusinessName] = useState("");
  const [category, setCategory] = useState(categories[0]);
  const [city, setCity] = useState(cities[0]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [shake, setShake] = useState(false);

  const generateStrongPassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+";
    let pass = "";
    for (let i = 0; i < 16; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(pass);
    setShowPassword(true);
  };

  // Sync URL changes to state
  useEffect(() => {
    const p = searchParams.get("role");
    if (p === "vendor" || p === "admin" || p === "user") {
      setRole(p);
    }
  }, [searchParams]);

  // Reset fields on role change
  useEffect(() => {
    setName(""); setEmail(""); setPassword(""); setPhone("");
    setBusinessName(""); setCategory(categories[0]); setCity(cities[0]);
    setError(null); setSuccess(false); setShowPassword(false);
  }, [role]);

  // Surface errors bounced back from the OAuth redirect flow
  useEffect(() => {
    const oauthError = searchParams.get("error");
    if (oauthError === "google_auth_failed") {
      setError("Google sign-up failed. Please try again or use your email and password.");
    } else if (oauthError === "google_not_configured") {
      setError("Google sign-up isn't available right now. Please use your email and password.");
    } else if (oauthError === "apple_not_configured") {
      setError("Apple Sign-Up is not configured yet. Please use your email or Google.");
    } else if (oauthError === "twitter_not_configured") {
      setError("Twitter (X) Sign-Up is not configured yet. Please use your email or Google.");
    } else if (oauthError === "apple_auth_failed") {
      setError("Apple sign-up failed. Please try again.");
    } else if (oauthError === "twitter_auth_failed") {
      setError("Twitter (X) sign-up failed. Please try again.");
    }
  }, [searchParams]);

  useLayoutEffect(() => {
    return () => {
      setName(""); setEmail(""); setPassword("");
      setLoading(false); setError(null); setSuccess(false);
    };
  }, []);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name || !email || !password) {
      setError("Please fill in all required fields.");
      triggerShake();
      return;
    }
    if (role === "vendor" && (!businessName || !phone)) {
      setError("Please fill in all business details.");
      triggerShake();
      return;
    }

    // Client-side password validation
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      triggerShake();
      return;
    }
    if (!/(?=.*[a-z])/.test(password)) {
      setError("Password must contain at least one lowercase letter.");
      triggerShake();
      return;
    }
    if (!/(?=.*[A-Z])/.test(password)) {
      setError("Password must contain at least one uppercase letter.");
      triggerShake();
      return;
    }
    if (!/(?=.*[0-9])/.test(password)) {
      setError("Password must contain at least one number.");
      triggerShake();
      return;
    }
    if (!/(?=.*[!@#$%^&*()[\]{}\-_=+|;:'",.<>/?`~])/.test(password)) {
      setError("Password must contain at least one special character.");
      triggerShake();
      return;
    }
    const lowerPass = password.toLowerCase();
    const predictablePatterns = ["12345", "qwerty", "password", "abcde", "admin"];
    for (const pattern of predictablePatterns) {
      if (lowerPass.includes(pattern)) {
        setError("Password is too predictable. Please avoid common sequences or words.");
        triggerShake();
        return;
      }
    }

    setLoading(true);
    try {
      let payload: Record<string, string> = { role, name, email, password };
      if (role === "user") payload = { ...payload, phone };
      if (role === "vendor") payload = { ...payload, businessName, phone, category, city };

      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to register account.");

      setSuccess(true);
      setTimeout(() => router.push(`/verify-email?email=${encodeURIComponent(email)}&role=${role}`), 1800);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed. Please try again.");
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  const accent = ACCENT[role];
  const currentRole = ROLES.find((r) => r.id === role)!;

  return (
    <div
      className="min-h-screen flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden font-body"
      style={{ background: "linear-gradient(135deg, #fff7ed 0%, #fafaf9 50%, #f0f9ff 100%)" }}
    >
      {/* Ambient orbs — same as login */}
      <div
        className="absolute w-[38rem] h-[38rem] -top-40 -left-40 pointer-events-none rounded-full opacity-30"
        style={{ background: `radial-gradient(circle, ${accent.from}, transparent)`, filter: "blur(100px)", transition: "background 0.5s" }}
      />
      <div
        className="absolute w-[32rem] h-[32rem] -bottom-32 -right-32 pointer-events-none rounded-full opacity-20"
        style={{ background: `radial-gradient(circle, ${accent.to}, transparent)`, filter: "blur(100px)", transition: "background 0.5s" }}
      />

      <style jsx global>{`
        @keyframes signupShake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-6px); }
          20%, 40%, 60%, 80% { transform: translateX(6px); }
        }
      `}</style>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md z-10"
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-7">
          <Link href="/" className="group mb-5">
            <Image
              src="/logo/logo-by-soulswed.png"
              alt="SoulsWed"
              width={180}
              height={55}
              className="h-9 w-auto transition-opacity group-hover:opacity-70"
              priority
            />
          </Link>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Create your account</p>
        </div>

        {/* Card */}
        <div
          className="rounded-3xl overflow-hidden"
          style={{
            background: "var(--sw-glass-panel)",
            border: "1.5px solid var(--sw-chip-bg)",
            backdropFilter: "blur(24px)",
            boxShadow: `0 24px 64px ${accent.glow}, 0 4px 16px rgba(0,0,0,0.05)`,
            transition: "box-shadow 0.4s",
          }}
        >
          {/* ── Role Tabs ── */}
          <div className="flex border-b border-slate-100 bg-slate-50">
            {ROLES.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  setRole(r.id);
                  const params = new URLSearchParams(searchParams.toString());
                  params.set("role", r.id);
                  router.replace(`?${params.toString()}`, { scroll: false });
                }}
                className={`flex-1 flex flex-col items-center gap-1 py-3.5 text-[11px] font-bold transition-all cursor-pointer relative ${role === r.id ? "text-slate-900" : "text-slate-400 hover:text-slate-600"
                  }`}
              >
                <span className={`flex items-center gap-1.5 transition-all ${role === r.id ? "scale-110" : ""}`}>
                  {r.icon}
                  {r.label}
                </span>
                {role === r.id && (
                  <motion.div
                    layoutId="signup-role-indicator"
                    className="absolute bottom-0 left-0 right-0 h-[2.5px] rounded-full"
                    style={{ background: accent.from }}
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* ── Form Body ── */}
          <div className="p-8">
            {/* Subtitle */}
            <AnimatePresence mode="wait">
              <motion.p
                key={role + "-sub"}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.2 }}
                className="text-xs text-slate-500 text-center mb-6"
              >
                {currentRole.subtitle}
              </motion.p>
            </AnimatePresence>

            <AnimatePresence mode="wait">
              {success ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center text-center py-6"
                >
                  <div className="relative flex items-center justify-center mb-6 w-24 h-24">
                    {/* Glowing background rings */}
                    <motion.div
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: [1.2, 1.5, 1], opacity: [0.5, 0.2, 0] }}
                      transition={{ duration: 1.5, ease: "easeOut", times: [0, 0.5, 1] }}
                      className="absolute inset-0 rounded-full blur-xl"
                      style={{ background: accent.from }}
                    />
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 200, damping: 20 }}
                      className="relative z-10 w-20 h-20 rounded-full flex items-center justify-center"
                      style={{
                        background: `linear-gradient(135deg, ${accent.from}, ${accent.to})`,
                        boxShadow: `0 0 40px ${accent.glow}`,
                      }}
                    >
                      <motion.svg
                        className="w-10 h-10 text-white"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <motion.path
                          d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
                          initial={{ pathLength: 0, fill: "rgba(255,255,255,0)", scale: 0.8 }}
                          animate={{ pathLength: 1, fill: "rgba(255,255,255,1)", scale: [0.8, 1.1, 1] }}
                          transition={{
                            pathLength: { duration: 0.7, ease: "easeInOut" },
                            fill: { duration: 0.4, ease: "easeOut", delay: 0.5 },
                            scale: { duration: 0.4, ease: "easeOut", delay: 0.5 }
                          }}
                          style={{ originX: "50%", originY: "50%" }}
                        />
                      </motion.svg>
                    </motion.div>
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-1">Registration Complete!</h3>
                  <p className="text-sm text-slate-500">Redirecting to email verification…</p>
                </motion.div>
              ) : role === "admin" ? (
                <motion.div
                  key="admin-redirect"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col items-center justify-center py-6 text-center"
                >
                  <div className="w-16 h-16 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 mb-6 text-2xl">
                    <ShieldCheckIcon className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">Admin Portal</h3>
                  <p className="text-sm text-slate-500 mb-8 px-2">
                    New admin accounts cannot be created publicly. Please log in to the admin console if you have access.
                  </p>
                  <Link
                    href="/login?role=admin"
                    className="w-full py-3.5 rounded-2xl font-bold text-sm tracking-wide text-white flex items-center justify-center transition-all cursor-pointer"
                    style={{
                      background: `linear-gradient(135deg, ${accent.from}, ${accent.to})`,
                      boxShadow: `0 8px 24px ${accent.glow}`,
                    }}
                  >
                    Go to Admin Login
                  </Link>
                </motion.div>
              ) : (
                <motion.form
                  key={role + "-form"}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={handleSubmit}
                  style={{ animation: shake ? "signupShake 0.5s ease-in-out" : undefined }}
                  className="flex flex-col gap-4"
                >
                  {/* Error */}
                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-3.5 flex gap-3 items-start text-red-700 text-xs">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span className="font-medium">{error}</span>
                    </div>
                  )}

                  {/* Full Name */}
                  <Field label={role === "vendor" ? "Contact Person Name" : "Full Name"}>
                    <input
                      type="text"
                      placeholder="Enter full name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={INPUT_CLS}
                      required
                      minLength={2}
                      maxLength={50}
                      autoComplete="name"
                    />
                    <UserIcon className={ICON_CLS} />
                  </Field>

                  {/* Vendor-only: Business Name + Category + City */}
                  {role === "vendor" && (
                    <>
                      <Field label="Business / Brand Name">
                        <input
                          type="text"
                          placeholder="Enter business name"
                          value={businessName}
                          onChange={(e) => setBusinessName(e.target.value)}
                          className={INPUT_CLS}
                          required
                          minLength={2}
                          maxLength={100}
                        />
                        <Building className={ICON_CLS} />
                      </Field>

                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Category">
                          <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className={SELECT_CLS}
                          >
                            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </Field>
                        <Field label="Primary City">
                          <select
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            className={SELECT_CLS}
                          >
                            {cities.map((ct) => <option key={ct} value={ct}>{ct}</option>)}
                          </select>
                        </Field>
                      </div>
                    </>
                  )}

                  {/* PhoneIcon (user + vendor) */}
                  <Field label="Phone Number">
                    <PhoneInput
                      value={phone}
                      onChange={setPhone}
                      placeholder="Enter phone number"
                      disabled={loading}
                      className={shake ? "animate-shake" : ""}
                    />
                  </Field>

                  {/* Email */}
                  <Field label="Email Address">
                    <input
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={INPUT_CLS}
                      required
                      maxLength={100}
                      autoComplete="email"
                    />
                    <Mail className={ICON_CLS} />
                  </Field>

                  {/* Password with show/hide */}
                  <div className="flex flex-col gap-1.5 relative">
                    <div className="flex justify-between items-center ml-1">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Password</label>
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
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="Min. 8 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={INPUT_PR_CLS}
                        required
                        autoComplete="new-password"
                        minLength={8}
                        maxLength={100}
                      />
                      <KeyRound className={ICON_CLS} />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                      >
                        {showPassword ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-1 py-3.5 rounded-2xl font-bold text-sm tracking-wide text-white flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer transition-all"
                    style={{
                      background: `linear-gradient(135deg, ${accent.from}, ${accent.to})`,
                      boxShadow: `0 8px 24px ${accent.glow}`,
                    }}
                  >
                    {loading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Registering…</>
                    ) : (
                      "Create Account"
                    )}
                  </button>

                  {/* Social SSO Options — Google, Apple & Twitter (X) */}
                  <div className="relative flex items-center py-1">
                    <div className="flex-grow border-t border-slate-200" />
                    <span className="flex-shrink-0 mx-4 text-slate-400 text-[11px] font-semibold uppercase tracking-wider">or continue with</span>
                    <div className="flex-grow border-t border-slate-200" />
                  </div>
                  <div className="flex flex-col gap-2.5">
                    <button
                      type="button"
                      onClick={() =>
                        (window.location.href =
                          role === "vendor"
                            ? "/api/auth/google?role=vendor&intent=signup"
                            : "/api/auth/google?role=user")
                      }
                      className="w-full flex items-center justify-center gap-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold py-2.5 rounded-2xl transition-colors text-sm shadow-sm cursor-pointer"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                      </svg>
                      Continue with Google
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        (window.location.href =
                          role === "vendor"
                            ? "/api/auth/apple?role=vendor&intent=signup"
                            : "/api/auth/apple?role=user")
                      }
                      className="w-full flex items-center justify-center gap-2.5 bg-slate-900 hover:bg-black text-white font-semibold py-2.5 rounded-2xl transition-colors text-sm shadow-sm cursor-pointer"
                    >
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 170 170">
                        <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.34.13-9.16-1.9-14.49-6.08-3.34-2.73-7.23-7.44-11.66-14.13-7.55-11.45-13.43-24.63-17.65-39.54-4.21-14.9-6.32-28.52-6.32-40.85 0-14.65 3.65-27.01 10.97-37.08 7.32-10.07 16.59-15.19 27.81-15.36 4.67 0 9.87 1.15 15.6 3.46 5.73 2.31 9.77 3.46 12.13 3.46 2.01 0 6.13-1.22 12.36-3.67 6.23-2.45 11.39-3.56 15.48-3.34 11.83.63 21.49 5.06 28.98 13.31-10.5 6.35-15.65 15.19-15.48 26.52.17 8.91 3.52 16.59 10.05 23.03 6.53 6.44 14.37 10.03 23.51 10.77-2.31 7.15-5.59 14.65-9.84 22.49zm-31.94-106.66c0 6.89-2.48 13.46-7.45 19.72-5.46 6.82-12.08 10.78-19.86 11.87-.25-1.01-.38-2.02-.38-3.03 0-6.98 2.65-13.79 7.95-20.44 5.3-6.64 12.13-10.63 20.49-11.96.17 1.27.25 2.55.25 3.84z"/>
                      </svg>
                      <span>Continue with Apple</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        (window.location.href =
                          role === "vendor"
                            ? "/api/auth/twitter?role=vendor&intent=signup"
                            : "/api/auth/twitter?role=user")
                      }
                      className="w-full flex items-center justify-center gap-2.5 bg-slate-900 hover:bg-black text-white font-semibold py-2.5 rounded-2xl transition-colors text-sm shadow-sm cursor-pointer"
                    >
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                      </svg>
                      <span>Continue with Twitter (X)</span>
                    </button>
                  </div>

                  {/* Already have an account */}
                  <p className="text-center text-slate-500 text-xs mt-1">
                    Already have an account?{" "}
                    <Link
                      href={`/login?role=${role}`}
                      className="font-bold transition-colors"
                      style={{ color: accent.from }}
                    >
                      Sign In
                    </Link>
                  </p>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Back home */}
        <div className="mt-6 flex justify-center">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeftIcon className="w-3.5 h-3.5" />
            Back to SoulsWed
          </Link>
        </div>
      </motion.div>

      {/* signupShake keyframe only — field styles are pure Tailwind now */}
    </div>
  );
}

// ── Reusable field wrapper ──
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">{label}</label>
      <div className="relative">{children}</div>
    </div>
  );
}
