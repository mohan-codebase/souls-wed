/**
 * BOOKING FORM COMPONENT
 * 
 * Generic Booking Widget supporting Venues and 12 Vendor Categories.
 */

"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { formatAsCurrency, CURRENCIES } from "@/lib/currency";
import { BedDouble, Loader2, AlertCircle, CheckCircle2, Clock, User } from "lucide-react";
import { UsersIcon } from "@/components/ui/users";
import { CalendarDaysIcon } from "@/components/ui/calendar-days";
import { IndianRupeeIcon } from "@/components/ui/indian-rupee";
import { PhoneIcon } from "@/components/ui/phone";
import BookingCalendar from "./BookingCalendar";
import { useCurrency } from "@/lib/CurrencyContext";
import { PhoneInput } from "@/components/shared/PhoneInput";

// ─── Types ───────────────────────────────────────────────────
interface BookingFormProps {
  providerId: string;
  providerName: string;
  bookingTypes: { value: string; label: string }[];
  
  // Pricing & Advance
  advancePercentage?: number; // e.g. 30
  
  // Venue specific
  pricePerPlateVeg?: string;
  pricePerPlateNonVeg?: string;
  rentalCost?: string;
  pricePerRoom?: number;
  minGuests?: number;
  maxGuests?: number;
  totalRooms?: number;
  
  // Vendor specific
  fixedPrice?: number;
  hourlyPrice?: number;
}

function parsePrice(priceStr?: string | number): number {
  if (typeof priceStr === "number") return priceStr;
  if (!priceStr) return 0;
  const cleaned = priceStr.toString().replace(/[^0-9]/g, "");
  return parseInt(cleaned, 10) || 0;
}

