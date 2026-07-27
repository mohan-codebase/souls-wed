"use client";

const INPUT_CLS =
  "w-full bg-white border border-slate-200 rounded-xl px-4 py-3 pl-11 text-sm text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400 transition-all";
const SELECT_CLS =
  "w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400 transition-all appearance-none";
const ICON_CLS = "absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Building, Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import { PhoneInput } from "@/components/shared/PhoneInput";
import { VENDOR_CATEGORIES } from "@/lib/config/categories";

const categories = VENDOR_CATEGORIES.map((c) => c.name);
const cities = ["Mumbai", "Goa", "Udaipur", "Jaipur", "Delhi", "Dubai", "Bali", "Maldives"];

export default function VendorGoogleDetailsPage() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState("");
  const [picture, setPicture] = useState("");

  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [category, setCategory] = useState(categories[0]);
  const [city, setCity] = useState(cities[0]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch("/api/auth/google/pending-vendor")
      .then((res) => {
        if (!res.ok) throw new Error("expired");
        return res.json();
      })
      .then((data) => {
        setEmail(data.email);
        setPicture(data.picture || "");
        setChecking(false);
      })
      .catch(() => {
        router.replace("/signup?role=vendor");
      });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!businessName || !phone) {
      setError("Please fill in all business details.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/google/complete-vendor-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessName, phone, category, city }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to create your vendor account.");

      setSuccess(true);
      setTimeout(() => router.push("/vendor/dashboard"), 1200);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-6 h-6 animate-spin text-sky-500" />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden font-body"
      style={{ background: "linear-gradient(135deg, #f0f9ff 0%, #fafaf9 50%, #f0f9ff 100%)" }}
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-6 sm:p-8">
          <div className="text-center mb-6">
            {picture && (
              // eslint-disable-next-line @next/next/no-img-element -- tiny avatar from Google's CDN, not worth Image optimization
              <img src={picture} alt="" className="w-12 h-12 rounded-full mx-auto mb-3 border border-slate-200" />
            )}
            <h1 className="text-lg font-extrabold text-slate-900">Complete your vendor profile</h1>
            <p className="text-xs text-slate-500 mt-1.5">
              Signed in as <span className="font-semibold text-slate-700">{email}</span> — just need a few business details.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-3.5 flex gap-3 items-start text-red-700 text-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span className="font-medium">{error}</span>
              </div>
            )}

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
                <select value={category} onChange={(e) => setCategory(e.target.value)} className={SELECT_CLS}>
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </Field>
              <Field label="Primary City">
                <select value={city} onChange={(e) => setCity(e.target.value)} className={SELECT_CLS}>
                  {cities.map((ct) => (
                    <option key={ct} value={ct}>{ct}</option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Phone Number">
              <PhoneInput value={phone} onChange={setPhone} placeholder="Enter phone number" disabled={loading} />
            </Field>

            <button
              type="submit"
              disabled={loading || success}
              className="w-full mt-1 py-3.5 rounded-2xl font-bold text-sm tracking-wide text-white flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer transition-all"
              style={{ background: "linear-gradient(135deg, #0ea5e9, #0284c7)", boxShadow: "0 8px 24px rgba(14,165,233,0.25)" }}
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Creating account…</>
              ) : success ? (
                "Account created — redirecting…"
              ) : (
                "Finish setting up"
              )}
            </button>
          </form>
        </div>

        <div className="mt-6 flex justify-center">
          <Link href="/signup?role=vendor" className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to sign up
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">{label}</label>
      <div className="relative">{children}</div>
    </div>
  );
}
