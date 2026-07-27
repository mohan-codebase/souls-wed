"use client";

import { useState, useEffect, useRef } from "react";
import { notFound, useParams, useSearchParams } from "next/navigation";
import Image from "@/components/shared/CustomImage";
import Link from "next/link";
import { motion } from "framer-motion";
import { Star, BadgeCheck, BedDouble, Car, UtensilsCrossed, TreePine, Building, Loader2 } from "lucide-react";
import { MapPinIcon } from "@/components/ui/map-pin";
import { ChevronLeftIcon } from "@/components/ui/chevron-left";
import { ChevronDownIcon } from "@/components/ui/chevron-down";
import { UsersIcon } from "@/components/ui/users";
import { CheckIcon } from "@/components/ui/check";
import type { Venue } from "@/lib/venues-data";
import VenueHero from "@/components/venues/VenueHero";
import VenueGallery from "@/components/venues/VenueGallery";
import VenueAbout from "@/components/venues/VenueAbout";
import VenueFacilities from "@/components/venues/VenueFacilities";
import VenueGoodToKnow from "@/components/venues/VenueGoodToKnow";
import { mergeFaqs } from "@/lib/venue-faqs";
import VenueSidebar from "@/components/venues/VenueSidebar";
import VenueMapCard from "@/components/venues/VenueMapCard";
import VenueReviews from "@/components/venues/VenueReviews";
import SimilarVenues from "@/components/venues/SimilarVenues";
import { useCurrency } from "@/lib/CurrencyContext";
import { convertPriceString } from "@/lib/currency";