function calculateNights(checkIn: string, checkOut: string): number {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const diff = end.getTime() - start.getTime();
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export default function BookingForm({
  providerId,
  providerName,
  bookingTypes = [{ value: "venue", label: "Book Venue" }],
  advancePercentage = 30,
  pricePerPlateVeg,
  pricePerPlateNonVeg,
  rentalCost,
  pricePerRoom,
  minGuests = 50,
  maxGuests = 1000,
  totalRooms = 1,
  fixedPrice,
  hourlyPrice,
}: BookingFormProps) {
  const router = useRouter();

  const [bookingType, setBookingType] = useState<string>(bookingTypes[0]?.value || "venue");

  const [bookedDates, setBookedDates] = useState<string[]>([]);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [checkIn, setCheckIn] = useState<string | null>(null);
  const [checkOut, setCheckOut] = useState<string | null>(null);
  const [loadingDates, setLoadingDates] = useState(false);

  const { currency } = useCurrency();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(true);

  const [guestCount, setGuestCount] = useState<number>(minGuests);
  const [roomCount, setRoomCount] = useState<number>(1);
  const [hours, setHours] = useState<number>(4);
  const [menuType, setMenuType] = useState<"veg" | "nonveg">("veg");
  const [functionType, setFunctionType] = useState("wedding");
  const [functionTime, setFunctionTime] = useState("evening");
  const [userName, setUserName] = useState("");
  const [phone, setPhone] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");
  const [notifyWhatsapp, setNotifyWhatsapp] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        setIsLoggedIn(data.authenticated === true);
        if (data.authenticated && data.user) {
          if (data.user.name) setUserName(data.user.name);
          if (data.user.phone) setPhone(data.user.phone);
        }
      })
      .catch(() => setIsLoggedIn(false));
  }, []);

  const fetchAvailability = async (yearMonth: string) => {
    setLoadingDates(true);
    try {
      const res = await fetch(
        `/api/bookings/availability?providerId=${providerId}&month=${yearMonth}`
      );
      if (res.ok) {
        const data = await res.json();
        setBookedDates(data.blockedDates || []);
      }
    } catch (err) {
      console.error("Failed to fetch availability:", err);
    } finally {
      setLoadingDates(false);
    }
  };

  const priceBreakdown = useMemo(() => {
    let total = 0;
    let perUnit = 0;
    let unitLabel = "";
    let quantity = 1;
    let quantityLabel = "";
    let nights = 0;

    if (bookingType === "venue") {
      const vegPrice = parsePrice(pricePerPlateVeg);
      const nonVegPrice = parsePrice(pricePerPlateNonVeg);
      const baseRental = parsePrice(rentalCost);
      const daysCount = Math.max(1, selectedDates.length);
      
      if (vegPrice > 0 || nonVegPrice > 0) {
        perUnit = menuType === "veg" ? vegPrice : nonVegPrice;
        total = guestCount * perUnit * daysCount;
        unitLabel = "per plate";
        quantity = guestCount * daysCount;
        quantityLabel = `guests (${daysCount} ${daysCount === 1 ? 'day' : 'days'})`;
      } else {
        perUnit = baseRental;
        total = baseRental * daysCount;
        unitLabel = "fixed rental fee per day";
        quantity = daysCount;
        quantityLabel = daysCount === 1 ? 'day' : 'days';
      }
    } else if (bookingType === "room") {
      perUnit = pricePerRoom || Math.round(parsePrice(rentalCost) / (totalRooms || 1));
      nights = checkIn && checkOut ? calculateNights(checkIn, checkOut) : 1;
      total = roomCount * perUnit * nights;
      unitLabel = "per room/night";
      quantity = roomCount;
      quantityLabel = "rooms";
    } else {
      // Vendor categories
      const daysCount = Math.max(1, selectedDates.length);
      if (hourlyPrice) {
        perUnit = hourlyPrice;
        total = hours * perUnit * daysCount;
        unitLabel = "per hour";
        quantity = hours * daysCount;
        quantityLabel = `hours (${daysCount} ${daysCount === 1 ? 'day' : 'days'})`;
      } else {
        perUnit = fixedPrice || 0;
        total = perUnit * daysCount;
        unitLabel = "fixed fee per day";
        quantity = daysCount;
        quantityLabel = daysCount === 1 ? 'day' : 'days';
      }
    }

    const advance = Math.round(total * (advancePercentage / 100));

    return { perUnit, unitLabel, quantity, quantityLabel, nights, total, advance };
  }, [bookingType, guestCount, roomCount, hours, menuType, checkIn, checkOut, selectedDates,
      pricePerPlateVeg, pricePerPlateNonVeg, pricePerRoom, rentalCost, totalRooms, fixedPrice, hourlyPrice, advancePercentage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (bookingType !== "room" && selectedDates.length === 0) {
      setError("Please select at least one event date on the calendar.");
      return;
    }
    if (bookingType === "room" && (!checkIn || !checkOut)) {
      setError("Please select check-in and check-out dates.");
      return;
    }
    if (priceBreakdown.total <= 0) {
      setError("Unable to calculate price. Please check your selections.");
      return;
    }

    if (!userName.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (!phone || phone.trim().length < 7) {
      setError("Please enter a valid contact phone number.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerId,
          providerName,
          bookingType,
          eventDates: bookingType !== "room" ? selectedDates : undefined,
          checkIn: bookingType === "room" ? checkIn : undefined,
          checkOut: bookingType === "room" ? checkOut : undefined,
          guestCount: bookingType === "venue" ? guestCount : undefined,
          roomCount: bookingType === "room" ? roomCount : undefined,
          hours: bookingType !== "venue" && bookingType !== "room" ? hours : undefined,
          // The server re-prices the booking from the database and needs to know
          // which menu was picked; without it a non-veg selection would be
          // priced as veg and the totals would disagree. See lib/pricing.ts.
          menuType: bookingType === "venue" ? menuType : undefined,
          // Advisory only — the server recalculates and rejects a mismatch.
          totalAmount: priceBreakdown.total,
          advanceAmount: priceBreakdown.advance,
          currency,
          functionType,
          functionTime,
          specialRequests,
          notifyWhatsapp,
          userName: userName.trim(),
          userPhone: phone,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ? `${data.message} (${data.error})` : data.message || "Failed to create booking.");
      }

      setBookingId(data.booking.id);
      setSuccess(true);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (success && bookingId) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-8 px-4">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mb-4 animate-bounce">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-2">Booking Created!</h3>
        <p className="text-sm text-slate-500 mb-1">Your booking is <span className="font-bold text-amber-600">pending payment</span>.</p>
        <p className="text-xs text-slate-400 mb-6">Pay {formatAsCurrency(priceBreakdown.advance, currency)} advance to confirm.</p>
        <button
          onClick={() => router.push(`/checkout/${bookingId}`)}
          className="w-full bg-primary-600 text-white font-bold py-3.5 rounded-full text-sm"
        >
          Proceed to Checkout
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {bookingTypes.length > 1 && (
        <div className="flex bg-slate-100 p-1 rounded-2xl relative overflow-x-auto whitespace-nowrap">
          {bookingTypes.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => setBookingType(type.value)}
              className={`flex-1 min-w-fit px-3 py-2.5 text-xs font-bold transition-colors rounded-xl ${
                bookingType === type.value
                  ?"bg-white text-slate-900"
                  :"text-slate-500 hover:text-slate-700"
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      )}

      <div className="bg-white border border-slate-100 rounded-2xl p-4">
        <h4 className="text-xs font-bold text-slate-600 mb-3 flex items-center gap-1.5">
          <CalendarDaysIcon className="w-3.5 h-3.5 text-primary-500" />
          {bookingType === "room" ? "Select Stay Dates" : "Select Event Date"}
        </h4>

        {loadingDates && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-primary-500" />
          </div>
        )}

        <BookingCalendar
          mode={bookingType === "room" ? "range" : "multiple"}
          bookedDates={bookedDates}
          selectedDates={selectedDates}
          onDatesSelect={(dates) => setSelectedDates(dates)}
          onRangeSelect={(ci, co) => {
            setCheckIn(ci);
            setCheckOut(co);
          }}
          onMonthChange={fetchAvailability}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {bookingType === "venue" && (
          <>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
                <UsersIcon className="w-3.5 h-3.5 text-primary-500" /> Guests
              </label>
              <input
                type="number"
                min={minGuests}
                max={maxGuests}
                value={guestCount}
                onChange={(e) => setGuestCount(Number(e.target.value))}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-base md:text-sm outline-none focus:border-primary-400 transition-colors"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-600">Menu Type</label>
              <select
                value={menuType}
                onChange={(e) => setMenuType(e.target.value as "veg" | "nonveg")}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-base md:text-sm outline-none focus:border-primary-400 transition-colors"
              >
                <option value="veg">Vegetarian</option>
                <option value="nonveg">Non-Vegetarian</option>
              </select>
            </div>
          </>
        )}

        {bookingType === "room" && (
          <>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
                <BedDouble className="w-3.5 h-3.5 text-primary-500" /> Rooms
              </label>
              <input
                type="number"
                min={1}
                max={totalRooms}
                value={roomCount}
                onChange={(e) => setRoomCount(Number(e.target.value))}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-base md:text-sm outline-none focus:border-primary-400 transition-colors"
                required
              />
            </div>
          </>
        )}

        {hourlyPrice && bookingType !== "venue" && bookingType !== "room" && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-primary-500" /> Hours
            </label>
            <input
              type="number"
              min={1}
              max={24}
              value={hours}
              onChange={(e) => setHours(Number(e.target.value))}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-base md:text-sm outline-none focus:border-primary-400 transition-colors"
              required
            />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
            <User className="w-3.5 h-3.5 text-primary-500" /> Full Name
          </label>
          <input
            type="text"
            placeholder="Enter full name"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-base md:text-sm outline-none focus:border-primary-400 transition-colors"
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
            <PhoneIcon className="w-3.5 h-3.5 text-primary-500" /> Contact Number
          </label>
          <PhoneInput
            placeholder="Enter contact number"
            value={phone}
            onChange={setPhone}
          />
        </div>
      </div>

      <div className="bg-primary-50/50 border border-primary-100 rounded-2xl p-4 mt-2">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <IndianRupeeIcon className="w-3.5 h-3.5 text-primary-500" /> Price Breakdown
          </h4>
        </div>
        <div className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">
              {formatAsCurrency(priceBreakdown.perUnit, currency)} {priceBreakdown.unitLabel} × {priceBreakdown.quantity} {priceBreakdown.quantityLabel}
            </span>
            <span className="font-bold text-slate-800">{formatAsCurrency(priceBreakdown.total, currency)}</span>
          </div>
          <div className="border-t border-primary-200 pt-2 flex justify-between">
            <span className="text-slate-600 font-semibold">Advance ({advancePercentage}%)</span>
            <span className="font-black text-primary-600 text-base">{formatAsCurrency(priceBreakdown.advance, currency)}</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex gap-2 items-start text-red-700 text-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {!isLoggedIn ? (
        <button
          type="button"
          onClick={() => router.push("/login")}
          className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-4 rounded-full text-sm mt-2"
        >
          Book Now
        </button>
      ) : (
        <button
          type="submit"
          disabled={submitting || loadingDates}
          className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-4 rounded-full text-sm mt-2 disabled:opacity-50"
        >
          {submitting ? "Creating Booking..." : `Book Now — Pay ${formatAsCurrency(priceBreakdown.advance, currency)}`}
        </button>
      )}
    </form>
  );
}
