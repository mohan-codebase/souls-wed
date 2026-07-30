/**
 * BOOKING CARD COMPONENT
 *
 * Displays a single booking in the user or vendor dashboard.
 * Includes Stripe payment integration for pending bookings.
 *
 * Visuals come from the shared ListingCard (the single card design used
 * across the app) — this file only supplies booking-specific content via
 * the card's slots plus the pay/cancel behaviour.
 */

"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { format } from "date-fns";
import { BedDouble, Clock, AlertCircle } from "lucide-react";
import { CalendarDaysIcon } from "@/components/ui/calendar-days";
import { UsersIcon } from "@/components/ui/users";
import { HeartIcon } from "@/components/ui/heart";
import { useRouter } from "next/navigation";
import { formatAsCurrency } from "@/lib/currency";
import { getVenueById } from "@/lib/venues-data";
import ListingCard from "@/components/shared/ListingCard";

interface BookingCardProps {
  booking: any;
  isVendor?: boolean;
}

export default function BookingCard({ booking, isVendor = false }: BookingCardProps) {
  const router = useRouter();
  // `providerImage` is copied onto the booking at creation time. The old
  // getVenueById() lookup reads the static lib/venues-data.ts, which no longer
  // holds the real listings, so it always missed and every card rendered as an
  // empty block. Kept only as a fallback for bookings made before the change.
  const venueDetails = getVenueById(booking.providerId);
  const venueImage = booking.providerImage || venueDetails?.image;
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);
  const [vendorBusy, setVendorBusy] = useState(false);

  // "Mark complete" is only offered once the event is actually over — completing
  // a booking is what unlocks the customer's ability to review it.
  const lastDate =
    booking.eventDate ||
    (booking.eventDates && booking.eventDates[booking.eventDates.length - 1]) ||
    booking.checkOut;
  const eventHasPassed = lastDate ? new Date(lastDate) <= new Date() : false;

  /** Vendor-side decline / complete. See PATCH /api/bookings/[id]. */
  const runVendorAction = async (action: "decline" | "complete", reason?: string) => {
    setVendorBusy(true);
    setPaymentError(null);
    try {
      const res = await fetch(`/api/bookings/${booking._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPaymentError(data.message || "Could not update the booking.");
        return;
      }
      router.refresh();
      if (action === "decline") setIsDeleted(true);
    } catch {
      setPaymentError("Network error. Please try again.");
    } finally {
      setVendorBusy(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (isDeleted) return null;

  // ─── Format Dates ───
  const renderDate = () => {
    if (booking.bookingType === "room") {
      return (
        <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-stone-300">
          <CalendarDaysIcon className="w-4 h-4 text-primary-500" />
          <span className="font-medium">
            {booking.checkIn && booking.checkOut ? (
              `${format(new Date(booking.checkIn), "MMM d")} → ${format(new Date(booking.checkOut), "MMM d, yyyy")}`
            ) : (
              "Dates pending"
            )}
          </span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-stone-300">
          <CalendarDaysIcon className="w-4 h-4 text-primary-500" />
          <span className="font-medium">
            {booking.eventDates && booking.eventDates.length > 0 ? (
              booking.eventDates.map((d: any) => format(new Date(d), "MMM d")).join(", ") + ", " + format(new Date(booking.eventDates[0]), "yyyy")
            ) : booking.eventDate ? (
              format(new Date(booking.eventDate), "EEE, MMM d, yyyy")
            ) : (
              "Date pending"
            )}
          </span>
          {booking.functionTime && (
            <span className="text-slate-400 dark:text-stone-500 capitalize"> ({booking.functionTime})</span>
          )}
        </div>
      );
    }
  };

  // ─── Status Badge ───
  const getStatusBadge = () => {
    switch (booking.status) {
      case "pending":
        return <span className="bg-amber-100 dark:bg-amber-500/15 text-amber-800 border border-amber-200 dark:border-amber-500/25 px-2.5 py-1 rounded-full text-xs font-bold">Pending Payment</span>;
      case "confirmed":
        return <span className="bg-emerald-100 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/25 px-2.5 py-1 rounded-full text-xs font-bold">Confirmed</span>;
      case "completed":
        return <span className="bg-blue-100 dark:bg-blue-500/15 text-blue-800 border border-blue-200 dark:border-blue-500/25 px-2.5 py-1 rounded-full text-xs font-bold">Completed</span>;
      case "cancelled":
        return <span className="bg-red-100 dark:bg-red-500/15 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-500/25 px-2.5 py-1 rounded-full text-xs font-bold">Cancelled</span>;
      default:
        return null;
    }
  };

  // ─── Handle Payment Flow ───
  const handlePayAdvance = async () => {
    setPaymentError(null);
    try {
      const res = await fetch("/api/bookings/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: booking._id ?? booking.id }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to initiate payment");

      if (!data.url) throw new Error("No payment URL returned from server.");

      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (err: unknown) {
      setPaymentError(err instanceof Error ? err.message : "Failed to initiate payment");
    }
  };

  const handleDeleteBooking = async () => {
    setShowCancelConfirm(false);
    setDeleting(true);
    setPaymentError(null);
    try {
      // A confirmed booking may hold a paid advance. Cancel it through PATCH so
      // the record survives and any refund is flagged — never hard-delete a
      // booking that could carry money. Only an unpaid, still-pending booking is
      // removed outright (an abandoned request the customer never paid for).
      const res =
        booking.status === "confirmed"
          ? await fetch(`/api/bookings/${booking._id ?? booking.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "cancel" }),
            })
          : await fetch("/api/bookings", {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ bookingId: booking._id ?? booking.id }),
            });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to cancel booking");

      setIsDeleted(true);
      router.refresh();
    } catch (err: unknown) {
      setPaymentError(err instanceof Error ? err.message : "Failed to cancel booking");
    } finally {
      setDeleting(false);
    }
  };

  const cardBody = (
    <>
      <div className="flex flex-col gap-2.5 mb-4 bg-white/60 dark:bg-[var(--sw-surface)]/60 backdrop-blur-sm rounded-xl p-3 border border-slate-900/5 dark:border-white/10 shadow-sm">
        <p className="text-[10px] text-slate-500 dark:text-stone-400 font-mono">ID: {booking._id.substring(18)}</p>
        {renderDate()}
        <div className="flex items-center gap-4">
          {booking.bookingType === "venue" && booking.guestCount && (
            <div className="flex items-center gap-1.5 text-sm text-slate-700 dark:text-stone-300 font-medium">
              <UsersIcon className="w-4 h-4 text-primary-500" />
              <span>{booking.guestCount} Guests</span>
            </div>
          )}
          {booking.bookingType === "room" && booking.roomCount && (
            <div className="flex items-center gap-1.5 text-sm text-slate-700 dark:text-stone-300 font-medium">
              <BedDouble className="w-4 h-4 text-primary-500" />
              <span>{booking.roomCount} Rooms</span>
            </div>
          )}
          {booking.bookingType !== "venue" && booking.bookingType !== "room" && (
            <div className="flex items-center gap-1.5 text-sm text-slate-700 dark:text-stone-300 font-medium capitalize">
              <span className="bg-slate-100 dark:bg-[var(--sw-surface)]/10 text-slate-700 dark:text-stone-300 text-[10.5px] font-bold px-2 py-0.5 rounded border border-slate-200 dark:border-white/10 shadow-sm">
                {booking.bookingType}
              </span>
            </div>
          )}
          {booking.functionType && (
            <div className="flex items-center gap-1.5 text-sm text-slate-700 dark:text-stone-300 font-medium capitalize">
              <Clock className="w-4 h-4 text-primary-500" />
              <span>{booking.functionType}</span>
            </div>
          )}
        </div>
      </div>

      {/* User Details (For Vendor View) */}
      {isVendor && (
        <div className="mb-4 bg-primary-50/80 dark:bg-primary-500/10 backdrop-blur-sm rounded-xl p-3 border border-primary-200/50 dark:border-primary-500/25 shadow-sm">
          <p className="text-xs font-bold text-slate-500 dark:text-stone-400 uppercase tracking-wider mb-0.5">Customer Details</p>
          <p className="text-sm font-bold text-slate-800 dark:text-stone-200">{booking.userName}</p>
          <p className="text-xs text-slate-600 dark:text-stone-300 font-medium mt-0.5">{booking.userPhone} • {booking.userEmail}</p>
        </div>
      )}

      <div className="flex items-end justify-between mt-1">
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline gap-2">
            <span className="text-[11px] font-medium text-slate-500 dark:text-stone-400 uppercase">Total</span>
            <span className="text-lg font-bold text-slate-900 dark:text-stone-100 leading-none">
              {formatAsCurrency(booking.totalAmount, booking.currency || "INR")}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-[11px] font-medium text-slate-500 dark:text-stone-400 uppercase">Paid</span>
            <span className={`text-sm font-bold leading-none ${booking.paymentStatus === 'paid' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-stone-500'}`}>
              {/* Was inferred from `status === "confirmed"`, which showed a paid
                  amount for bookings nobody had paid for. Reads the real record now. */}
              {formatAsCurrency(booking.amountPaid || 0, booking.currency || "INR")}
            </span>
          </div>
        </div>

        {/* Action Buttons for Vendor — previously the vendor card was entirely
            read-only, so a double-booked partner had no way to decline. */}
        {isVendor && (booking.status === "pending" || booking.status === "confirmed") && (
          <div className="flex flex-col gap-2">
            {booking.status === "confirmed" && eventHasPassed && (
              <button
                onClick={() => runVendorAction("complete")}
                disabled={vendorBusy}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-5 py-2.5 rounded-full text-xs transition-colors shadow-sm disabled:opacity-50"
              >
                {vendorBusy ? "Saving..." : "Mark Complete"}
              </button>
            )}
            <button
              onClick={() => {
                const reason = window.prompt(
                  "Decline this booking?\n\nThe customer will be emailed and the dates released.\n\nReason (optional):",
                  ""
                );
                if (reason === null) return;
                runVendorAction("decline", reason);
              }}
              disabled={vendorBusy}
              className="bg-white dark:bg-[var(--sw-surface)] hover:bg-red-50 dark:hover:bg-red-500/10 text-slate-700 dark:text-stone-300 hover:text-red-600 font-bold px-5 py-2 rounded-full text-[11px] transition-colors border border-slate-200 dark:border-white/10 disabled:opacity-50"
            >
              {vendorBusy ? "Working..." : "Decline"}
            </button>
          </div>
        )}

        {/* Action Buttons for User */}
        {!isVendor && (booking.status === "pending" || booking.status === "confirmed") && (
          <div className="flex flex-col gap-2">
            {booking.status === "pending" && (
              <button
                onClick={handlePayAdvance}
                disabled={deleting}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-5 py-2.5 rounded-full text-xs transition-colors shadow-sm disabled:opacity-50"
              >
                Pay Advance
              </button>
            )}
            <button
              onClick={() => setShowCancelConfirm(true)}
              disabled={deleting}
              className="bg-white dark:bg-[var(--sw-surface)] hover:bg-red-50 dark:hover:bg-red-500/10 text-slate-700 dark:text-stone-300 hover:text-red-600 dark:text-red-400 font-bold px-5 py-2 rounded-full text-[11px] transition-colors border border-slate-200 dark:border-white/10 disabled:opacity-50"
            >
              {deleting ? "Cancelling..." : "Cancel Booking"}
            </button>
          </div>
        )}
      </div>

      {/* Payment Error */}
      {paymentError && (
        <div className="mt-3 flex items-start gap-1.5 text-[11px] font-medium text-red-600 dark:text-red-400 bg-red-50/90 dark:bg-red-500/10 backdrop-blur-sm p-2 rounded-lg border border-red-100 dark:border-red-500/20">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <p>{paymentError}</p>
        </div>
      )}
    </>
  );

  return (
    <>
      <div className="w-full h-[540px] group">
        <ListingCard
          name={booking.providerName}
          image={venueImage ?? ""}
          scrimHeightClass="h-[85%]"
          badge={<div className="absolute top-3 left-3 z-20">{getStatusBadge()}</div>}
          topRight={
            <button
              className="p-2 rounded-full bg-white/90 backdrop-blur-sm text-slate-400 hover:text-red-500 hover:bg-white transition-colors shadow-sm"
              onClick={(e) => e.preventDefault()}
              aria-label="Shortlist"
            >
              <HeartIcon className="w-4 h-4" />
            </button>
          }
          body={cardBody}
        />
      </div>

      {/* Custom Confirmation Modal via Portal */}
      {showCancelConfirm && mounted && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-[var(--sw-surface)] rounded-3xl p-6 max-w-sm w-full mx-4 text-center shadow-2xl border border-slate-100 dark:border-white/10 flex flex-col items-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center text-red-500 mb-4 animate-pulse">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-stone-200 mb-1">Cancel Booking?</h3>
            <p className="text-xs text-slate-500 dark:text-stone-400 mb-6 leading-relaxed">
              Are you sure you want to cancel and delete this booking for <span className="font-bold text-slate-700 dark:text-stone-300">{booking.providerName}</span>? This action cannot be undone.
            </p>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 bg-slate-100 dark:bg-[var(--sw-surface)]/10 hover:bg-slate-200 text-slate-700 dark:text-stone-300 font-bold py-3 rounded-full text-xs transition-colors"
              >
                Keep Booking
              </button>
              <button
                onClick={handleDeleteBooking}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-full text-xs transition-colors shadow-sm shadow-red-200"
              >
                Yes, Cancel
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
