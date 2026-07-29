"use client";

import React, { Suspense, useState, useEffect, useLayoutEffect } from "react";
import Link from "next/link";
import Image from "@/components/shared/CustomImage";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Loader2, AlertCircle, Store } from "lucide-react";
import { LockIcon } from "@/components/ui/lock";
import { ArrowLeftIcon } from "@/components/ui/arrow-left";
import { EyeIcon } from "@/components/ui/eye";
import { EyeOffIcon } from "@/components/ui/eye-off";
import { UserIcon } from "@/components/ui/user";
import { ShieldCheckIcon } from "@/components/ui/shield-check";
import { CheckIcon } from "@/components/ui/check";

type UserRole = "user" | "vendor" | "admin";

const ROLES: { id: UserRole; label: string; icon: React.ReactNode; subtitle: string; cta: string; redirect: string }[] = [
  {
    id: "user",
    label: "User",
    icon: <UserIcon className="w-4 h-4" />,
    subtitle: "Manage bookings, explore venues & plan your dream wedding",
    cta: "Sign In",
    redirect: "/dashboard",
  },
  {
    id: "vendor",
    label: "Vendor",
    icon: <Store className="w-4 h-4" />,
    subtitle: "Manage your listing, respond to inquiries & track bookings",
    cta: "Partner Sign In",
    redirect: "/vendor/dashboard",
  },
  {
    id: "admin",
    label: "Admin",
    icon: <ShieldCheckIcon className="w-4 h-4" />,
    subtitle: "Restricted access — authorized personnel only",
    cta: "Access Console",
    redirect: "/admin/dashboard",
  },
];

export default function UnifiedLoginPage() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <LoginContent />
    </Suspense>
  );
}

function LoginSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
    </div>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialRole = (): UserRole => {
    const p = searchParams.get("role");
    return p === "vendor" || p === "admin" || p === "user" ? p : "user";
  };

  const [role, setRole] = useState<UserRole>(initialRole);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [shake, setShake] = useState(false);
  const [show2FA, setShow2FA] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [verifying2FA, setVerifying2FA] = useState(false);

  // Sync URL changes to state
  useEffect(() => {
    const p = searchParams.get("role");
    if (p === "vendor" || p === "admin" || p === "user") {
      setRole(p);
    }
  }, [searchParams]);

  // Reset form when switching roles
  useEffect(() => {
    setEmail("");
    setPassword("");
    setError(null);
    setSuccess(false);
    setShowPassword(false);
  }, [role]);

  // Surface errors bounced back from the OAuth redirect flow
  useEffect(() => {
    const oauthError = searchParams.get("error");
    if (oauthError === "google_auth_failed") {
      setError("Google sign-in failed. Please try again or use your email and password.");
    } else if (oauthError === "google_not_configured") {
      setError("Google sign-in isn't available right now. Please use your email and password.");
    } else if (oauthError === "google_no_vendor_account") {
      setError("No vendor account found for that Google email. Please create an account first.");
    } else if (oauthError === "apple_not_configured") {
      setError("Apple Sign-In is not configured yet. Please use your email or Google.");
    } else if (oauthError === "twitter_not_configured") {
      setError("Twitter (X) Sign-In is not configured yet. Please use your email or Google.");
    } else if (oauthError === "apple_auth_failed") {
      setError("Apple sign-in failed. Please try again.");
    } else if (oauthError === "twitter_auth_failed") {
      setError("Twitter (X) sign-in failed. Please try again.");
    }
  }, [searchParams]);

  // CheckIcon existing session on mount
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.authenticated) {
          if (data.user.role === "admin") router.replace("/admin/dashboard");
          else if (data.user.role === "vendor") router.replace("/vendor/dashboard");
          else router.replace("/dashboard");
        }
      })
      .catch(() => { });
  }, [router]);

  useLayoutEffect(() => {
    return () => {
      setEmail("");
      setPassword("");
      setLoading(false);
      setError(null);
      setSuccess(false);
    };
  }, []);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!email || !password) {
      setError("Please fill in all fields.");
      setLoading(false);
      triggerShake();
      return;
    }

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Invalid credentials.");

      if (data.requires2FA) {
        setShow2FA(true);
        setLoading(false);
        return;
      }

      setSuccess(true);
      const target = ROLES.find((r) => r.id === role)?.redirect ?? "/dashboard";
      setTimeout(() => router.push(target), 1400);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setVerifying2FA(true);

    if (!otpCode || otpCode.length !== 6) {
      setError("Please enter a valid 6-digit OTP.");
      setVerifying2FA(false);
      triggerShake();
      return;
    }

    try {
      const res = await fetch("/api/auth/verify-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role, otp: otpCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Invalid OTP.");

      setSuccess(true);
      const target = ROLES.find((r) => r.id === role)?.redirect ?? "/dashboard";
      setTimeout(() => router.push(target), 1400);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      triggerShake();
    } finally {
      setVerifying2FA(false);
    }
  };

  const currentRole = ROLES.find((r) => r.id === role)!;

  // Accent colour per role
  const accent =
    role === "admin"
      ? { from: "#7c3aed", to: "#6d28d9", glow: "rgba(124,58,237,0.25)", badge: "bg-violet-100 text-violet-700 border-violet-200" }
      : role === "vendor"
        ? { from: "#0ea5e9", to: "#0284c7", glow: "rgba(14,165,233,0.25)", badge: "bg-sky-100 text-sky-700 border-sky-200" }
        : { from: "#f97316", to: "#ea580c", glow: "rgba(249,115,22,0.25)", badge: "bg-primary-100 text-primary-700 border-primary-200" };

  return (
    <div
      className="min-h-screen flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden font-body"
      style={{ background: "linear-gradient(135deg, #fff7ed 0%, #fafaf9 50%, #f0f9ff 100%)" }}
    >
      {/* Ambient orbs */}
      <div
        className="absolute w-[38rem] h-[38rem] -top-40 -left-40 pointer-events-none rounded-full opacity-30"
        style={{ background: `radial-gradient(circle, ${accent.from}, transparent)`, filter: "blur(100px)", transition: "background 0.5s" }}
      />
      <div
        className="absolute w-[32rem] h-[32rem] -bottom-32 -right-32 pointer-events-none rounded-full opacity-20"
        style={{ background: `radial-gradient(circle, ${accent.to}, transparent)`, filter: "blur(100px)", transition: "background 0.5s" }}
      />

      <style jsx global>{`
        @keyframes unifiedShake {
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
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Welcome back</p>
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
                <span
                  className={`flex items-center gap-1.5 transition-all ${role === r.id ? "scale-110" : ""}`}
                >
                  {r.icon}
                  {r.label}
                </span>
                {/* Active indicator */}
                {role === r.id && (
                  <motion.div
                    layoutId="role-indicator"
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
            {/* Role subtitle */}
            <AnimatePresence mode="wait">
              <motion.div
                key={role + "-header"}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="mb-6"
              >
                {role === "admin" && (
                  <div
                    className="mb-4 px-4 py-2 rounded-xl text-xs font-semibold text-center"
                    style={{ background: "#fdf4ff", border: "1px solid #e9d5ff", color: "#7c3aed" }}
                  >
                    All access attempts are logged and monitored
                  </div>
                )}
                <p className="text-xs text-slate-500 text-center">{currentRole.subtitle}</p>
              </motion.div>
            </AnimatePresence>

            {/* ── Form ── */}
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
                  <h3 className="text-xl font-bold text-slate-800 mb-1">Welcome!</h3>
                  <p className="text-sm text-slate-500">Preparing your dashboard…</p>
                </motion.div>
              ) : show2FA ? (
                <motion.form
                  key="2fa-form"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={handleVerify2FA}
                  style={{ animation: shake ? "unifiedShake 0.5s ease-in-out" : undefined }}
                  className="flex flex-col gap-4 text-center"
                >
                  <ShieldCheckIcon className="w-12 h-12 mx-auto text-primary-500 mb-2" />
                  <h3 className="text-xl font-bold text-slate-800">Two-Step Verification</h3>
                  <p className="text-sm text-slate-500 mb-4">
                    Enter the 6-digit code we just sent to <strong className="text-slate-700">{email}</strong>
                  </p>
                  
                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 flex gap-3 items-start text-red-700 text-xs text-left mb-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span className="font-medium">{error}</span>
                    </div>
                  )}

                  <div className="flex flex-col gap-1.5 text-left">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                      Verification Code
                    </label>
                    <input
                      type="text"
                      placeholder="Enter 6-digit OTP"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-center text-2xl tracking-widest font-bold text-slate-900 placeholder-slate-300 outline-none focus:ring-2 transition-all"
                      style={{ "--tw-ring-color": accent.from } as React.CSSProperties}
                      required
                      maxLength={6}
                      autoComplete="one-time-code"
                      autoFocus
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={verifying2FA || otpCode.length !== 6}
                    className="w-full mt-4 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg transition-all active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none relative overflow-hidden group flex items-center justify-center gap-2"
                    style={{ background: `linear-gradient(to right, ${accent.from}, ${accent.to})` }}
                  >
                    {verifying2FA ? <Loader2 className="w-5 h-5 animate-spin" /> : <><ShieldCheckIcon className="w-5 h-5" /> Verify & Login</>}
                  </button>

                  <button
                    type="button"
                    onClick={() => { setShow2FA(false); setOtpCode(""); }}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-700 mt-2 transition-colors"
                  >
                    Back to login
                  </button>
                </motion.form>
              ) : (
                <motion.form
                  key={role + "-form"}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={handleSubmit}
                  style={{
                    animation: shake ? "unifiedShake 0.5s ease-in-out" : undefined,
                  }}
                  className="flex flex-col gap-4"
                >
                  {/* Error */}
                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 flex gap-3 items-start text-red-700 text-xs">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span className="font-medium">{error}</span>
                    </div>
                  )}

                  {/* Email */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                      Email Address
                    </label>
                    <div className="relative">
                      <input
                        id="login-email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:ring-2 transition-all pl-11"
                        style={{ "--tw-ring-color": accent.from } as React.CSSProperties}
                        required
                        maxLength={100}
                        autoComplete="email"
                      />
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:ring-2 transition-all pl-11 pr-12"
                        style={{ "--tw-ring-color": accent.from } as React.CSSProperties}
                        required
                        maxLength={100}
                        autoComplete="current-password"
                      />
                      <LockIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                      >
                        {showPassword ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Remember / Forgot */}
                  {role !== "admin" && (
                    <div className="flex justify-between items-center text-xs">
                      <label className="flex items-center gap-2 cursor-pointer text-slate-500 font-medium">
                        <input type="checkbox" className="rounded border-slate-300 w-4 h-4" />
                        <span>Remember me</span>
                      </label>
                      <Link href="/forgot-password" className="font-semibold transition-colors" style={{ color: accent.from }}>
                        Forgot password?
                      </Link>
                    </div>
                  )}

                  {/* Submit */}
                  <button
                    id="login-submit"
                    type="submit"
                    disabled={loading}
                    className="w-full mt-1 py-3.5 rounded-xl font-bold text-sm tracking-wide text-white flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer transition-all"
                    style={{
                      background: `linear-gradient(135deg, ${accent.from}, ${accent.to})`,
                      boxShadow: `0 8px 24px ${accent.glow}`,
                    }}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Authenticating…
                      </>
                    ) : (
                      currentRole.cta
                    )}
                  </button>

                  {/* Social SSO Options — Google, Apple & Twitter (X) */}
                  {role !== "admin" && (
                    <>
                      <div className="relative flex items-center py-1">
                        <div className="flex-grow border-t border-slate-200" />
                        <span className="flex-shrink-0 mx-4 text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
                          or continue with
                        </span>
                        <div className="flex-grow border-t border-slate-200" />
                      </div>
                      <div className="flex flex-col gap-2.5">
                        <button
                          type="button"
                          onClick={() =>
                            (window.location.href = `/api/auth/google?role=${role}`)
                          }
                          className="w-full flex items-center justify-center gap-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold py-2.5 rounded-xl transition-colors text-sm shadow-sm cursor-pointer"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                          </svg>
                          Continue with Google
                        </button>
                      </div>
                    </>
                  )}

                  {/* Sign up link */}
                  {role !== "admin" && (
                    <p className="text-center text-slate-500 text-xs mt-1">
                      {role === "vendor" ? "New vendor?" : "New user?"}{" "}
                      <Link
                        href={role === "vendor" ? "/signup?role=vendor" : "/signup"}
                        className="font-bold transition-colors"
                        style={{ color: accent.from }}
                      >
                        Create account
                      </Link>
                    </p>
                  )}
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
    </div>
  );
}
