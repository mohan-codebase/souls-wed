"use client";

import React, { useState } from "react";
import { Minus, Plus } from "lucide-react";

export interface CustomGuestState {
  adults: number;
  children: number;
  childAges: number[];
  pets: boolean;
}

export const DEFAULT_CUSTOM_GUEST_STATE: CustomGuestState = {
  adults: 2,
  children: 0,
  childAges: [],
  pets: false,
};

interface StayGuestSelectorProps {
  initialState?: CustomGuestState;
  onApply: (state: CustomGuestState) => void;
  onClear?: () => void;
}

export default function StayGuestSelector({
  initialState = DEFAULT_CUSTOM_GUEST_STATE,
  onApply,
  onClear,
}: StayGuestSelectorProps) {
  const [adults, setAdults] = useState(initialState.adults);
  const [children, setChildren] = useState(initialState.children);
  const [childAges, setChildAges] = useState<number[]>(initialState.childAges);
  const [pets, setPets] = useState(initialState.pets);

  const handleAdultsChange = (delta: number) => {
    setAdults((prev) => Math.max(1, Math.min(5000, prev + delta)));
  };

  const handleAdultsInput = (val: number) => {
    const safeVal = Math.max(1, Math.min(5000, isNaN(val) ? 1 : val));
    setAdults(safeVal);
  };

  const handleChildrenChange = (delta: number) => {
    const nextChildren = Math.max(0, Math.min(1000, children + delta));
    setChildren(nextChildren);

    setChildAges((prevAges) => {
      if (nextChildren > prevAges.length && prevAges.length < 10) {
        const addedCount = Math.min(nextChildren - prevAges.length, 10 - prevAges.length);
        return [...prevAges, ...Array(addedCount).fill(0)];
      } else if (nextChildren < prevAges.length) {
        return prevAges.slice(0, nextChildren);
      }
      return prevAges;
    });
  };

  const handleChildrenInput = (val: number) => {
    const nextChildren = Math.max(0, Math.min(1000, isNaN(val) ? 0 : val));
    setChildren(nextChildren);

    setChildAges((prevAges) => {
      if (nextChildren > prevAges.length && prevAges.length < 10) {
        const addedCount = Math.min(nextChildren - prevAges.length, 10 - prevAges.length);
        return [...prevAges, ...Array(addedCount).fill(0)];
      } else if (nextChildren < prevAges.length) {
        return prevAges.slice(0, nextChildren);
      }
      return prevAges;
    });
  };

  const handleAgeChange = (index: number, age: number) => {
    setChildAges((prevAges) => {
      const updated = [...prevAges];
      updated[index] = age;
      return updated;
    });
  };

  const handleApply = () => {
    onApply({
      adults,
      children,
      childAges,
      pets,
    });
  };

  return (
    <div className="w-full px-4 py-3 text-[var(--sw-navy)] select-none">
      {/* ── Adults Stepper ── */}
      <div className="flex items-center justify-between py-3 border-b border-gray-100">
        <div>
          <p className="text-sm font-bold">Adults</p>
          <p className="text-[11px] text-gray-400">18+ Years Old</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Decrease adults"
            disabled={adults <= 1}
            onClick={() => handleAdultsChange(-1)}
            className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:border-[var(--sw-primary)] hover:text-[var(--sw-primary)] disabled:opacity-35 disabled:pointer-events-none transition-all focus:outline-none focus:ring-1 focus:ring-[var(--sw-primary)]"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <input
            type="number"
            min={1}
            max={5000}
            value={adults}
            onChange={(e) => handleAdultsInput(parseInt(e.target.value, 10))}
            className="w-12 text-center text-sm font-bold bg-transparent border border-transparent hover:border-gray-300 focus:border-[var(--sw-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--sw-primary)] rounded py-1 transition-all"
            aria-label="Number of adults"
          />
          <button
            type="button"
            aria-label="Increase adults"
            disabled={adults >= 5000}
            onClick={() => handleAdultsChange(1)}
            className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:border-[var(--sw-primary)] hover:text-[var(--sw-primary)] disabled:opacity-35 disabled:pointer-events-none transition-all focus:outline-none focus:ring-1 focus:ring-[var(--sw-primary)]"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Children Stepper ── */}
      <div className="flex items-center justify-between py-3 border-b border-gray-100">
        <div>
          <p className="text-sm font-bold">Children</p>
          <p className="text-[11px] text-gray-400">0 - 17 Years Old</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Decrease children"
            disabled={children <= 0}
            onClick={() => handleChildrenChange(-1)}
            className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:border-[var(--sw-primary)] hover:text-[var(--sw-primary)] disabled:opacity-35 disabled:pointer-events-none transition-all focus:outline-none focus:ring-1 focus:ring-[var(--sw-primary)]"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <input
            type="number"
            min={0}
            max={1000}
            value={children}
            onChange={(e) => handleChildrenInput(parseInt(e.target.value, 10))}
            className="w-12 text-center text-sm font-bold bg-transparent border border-transparent hover:border-gray-300 focus:border-[var(--sw-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--sw-primary)] rounded py-1 transition-all"
            aria-label="Number of children"
          />
          <button
            type="button"
            aria-label="Increase children"
            disabled={children >= 1000}
            onClick={() => handleChildrenChange(1)}
            className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:border-[var(--sw-primary)] hover:text-[var(--sw-primary)] disabled:opacity-35 disabled:pointer-events-none transition-all focus:outline-none focus:ring-1 focus:ring-[var(--sw-primary)]"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Guidance Notice ── */}
      <p className="text-xs text-gray-500 my-3 leading-relaxed border-b border-gray-100 pb-3">
        Please provide right number of children along with their right age for best options and prices.
      </p>

      {/* ── Age of Children Section ── */}
      {children > 0 && (
        <div className="py-2 border-b border-gray-100 animate-fadeIn">
          <p className="text-sm font-bold text-[var(--sw-navy)] mb-1">
            Age of Children
          </p>
          {children > 10 && (
            <p className="text-[11px] text-amber-600 font-medium mb-2.5">
              Showing age selection for the first 10 children. For larger event groups, vendor coordinates ages directly.
            </p>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto pr-1">
            {Array.from({ length: Math.min(children, 10) }).map((_, i) => (
              <div key={i} className="flex flex-col gap-1">
                <label
                  htmlFor={`child-age-${i}`}
                  className="text-xs font-semibold text-gray-600"
                >
                  Child {i + 1}
                </label>
                <select
                  id={`child-age-${i}`}
                  value={childAges[i] ?? 0}
                  onChange={(e) => handleAgeChange(i, Number(e.target.value))}
                  className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-medium bg-white text-[var(--sw-navy)] focus:outline-none focus:ring-2 focus:ring-[var(--sw-primary)] focus:border-transparent transition-all cursor-pointer"
                >
                  {Array.from({ length: 18 }).map((_, age) => (
                    <option key={age} value={age}>
                      {age === 0 ? "< 1 year" : `${age} ${age === 1 ? "year" : "years"}`}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Action Buttons ── */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
        {onClear ? (
          <button
            type="button"
            onClick={onClear}
            className="text-xs font-bold text-gray-400 hover:text-gray-700 transition-colors py-1.5 px-2 focus:outline-none"
          >
            Clear
          </button>
        ) : (
          <div />
        )}
        <button
          type="button"
          onClick={handleApply}
          className="bg-[var(--sw-primary)] hover:bg-[#d5621b] text-white font-bold px-7 py-2.5 rounded-full text-sm shadow-md hover:shadow-lg transition-all transform active:scale-95 focus:outline-none focus:ring-2 focus:ring-[var(--sw-primary)] focus:ring-offset-2"
        >
          APPLY
        </button>
      </div>
    </div>
  );
}
