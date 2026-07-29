/**
 * BOOKING CALENDAR COMPONENT
 * 
 * This is a custom-built interactive calendar. Here's WHY we build our own
 * instead of using a library:
 * 1. No extra dependency = smaller bundle
 * 2. Full control over styling (matches our glass design system)
 * 3. The logic is surprisingly simple — it's just a 7-column grid
 * 
 * HOW THE CALENDAR MATH WORKS:
 * 
 * To render a month grid, we need to know two things:
 *   a) What day of the week does the 1st fall on? (0=Sun, 1=Mon, ..., 6=Sat)
 *   b) How many total days in the month? (28, 29, 30, or 31)
 * 
 * Example: July 2026
 *   - July 1 is a Wednesday (index 3)
 *   - July has 31 days
 *   - Grid: [empty, empty, empty, 1, 2, 3, 4, 5, 6, 7, ...]
 * 
 * TWO MODES:
 *   - "single" (for venue booking) — click a date to select it
 *   - "range"  (for room booking)  — click two dates for check-in/check-out
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeftIcon } from "@/components/ui/chevron-left";
import { ChevronRightIcon } from "@/components/ui/chevron-right";

// ─── Types ───────────────────────────────────────────────────
interface BookingCalendarProps {
  /** "single" for venues (one date), "range" for rooms (check-in → check-out), "multiple" for multiple dates */
  mode: "single" | "range" | "multiple";
  /** Array of "YYYY-MM-DD" strings that are already booked and should be greyed out */
  bookedDates: string[];
  /** Called when user selects a date (single mode) */
  onDateSelect?: (date: string) => void;
  /** Called when user selects multiple dates (multiple mode) */
  onDatesSelect?: (dates: string[]) => void;
  /** Called when user selects a date range (range mode) */
  onRangeSelect?: (checkIn: string, checkOut: string) => void;
  /** Called when month changes — parent fetches new availability data */
  onMonthChange?: (yearMonth: string) => void;
  /** The currently selected date from the parent component (for single mode) */
  selectedDate?: string | null;
  /** The currently selected dates from the parent component (for multiple mode) */
  selectedDates?: string[];
  /** The currently selected range from the parent component (for range mode) */
  selectedRange?: { start: string; end: string } | null;
}

// Day names for the header row
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ─── Helper functions ────────────────────────────────────────

