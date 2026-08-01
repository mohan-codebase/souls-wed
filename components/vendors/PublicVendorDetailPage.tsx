"use client";

import { useState, useEffect } from "react";
import Image from "@/components/shared/CustomImage";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { CheckIcon } from "@/components/ui/check";
import { ChevronDownIcon } from "@/components/ui/chevron-down";

import { useCurrency } from "@/lib/CurrencyContext";
import { formatAsCurrency } from "@/lib/currency";
import type { PublicVendor } from "@/components/vendors/PublicVendorDirectory";
import VendorHero from "@/components/vendors/VendorHero";
import VendorSidebar from "@/components/vendors/VendorSidebar";
import VenueGallery from "@/components/venues/VenueGallery";
import VenueMapCard from "@/components/venues/VenueMapCard";
import VenueReviews from "@/components/venues/VenueReviews";

interface PublicVendorDetailPageProps {
  vendor: PublicVendor;
}

export default function PublicVendorDetailPage({ vendor: initialVendor }: PublicVendorDetailPageProps) {
  const [vendor, setVendor] = useState(initialVendor);
  const searchParams = useSearchParams();
  const { currency } = useCurrency();

  const successParam = searchParams.get("success");
  const sessionId = searchParams.get("session_id");
  const bookingId = searchParams.get("booking_id");

  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("about");

  // Scroll-spy: track which section is in view
  useEffect(() => {
    const sectionIds = ["about", "videos", "pricing", "reviews"];
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveTab(entry.target.id);
          }
        }
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: 0 }
    );
    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [vendor]);

  const cat = (vendor.category || "").toLowerCase();
  const isVenue = cat.includes("venue") || cat.includes("banquet");
  const isRoom = cat.includes("room") || cat.includes("accommodation");
  const isCaterer = cat.includes("cater");
  const isPerPlate = isVenue || isCaterer;

  // ── Stripe payment verification ──
  useEffect(() => {
    if (successParam === "true" && sessionId && bookingId) {
      setVerifyingPayment(true);
      fetch("/api/bookings/verify-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stripe_session_id: sessionId, bookingId }),
      })
        .then((res) => { if (res.ok) setPaymentSuccess(true); })
        .catch((err) => console.error("Error verifying payment:", err))
        .finally(() => setVerifyingPayment(false));
    }
  }, [successParam, sessionId, bookingId]);

  // /soulswed/vendors/* is not in public/ — that fallback rendered as an
  // "Unavailable" tile, which is now the first thing on the page.
  const images = vendor.images?.length ? vendor.images : ["/soulswed/venue.jpg"];
  const gallery = vendor.gallery?.length ? vendor.gallery : images;

  const faqs = vendor.faqs || [];

  return (
    <div className="min-h-screen" style={{ background: "var(--sw-white)" }}>
      {/* ── Main content ── */}
      <div className="max-w-7xl mx-auto px-4 pt-28 pb-10">
        {/* Title block, then the photo collage — the client asked for the
            gallery to greet a visitor rather than sit at the foot of the page. */}
        <VendorHero
          vendor={{ ...vendor, images }}
          photoCount={gallery.length}
          onReviewSubmitted={(review) =>
            setVendor((prev) => {
              const reviews = [review, ...(prev.reviews || [])];
              const rating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
              return { ...prev, reviews, reviewCount: reviews.length, rating };
            })
          }
        />

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 lg:gap-10 mt-6 items-start">
          {/* Left — main content */}
          <div className="space-y-10 min-w-0">
            <div id="photos" className="scroll-mt-28">
              <VenueGallery
                images={gallery}
                venueName={vendor.businessName || vendor.name}
                rating={vendor.rating || 0}
                reviewCount={vendor.reviewCount || 0}
              />
            </div>

            {/* Tab Navigation */}
            <div className="sticky top-20 z-40 bg-white py-4 -mx-4 px-4 sm:mx-0 sm:px-0">
              <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 overflow-x-auto no-scrollbar">
                {[
                  { id: "about", label: "About" },
                  { id: "videos", label: "Videos" },
                  { id: "pricing", label: "Pricing" },
                  { id: "reviews", label: "Reviews" },
                ].map((tab) => (
                  <a
                    key={tab.id}
                    href={`#${tab.id}`}
                    onClick={() => setActiveTab(tab.id)}
                    className={`text-sm rounded-lg px-4 py-2 whitespace-nowrap transition-colors ${activeTab === tab.id
                      ? "font-semibold text-slate-900 bg-white"
                      : "font-medium text-slate-500"
                      }`}
                  >
                    {tab.label}
                  </a>
                ))}
              </div>
            </div>

            {/* About */}
            <section id="about" className="scroll-mt-32">
              <h2 className="text-2xl font-bold mb-4" style={{ fontFamily: "var(--font-heading)", color: "var(--sw-navy)" }}>
                About {vendor.businessName || vendor.name}
              </h2>
              <p className="text-slate-600 leading-relaxed text-[15px]">
                {vendor.description || `${vendor.businessName || vendor.name} is a leading partner in the ${vendor.category} wedding vertical. Providing customized services, premium deliverables, and experienced service management to couples across ${vendor.city} and beyond.`}
              </p>
            </section>

            {/* Videos */}
            <section id="videos" className="scroll-mt-32">
              <h2 className="text-2xl font-bold mb-5" style={{ fontFamily: "var(--font-heading)", color: "var(--sw-navy)" }}>
                Videos
              </h2>
              <VenueGallery
                variant="videos"
                images={gallery}
                videos={vendor.videos || []}
                venueName={vendor.businessName || vendor.name}
              />
            </section>

            {/* Pricing Section */}
            <section id="pricing" className="scroll-mt-32">
              <h2 className="text-2xl font-bold mb-5" style={{ fontFamily: "var(--font-heading)", color: "var(--sw-navy)" }}>
                Pricing
              </h2>
              <div className="rounded-lg overflow-hidden border border-slate-200" style={{ background: "white" }}>
                {isPerPlate ? (
                  <>
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">Veg Menu</p>
                        <p className="text-xs text-slate-400">Per plate, inclusive of taxes</p>
                      </div>
                      <p className="text-lg font-bold" style={{ color: "var(--sw-navy)" }}>
                        {vendor.priceFrom ? formatAsCurrency(vendor.priceFrom, currency) : "On request"}
                      </p>
                    </div>
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">Non-Veg Menu</p>
                        <p className="text-xs text-slate-400">Per plate, inclusive of taxes</p>
                      </div>
                      <p className="text-lg font-bold" style={{ color: "var(--sw-navy)" }}>
                        {vendor.priceFrom ? formatAsCurrency(Math.round(vendor.priceFrom * 1.2), currency) : "On request"}
                      </p>
                    </div>
                    {isVenue && (
                      <div className="flex items-center justify-between px-6 py-4">
                        <div>
                          <p className="font-semibold text-slate-800 text-sm">Venue Rental</p>
                          <p className="text-xs text-slate-400">Full-day exclusive use</p>
                        </div>
                        <p className="text-lg font-bold text-primary-600">
                          {vendor.priceFrom ? formatAsCurrency(vendor.priceFrom * 5, currency) : "On request"}
                        </p>
                      </div>
                    )}
                  </>
                ) : isRoom ? (
                  <div className="flex items-center justify-between px-6 py-4">
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">Room Rate</p>
                      <p className="text-xs text-slate-400">Per room per night, inclusive of taxes · online booking coming soon</p>
                    </div>
                    <p className="text-lg font-bold text-primary-600">
                      {vendor.priceFrom ? formatAsCurrency(vendor.priceFrom, currency) : "On request"}
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center justify-between px-6 py-4">
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">Starting Package</p>
                      <p className="text-xs text-slate-400">Fixed starting fee for services</p>
                    </div>
                    <p className="text-lg font-bold text-primary-600">
                      {vendor.priceFrom ? formatAsCurrency(vendor.priceFrom, currency) : "On request"}
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* Reviews */}
            <section id="reviews" className="scroll-mt-32">
              <h2 className="text-2xl font-bold mb-6" style={{ fontFamily: "var(--font-heading)", color: "var(--sw-navy)" }}>
                Reviews {(vendor.reviewCount || 0) > 0 && <span className="text-slate-400 ml-2 text-xl">({vendor.reviewCount})</span>}
              </h2>
              <VenueReviews
                rating={vendor.rating || 0}
                reviewCount={vendor.reviewCount || 0}
                reviews={vendor.reviews || []}
              />
            </section>

            {/* FAQ */}
            {faqs.length > 0 && (
              <section id="faq" className="scroll-mt-32">
                <h2 className="text-2xl font-bold mb-5" style={{ fontFamily: "var(--font-heading)", color: "var(--sw-navy)" }}>
                  Frequently Asked Questions
                </h2>
                <div className="space-y-3">
                  {faqs.map((faq, i) => (
                    <div key={i} className="rounded-lg overflow-hidden border border-slate-200" style={{ background: "white" }}>
                      <button className="w-full flex items-center justify-between px-5 py-4 text-left gap-3 outline-none" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                        <span className="font-semibold text-sm text-slate-800">{faq.question}</span>
                        <ChevronDownIcon className="w-4 h-4 flex-shrink-0 text-slate-400 transition-transform" style={{ transform: openFaq === i ? "rotate(180deg)" : "rotate(0)" }} />
                      </button>
                      {openFaq === i && (
                        <div className="px-5 pb-4">
                          <p className="text-sm text-slate-600 leading-relaxed">{faq.answer}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Right — sidebar: Map + Booking Form stacked continuously */}
          <div className="lg:sticky lg:top-24 flex flex-col gap-6 w-full">
            <VenueMapCard
              name={vendor.businessName || vendor.name}
              city={vendor.city}
              mapLink={vendor.mapLink}
            />
            <VendorSidebar vendor={vendor} />
          </div>
        </div>
      </div>

      {/* Stripe Payment Verification Modal Overlay */}
      {(verifyingPayment || paymentSuccess) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 text-center shadow-lg border border-slate-200 flex flex-col items-center">
            {verifyingPayment ? (
              <>
                <div className="w-16 h-16 rounded-full bg-primary-50 flex items-center justify-center text-primary-600 mb-4">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">Verifying Payment...</h3>
                <p className="text-sm text-slate-500">Please do not close this window or click back.</p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mb-4 animate-bounce">
                  <CheckIcon className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">Payment Confirmed!</h3>
                <p className="text-sm text-slate-500 mb-6">Your booking is now confirmed. You can view all details in your dashboard.</p>
                <Link href="/dashboard" className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-3.5 rounded text-sm transition-colors text-center block">
                  Go to Dashboard
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