export default function VenueDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = typeof params.id === "string" ? params.id : params.id?.[0] ?? "";
  const { currency } = useCurrency();

  const [venue, setVenue] = useState<Venue | null>(null);
  const [similar, setSimilar] = useState<Venue[]>([]);
  const [venueLoading, setVenueLoading] = useState(true);
  const [venueNotFound, setVenueNotFound] = useState(false);

  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("about");

  // Scroll-spy: track which section is in view
  useEffect(() => {
    const sectionIds = ["about", "areas", "facilities", "videos", "pricing", "good-to-know", "faq", "reviews"];
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
  }, [venue]);

  // Stripe Payment Callback States
  const successParam = searchParams.get("success");
  const sessionId = searchParams.get("session_id");
  const bookingId = searchParams.get("booking_id");
  const typeParam = searchParams.get("type");

  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // ── Record a real page view (replaces the old fabricated demand numbers) ──
  useEffect(() => {
    if (!id) return;
    fetch("/api/views", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ providerId: id, providerType: "venue" }),
    }).catch(() => { });
  }, [id]);

  // ── Fetch this venue from MongoDB API ──────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    setVenueLoading(true);
    fetch(`/api/venues?id=${encodeURIComponent(id)}`)
      .then((res) => res.json())
      .then((data) => {
        const raw = data.venues?.[0];
        if (!raw) {
          setVenueNotFound(true);
          return;
        }
        setVenue({ ...raw, id: raw.venueId } as Venue);

        // Fetch similar venues (exclude current)
        return fetch("/api/venues?limit=6")
          .then((r) => r.json())
          .then((d) => {
            const others = (d.venues ?? [])
              .filter((v: Record<string, unknown>) => v.venueId !== id)
              .slice(0, 5)
              .map((v: Record<string, unknown>) => ({ ...v, id: v.venueId })) as Venue[];
            setSimilar(others);
          });
      })
      .catch(() => setVenueNotFound(true))
      .finally(() => setVenueLoading(false));
  }, [id]);

  // ── Stripe payment verification ─────────────────────────────────────────────
  useEffect(() => {
    if (successParam === "true" && sessionId && bookingId) {
      setVerifyingPayment(true);
      fetch("/api/bookings/verify-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stripe_session_id: sessionId,
          bookingId: bookingId,
        }),
      })
        .then((res) => {
          if (res.ok) {
            setPaymentSuccess(true);
          } else {
            console.error("Failed to verify Stripe payment");
          }
        })
        .catch((err) => console.error("Error verifying payment:", err))
        .finally(() => setVerifyingPayment(false));
    }
  }, [successParam, sessionId, bookingId]);

  // ── Loading & not-found guards ─────────────────────────────────────────────
  if (venueLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: "var(--sw-white)" }}>
        <Loader2 className="w-10 h-10 animate-spin" style={{ color: "var(--sw-primary)" }} />
        <p className="text-sm text-slate-500 font-medium">Loading venue details...</p>
      </div>
    );
  }

  if (venueNotFound || !venue) {
    notFound();
  }

  const faqs = mergeFaqs(venue);

  return (
    <div className="min-h-screen" style={{ background: "var(--sw-white)" }}>

      {/* ── Main content ────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 pt-28 pb-10">
        {/* Title block, then the photo collage — the client asked for the
            gallery to greet a visitor rather than sit at the foot of the page. */}
        <VenueHero
          venue={venue}
          photoCount={(venue.gallery || []).filter(Boolean).length}
          onReviewSubmitted={(review) =>
            setVenue((prev) => {
              if (!prev) return prev;
              const reviews = [review, ...prev.reviews];
              const rating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
              return { ...prev, reviews, reviewCount: reviews.length, rating };
            })
          }
        />

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 lg:gap-10 mt-6 items-start">
          {/* Left — main content */}
          <div className="space-y-12 min-w-0">
            <div id="photos" className="scroll-mt-28">
              <VenueGallery
                images={venue.gallery || []}
                venueName={venue.name}
                rating={venue.rating}
                reviewCount={venue.reviewCount}
                reviews={venue.reviews}
              />
            </div>

            {/* Tab Navigation */}
            <div className="sticky top-20 z-40 bg-white py-4 -mx-4 px-4 sm:mx-0 sm:px-0">
              <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 overflow-x-auto no-scrollbar">
                {[
                  { id: "about", label: "Overview" },
                  { id: "areas", label: "Areas Available" },
                  { id: "facilities", label: "Facilities" },
                  { id: "videos", label: "Videos" },
                  { id: "pricing", label: "Pricing" },
                  { id: "good-to-know", label: "Good to Know" },
                  { id: "faq", label: "FAQ" },
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

            {/* About — description, property highlights and the popular
                facilities strip, the way Booking.com opens a property page. */}
            <section id="about" className="scroll-mt-32">
              <h2
                className="text-2xl font-bold mb-4"
                style={{ fontFamily: "var(--font-heading)", color: "var(--sw-navy)" }}
              >
                About {venue.name}
              </h2>
              <VenueAbout
                venue={venue}
                onSeeAllFacilities={() =>
                  document.getElementById("facilities")?.scrollIntoView({ behavior: "smooth" })
                }
              />
            </section>

            {/* Areas Available */}
            <section id="areas" className="scroll-mt-32">
              <h2
                className="text-2xl font-bold mb-5"
                style={{ fontFamily: "var(--font-heading)", color: "var(--sw-navy)" }}
              >
                Areas Available ({venue.outdoor && venue.indoor ? 2 : 1})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {venue.indoor && (
                  <div className="flex flex-col gap-4 p-6 rounded-lg border border-slate-200 bg-slate-50/50">
                    <div className="w-14 h-14 rounded-2xl bg-primary-50/80 flex items-center justify-center flex-shrink-0 text-primary-600">
                      <Building className="w-6 h-6 stroke-[1.5]" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-lg mb-1">Indoor Banquet</h4>
                      <p className="text-sm text-slate-500 leading-relaxed">
                        Capacity for {Number(venue.minGuests) || 50} seated or {Number(venue.maxGuests) || 200} floating guests.
                      </p>
                    </div>
                  </div>
                )}
                {venue.outdoor && (
                  <div className="flex flex-col gap-4 p-6 rounded-lg border border-slate-200 bg-slate-50/50">
                    <div className="w-14 h-14 rounded-2xl bg-green-50/80 flex items-center justify-center flex-shrink-0 text-green-600">
                      <TreePine className="w-6 h-6 stroke-[1.5]" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-lg mb-1">Outdoor Lawn</h4>
                      <p className="text-sm text-slate-500 leading-relaxed">
                        Capacity for {Math.floor((Number(venue.maxGuests) || 200) * 0.8)} seated or {Math.floor((Number(venue.maxGuests) || 200) * 1.5)} floating guests.
                      </p>
                    </div>
                  </div>
                )}
              </div>

            </section>

            {/* Facilities — the free-text feature list, sorted into headed
                categories rather than shown as one undifferentiated pill row. */}
            <section id="facilities" className="scroll-mt-32">
              <h2
                className="text-2xl font-bold mb-5"
                style={{ fontFamily: "var(--font-heading)", color: "var(--sw-navy)" }}
              >
                Facilities of {venue.name}
              </h2>
              <VenueFacilities venue={venue} />
            </section>

            {/* Videos — the photographs now live in the collage at the top */}
            <section id="videos" className="scroll-mt-32">
              <h2
                className="text-2xl font-bold mb-5"
                style={{ fontFamily: "var(--font-heading)", color: "var(--sw-navy)" }}
              >
                Videos
              </h2>
              <VenueGallery
                variant="videos"
                images={venue.gallery || []}
                videos={venue.videos || []}
                venueName={venue.name}
              />
            </section>

            {/* Pricing Table */}
            <section id="pricing" className="scroll-mt-32">
              <h2
                className="text-2xl font-bold mb-5"
                style={{ fontFamily: "var(--font-heading)", color: "var(--sw-navy)" }}
              >
                Pricing
              </h2>
              {venue.pricePerPlateVeg || venue.pricePerPlateNonVeg || venue.rentalCost ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {venue.pricePerPlateVeg && (
                    <div className="p-6 rounded-lg border border-slate-200 bg-white">
                      <p className="font-semibold text-slate-500 text-xs tracking-widest uppercase mb-2">Veg Menu</p>
                      <p className="text-3xl font-bold text-slate-900 mb-1">
                        {convertPriceString(venue.pricePerPlateVeg, currency)}
                      </p>
                      <p className="text-sm text-slate-400">Per plate, inclusive of taxes</p>
                    </div>
                  )}
                  {venue.pricePerPlateNonVeg && (
                    <div className="p-6 rounded-lg border border-slate-200 bg-white">
                      <p className="font-semibold text-slate-500 text-xs tracking-widest uppercase mb-2">Non-Veg Menu</p>
                      <p className="text-3xl font-bold text-slate-900 mb-1">
                        {convertPriceString(venue.pricePerPlateNonVeg, currency)}
                      </p>
                      <p className="text-sm text-slate-400">Per plate, inclusive of taxes</p>
                    </div>
                  )}
                  {venue.rentalCost && (
                    <div className="p-6 rounded-lg border border-primary-100 bg-primary-50/30 md:col-span-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <p className="font-semibold text-primary-600/80 text-xs tracking-widest uppercase mb-2">Venue Rental</p>
                        <p className="text-3xl font-bold text-slate-900 mb-1">
                          {convertPriceString(venue.rentalCost, currency)}
                        </p>
                        <p className="text-sm text-slate-500">Full-day exclusive use of the property</p>
                      </div>
                      <button className="bg-primary-600 hover:bg-primary-700 transition-colors text-white font-bold px-8 py-3 rounded">
                        Request Quote
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-6 rounded-lg border border-slate-200 bg-white text-center">
                  <p className="text-slate-500 text-sm">Pricing details are available upon request. Please contact the venue directly for a custom quote.</p>
                </div>
              )}
            </section>

            {/* Good to know — our equivalent of Booking.com's house rules. */}
            <section id="good-to-know" className="scroll-mt-32">
              <h2
                className="text-2xl font-bold mb-5"
                style={{ fontFamily: "var(--font-heading)", color: "var(--sw-navy)" }}
              >
                Good to Know
              </h2>
              <VenueGoodToKnow venue={venue} />
            </section>

            {/* FAQ — vendor-authored questions lead, filled out with
                questions derived from the venue's own data so the section
                never sits empty (every vendor-entered `faqs` list is empty
                today). */}
            <section id="faq" className="scroll-mt-32">
              <h2
                className="text-2xl font-bold mb-5"
                style={{ fontFamily: "var(--font-heading)", color: "var(--sw-navy)" }}
              >
                Frequently Asked Questions
              </h2>
              <div className="space-y-3">
                {faqs.map((faq, i) => (
                  <div
                    key={i}
                    className="rounded-lg overflow-hidden border border-slate-200"
                    style={{ background: "white" }}
                  >
                    <button
                      className="w-full flex items-center justify-between px-5 py-4 text-left gap-3"
                      onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    >
                      <span className="font-semibold text-sm text-slate-800">{faq.question}</span>
                      <ChevronDownIcon
                        className="w-4 h-4 flex-shrink-0 text-slate-400 transition-transform"
                        style={{ transform: openFaq === i ? "rotate(180deg)" : "rotate(0)" }}
                      />
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

            {/* Reviews */}
            <section id="reviews" className="scroll-mt-32">
              <h2
                className="text-2xl font-bold mb-6"
                style={{ fontFamily: "var(--font-heading)", color: "var(--sw-navy)" }}
              >
                Reviews{venue.reviewCount > 0 && <span className="text-slate-400 ml-2 text-xl">({venue.reviewCount})</span>}
              </h2>
              <VenueReviews
                rating={venue.rating}
                reviewCount={venue.reviewCount}
                reviews={venue.reviews}
              />
            </section>
          </div>

          {/* Right — sidebar: Map + Booking Form stacked continuously */}
          <div className="lg:sticky lg:top-24 flex flex-col gap-6 w-full">
            <VenueMapCard
              name={venue.name}
              city={venue.city}
              location={venue.location}
              mapLink={venue.mapLink}
            />
            <VenueSidebar venue={venue} type={typeParam} />
          </div>
        </div>
      </div>

      {/* Similar Venues */}
      <SimilarVenues venues={similar} />

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
                <Link
                  href="/dashboard"
                  className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-3.5 rounded text-sm transition-colors text-center block"
                >
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