/** Format a Date object as "YYYY-MM-DD" */
function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Format as "YYYY-MM" for API calls */
function formatYearMonth(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/** Get the number of days in a month (handles Feb/leap years automatically) */
function getDaysInMonth(year: number, month: number): number {
  // new Date(2026, 7, 0) → July 31 (day 0 of August = last day of July)
  return new Date(year, month + 1, 0).getDate();
}

/** Get what day of the week the 1st of the month falls on (0=Sun) */
function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

/** Check if a date string is in the past */
function isPastDate(dateStr: string): boolean {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
}

/** Check if a date string is today */
function isToday(dateStr: string): boolean {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const today = new Date();
  return date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
}

/** Check if dateStr falls between start and end (inclusive) */
function isInRange(dateStr: string, start: string, end: string): boolean {
  return dateStr >= start && dateStr <= end;
}

// ─── Component ───────────────────────────────────────────────

export default function BookingCalendar({
  mode,
  bookedDates,
  onDateSelect,
  onDatesSelect,
  onRangeSelect,
  onMonthChange,
  selectedDate: externalSelectedDate,
  selectedDates: externalSelectedDates,
  selectedRange: externalSelectedRange,
}: BookingCalendarProps) {
  // Current month being displayed
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (mode === "single" && externalSelectedDate) {
      const [y, m, d] = externalSelectedDate.split("-").map(Number);
      return new Date(y, m - 1, d);
    } else if (mode === "multiple" && externalSelectedDates && externalSelectedDates.length > 0) {
      const [y, m, d] = externalSelectedDates[0].split("-").map(Number);
      return new Date(y, m - 1, d);
    } else if (mode === "range" && externalSelectedRange?.start) {
      const [y, m, d] = externalSelectedRange.start.split("-").map(Number);
      return new Date(y, m - 1, d);
    }
    return new Date();
  });

  // Selected date(s)
  const [selectedDate, setSelectedDate] = useState<string | null>(externalSelectedDate || null);
  const [selectedDates, setSelectedDates] = useState<string[]>(externalSelectedDates || []);

  useEffect(() => {
    if (externalSelectedDate !== undefined) {
      setSelectedDate(externalSelectedDate || null);
    }
  }, [externalSelectedDate]);

  useEffect(() => {
    if (externalSelectedDates !== undefined) {
      setSelectedDates(externalSelectedDates || []);
    }
  }, [externalSelectedDates]);

  const [rangeStart, setRangeStart] = useState<string | null>(externalSelectedRange?.start || null);
  const [rangeEnd, setRangeEnd] = useState<string | null>(externalSelectedRange?.end || null);

  useEffect(() => {
    if (externalSelectedRange !== undefined) {
      setRangeStart(externalSelectedRange?.start || null);
      setRangeEnd(externalSelectedRange?.end || null);
    }
  }, [externalSelectedRange]);

  // Hover state for range preview
  const [hoverDate, setHoverDate] = useState<string | null>(null);

  // ─── Notify parent when month changes ───
  useEffect(() => {
    onMonthChange?.(formatYearMonth(currentMonth));
  }, [currentMonth]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Calendar data ───
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  // Month display name (e.g., "July 2026")
  const monthName = currentMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  // ─── Navigation handlers ───
  const goToPrevMonth = () => {
    const prev = new Date(year, month - 1, 1);
    // Don't allow navigating to past months
    const now = new Date();
    if (prev.getFullYear() < now.getFullYear() ||
      (prev.getFullYear() === now.getFullYear() && prev.getMonth() < now.getMonth())) {
      return;
    }
    setCurrentMonth(prev);
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1));
  };

  // ─── Date click handler ───
  const handleDateClick = useCallback((dateStr: string) => {
    // Can't select past dates or booked dates
    if (isPastDate(dateStr) || bookedDates.includes(dateStr)) return;

    if (mode === "single") {
      // SINGLE MODE: Click to select, click again to deselect
      setSelectedDate(dateStr);
      onDateSelect?.(dateStr);
    } else if (mode === "multiple") {
      // MULTIPLE MODE: Toggle dates
      const newDates = selectedDates.includes(dateStr)
        ? selectedDates.filter((d) => d !== dateStr)
        : [...selectedDates, dateStr].sort();
      setSelectedDates(newDates);
      onDatesSelect?.(newDates);
    } else {
      // RANGE MODE: First click = check-in, second click = check-out
      if (!rangeStart || rangeEnd) {
        // Starting a new range
        setRangeStart(dateStr);
        setRangeEnd(null);
      } else {
        // Completing the range
        if (dateStr < rangeStart) {
          // User clicked a date before the start — swap
          setRangeEnd(rangeStart);
          setRangeStart(dateStr);
          onRangeSelect?.(dateStr, rangeStart);
        } else if (dateStr === rangeStart) {
          // Clicked the same date — treat as a 1-day event instead of resetting
          setRangeEnd(dateStr);
          onRangeSelect?.(rangeStart, dateStr);
        } else {
          // Check if any booked date falls within the range
          const hasBookedInRange = bookedDates.some(
            (bd) => bd > rangeStart && bd < dateStr
          );
          if (hasBookedInRange) {
            // Can't book a range that includes already-booked dates
            return;
          }
          setRangeEnd(dateStr);
          onRangeSelect?.(rangeStart, dateStr);
        }
      }
    }
  }, [mode, rangeStart, rangeEnd, selectedDates, bookedDates, onDateSelect, onDatesSelect, onRangeSelect]);

  // ─── Determine cell styling for each date ───
  const getCellStyle = (dateStr: string) => {
    const isBooked = bookedDates.includes(dateStr);
    const isPast = isPastDate(dateStr);
    const isTodayDate = isToday(dateStr);

    // Base states
    if (isPast) return "text-slate-300 cursor-not-allowed";
    if (isBooked) return "bg-slate-100 text-slate-400 cursor-not-allowed line-through";

    // Single mode selection
    if (mode === "single" && selectedDate === dateStr) {
      return "bg-primary-500 text-white font-bold";
    }

    // Multiple mode selection
    if (mode === "multiple" && selectedDates.includes(dateStr)) {
      return "bg-primary-500 text-white font-bold";
    }

    // Range mode selection
    if (mode === "range") {
      if (dateStr === rangeStart || dateStr === rangeEnd) {
        return "bg-primary-500 text-white font-bold";
      }
      // Dates between start and end
      if (rangeStart && rangeEnd && isInRange(dateStr, rangeStart, rangeEnd)) {
        return "bg-primary-100 text-primary-800 font-semibold";
      }
      // Hover preview (before second click)
      if (rangeStart && !rangeEnd && hoverDate && dateStr > rangeStart && dateStr <= hoverDate) {
        // Check no booked dates in this preview range
        const hasBookedBetween = bookedDates.some(
          (bd) => bd > rangeStart && bd < dateStr
        );
        if (!hasBookedBetween) {
          return "bg-primary-50 text-primary-700";
        }
      }
    }

    // Today highlight
    if (isTodayDate) return "ring-2 ring-primary-400 ring-inset font-bold text-primary-600";

    // Default: available date
    return "hover:bg-primary-50 text-slate-700 cursor-pointer";
  };

  // ─── Build the grid ───
  // We need (firstDay) empty cells before the 1st, then (daysInMonth) numbered cells
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);        // Empty cells
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);        // Day numbers

  // Check if prev month button should be disabled
  const now = new Date();
  const isPrevDisabled = year === now.getFullYear() && month === now.getMonth();

  return (
    <div className="w-full">
      {/* ─── Month navigation header ─── */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={goToPrevMonth}
          disabled={isPrevDisabled}
          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${isPrevDisabled
              ? "text-slate-300 cursor-not-allowed"
              : "text-slate-600 hover:bg-primary-50 hover:text-primary-600"
            }`}
        >
          <ChevronLeftIcon className="w-5 h-5" />
        </button>
        <h3 className="text-sm font-bold text-slate-800">{monthName}</h3>
        <button
          type="button"
          onClick={goToNextMonth}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-600 hover:bg-primary-50 hover:text-primary-600 transition-colors"
        >
          <ChevronRightIcon className="w-5 h-5" />
        </button>
      </div>

      {/* ─── Day name headers ─── */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {DAY_NAMES.map((day) => (
          <div key={day} className="text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider py-1">
            {day}
          </div>
        ))}
      </div>

      {/* ─── Calendar grid ─── */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, index) => {
          if (day === null) {
            // Empty cell (before the 1st of the month)
            return <div key={`empty-${index}`} className="aspect-square" />;
          }

          const dateStr = formatDate(new Date(year, month, day));
          const cellStyle = getCellStyle(dateStr);
          const isBooked = bookedDates.includes(dateStr);
          const isPast = isPastDate(dateStr);
          const isClickable = !isPast && !isBooked;

          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => isClickable && handleDateClick(dateStr)}
              onMouseEnter={() => isClickable && mode === "range" && setHoverDate(dateStr)}
              onMouseLeave={() => setHoverDate(null)}
              disabled={!isClickable}
              className={`aspect-square rounded-xl flex items-center justify-center text-sm transition-all duration-150 ${cellStyle}`}
            >
              {day}
            </button>
          );
        })}
      </div>

      {/* ─── Legend ─── */}
      <div className="flex items-center gap-4 mt-4 text-[10px] text-slate-500">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-primary-500" />
          <span>Selected</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-slate-100 border border-slate-200" />
          <span>Booked</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded ring-2 ring-primary-400" />
          <span>Today</span>
        </div>
      </div>
    </div>
  );
}
