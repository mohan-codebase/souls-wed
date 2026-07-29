"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import Image from "@/components/shared/CustomImage";
import { IndianRupeeIcon } from "@/components/ui/indian-rupee";
import { ArrowRightIcon } from "@/components/ui/arrow-right";
import { ArrowLeftIcon } from "@/components/ui/arrow-left";
import { ShieldCheckIcon } from "@/components/ui/shield-check";
import { formatAsCurrency } from "@/lib/currency";

interface CheckoutProvider {
  name: string;
  city?: string;
  country?: string;
  description?: string;
  features: string[];
  images: string[];
}

export default function CheckoutPage() {
  const { bookingId } = useParams();
  const router = useRouter();
  const [booking, setBooking] = useState<any>(null);
  const [provider, setProvider] = useState<CheckoutProvider | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    async function fetchBooking() {
      try {
        const res = await fetch(`/api/bookings/${bookingId}`);
        if (!res.ok) {
          throw new Error("Failed to load booking details");
        }
        const data = await res.json();
        setBooking(data.booking);
        // `provider` comes from whichever Venue/ServiceListing this booking
        // points at — absent only if that listing was deleted after booking.
        setProvider(data.provider ?? null);
      } catch (err: any) {
        setError(err.message || "Something went wrong.");
      } finally {
        setLoading(false);
      }
    }
    if (bookingId) {
      fetchBooking();
    }
  }, [bookingId]);

  const handlePayment = async () => {
    setProcessing(true);
    setError(null);
    try {
      const res = await fetch("/api/bookings/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to initiate payment");

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("Invalid payment session created.");
      }
    } catch (err: any) {
      setError(err.message || "Payment initiation failed.");
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-stone-50 p-4 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-stone-800 mb-2">Booking Not Found</h2>
        <p className="text-stone-500 mb-6 max-w-md">{error || "We couldn't find the booking you're trying to checkout."}</p>
        <button
          onClick={() => router.push("/dashboard")}
          className="px-6 py-3 bg-stone-800 text-white font-bold rounded-full text-sm"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  // Calculate remaining balance
  const remainingBalance = booking.totalAmount - booking.advanceAmount;

  return (
    <div className="bg-[#fafaf9] pt-28 pb-20 px-4 font-body">
      <div className="max-w-5xl mx-auto">

        {/* Back navigation */}
        <button
          onClick={() => router.back()}
          className="group flex items-center gap-2 text-xs font-semibold text-stone-500 hover:text-stone-800 transition-colors mb-6"
        >
          <ArrowLeftIcon className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
          Back
        </button>

        {/* Page header */}
        <div className="flex items-start gap-3 mb-8">
          <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 text-primary-600" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-extrabold text-stone-900 tracking-tight">Complete your booking</h1>
              {booking._id && (
                <span className="text-[10px] font-bold text-stone-400 bg-stone-100 px-2 py-1 rounded-full whitespace-nowrap">
                  Ref #{booking._id.slice(-8).toUpperCase()}
                </span>
              )}
            </div>
            <p className="text-sm font-medium text-stone-500">Review your details and pay the advance to secure your date.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8 items-start">

        {/* Left column: Details */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          {provider && (
            <div className="bg-white border border-stone-200 rounded-3xl overflow-hidden shadow-sm flex flex-col sm:flex-row">
              {provider.images[0] && (
                <div className="relative w-full sm:w-64 h-48 sm:h-auto shrink-0 bg-stone-100">
                  <Image
                    src={provider.images[0]}
                    alt={provider.name}
                    fill
                    sizes="(max-width: 640px) 100vw, 256px"
                    className="object-cover"
                  />
                </div>
              )}
              <div className="p-6 flex flex-col gap-3 min-w-0">
                <div>
                  <h2 className="text-lg font-bold text-stone-900">{provider.name}</h2>
                  {(provider.city || provider.country) && (
                    <p className="text-xs font-medium text-stone-500 mt-0.5">
                      {[provider.city, provider.country].filter(Boolean).join(", ")}
                    </p>
                  )}
                </div>
                {provider.description && (
                  <p className="text-sm text-stone-600 leading-relaxed line-clamp-3">{provider.description}</p>
                )}
                {provider.features.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {provider.features.map((feature) => (
                      <span
                        key={feature}
                        className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-stone-100 text-stone-600"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                )}
                {provider.images.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pt-1">
                    {provider.images.slice(1, 5).map((src, i) => (
                      <div key={src} className="relative w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-stone-100">
                        <Image
                          src={src}
                          alt={`${provider.name} photo ${i + 2}`}
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="bg-white border border-stone-200 rounded-3xl p-6 md:p-8 shadow-sm">
            <h2 className="text-lg font-bold text-stone-800 mb-6 border-b border-stone-100 pb-4">Booking Details</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-4 mb-6">
              <div>
                <p className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-1">Provider</p>
                <p className="font-semibold text-stone-800">{booking.providerName}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-1">Service Type</p>
                <p className="font-semibold text-stone-800 capitalize">{booking.bookingType}</p>
              </div>
              
              {booking.eventDates && booking.eventDates.length > 0 ? (
                <div className="sm:col-span-2">
                  <p className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-1">Event Dates</p>
                  <p className="font-semibold text-stone-800">
                    {booking.eventDates.map((d: any) => new Date(d).toLocaleDateString("en-US", { weekday: 'short', month: 'short', day: 'numeric' })).join(", ")}
                    {", "}
                    {new Date(booking.eventDates[0]).getFullYear()}
                  </p>
                </div>
              ) : booking.eventDate && (
                <div>
                  <p className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-1">Event Date</p>
                  <p className="font-semibold text-stone-800">
                    {new Date(booking.eventDate).toLocaleDateString("en-US", { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              )}

              {booking.checkIn && booking.checkOut && (
                <div>
                  <p className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-1">Stay Dates</p>
                  <p className="font-semibold text-stone-800">
                    {new Date(booking.checkIn).toLocaleDateString("en-US", { month: 'short', day: 'numeric' })} — {new Date(booking.checkOut).toLocaleDateString("en-US", { month: 'short', day: 'numeric' })}
                  </p>
                </div>
              )}
              
              {booking.guestCount && (
                <div>
                  <p className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-1">Guests</p>
                  <p className="font-semibold text-stone-800">{booking.guestCount} People</p>
                </div>
              )}

              {booking.roomCount && (
                <div>
                  <p className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-1">Rooms</p>
                  <p className="font-semibold text-stone-800">{booking.roomCount} Rooms</p>
                </div>
              )}

              {(booking.functionType || booking.functionTime) && (
                <div>
                  <p className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-1">Function</p>
                  <p className="font-semibold text-stone-800 capitalize">
                    {[booking.functionType, booking.functionTime].filter(Boolean).join(" · ")}
                  </p>
                </div>
              )}
            </div>

            {booking.specialRequests && (
              <div className="mb-6 pt-6 border-t border-stone-100">
                <p className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-1">Special Requests</p>
                <p className="text-sm font-medium text-stone-700">{booking.specialRequests}</p>
              </div>
            )}

            <div className="pt-6 mb-6 border-t border-stone-100">
              <p className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-3">Booked By</p>
              <div className="flex flex-wrap gap-x-8 gap-y-3">
                <div>
                  <p className="text-[10px] font-semibold text-stone-400 mb-0.5">Name</p>
                  <p className="text-sm font-semibold text-stone-800">{booking.userName}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-stone-400 mb-0.5">Email</p>
                  <p className="text-sm font-semibold text-stone-800">{booking.userEmail}</p>
                </div>
                {booking.userPhone && (
                  <div>
                    <p className="text-[10px] font-semibold text-stone-400 mb-0.5">Phone</p>
                    <p className="text-sm font-semibold text-stone-800">{booking.userPhone}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-stone-50 rounded-2xl p-4 border border-stone-100 flex items-start gap-3">
              <ShieldCheckIcon className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-stone-800">100% Secure Payment</p>
                <p className="text-xs font-medium text-stone-500 mt-0.5">Your payment is processed securely via Stripe. We do not store your card details.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Price breakdown */}
        <div className="lg:col-span-2 lg:sticky lg:top-28 flex flex-col gap-4">
          <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-stone-800 mb-6 flex items-center gap-2">
              <IndianRupeeIcon className="w-5 h-5 text-primary-500" />
              Price Breakdown
            </h2>

            <div className="flex flex-col gap-4 text-sm font-medium mb-6">
              <div className="flex justify-between items-center text-stone-600">
                <span>Total Amount</span>
                <span className="font-bold text-stone-800">{formatAsCurrency(booking.totalAmount, booking.currency)}</span>
              </div>
              <div className="flex justify-between items-center text-stone-600 border-b border-stone-100 pb-4">
                <span>Balance to pay at venue</span>
                <span className="font-semibold text-stone-500">{formatAsCurrency(remainingBalance, booking.currency)}</span>
              </div>
              
              <div className="flex justify-between items-end pt-2">
                <div>
                  <span className="block font-extrabold text-stone-900 text-base">Advance Payment</span>
                  <span className="block text-[11px] text-stone-400 uppercase tracking-wider mt-0.5">Required to confirm</span>
                </div>
                <span className="text-2xl font-black text-primary-600">{formatAsCurrency(booking.advanceAmount, booking.currency)}</span>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-xs font-medium text-red-600 flex gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              onClick={handlePayment}
              disabled={processing || booking.status !== "pending"}
              className="w-full bg-primary-500 hover:bg-primary-600 text-white font-bold py-4 rounded-2xl text-sm transition-all shadow-md shadow-primary-500/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              {processing ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
              ) : booking.status !== "pending" ? (
                "Payment Complete"
              ) : (
                <>
                  Pay {formatAsCurrency(booking.advanceAmount, booking.currency)} securely 
                  <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
            
            <p className="text-[10px] text-center text-stone-400 mt-4 font-medium">
              By proceeding, you agree to our Terms of Service and Cancellation Policy.
            </p>
          </div>

          {/* What happens next */}
          <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm">
            <h3 className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-4">What happens next</h3>
            <ol className="flex flex-col gap-3.5">
              {[
                "Pay the advance to lock your date instantly.",
                `${booking.providerName} confirms and reaches out to you.`,
                "Settle the remaining balance directly at the venue.",
              ].map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="w-5 h-5 rounded-full bg-primary-100 text-primary-600 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-xs font-medium text-stone-600 leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
