"use client";

import React, { useState, useEffect, useMemo } from "react";
import { countries } from "@/lib/countries";
import { PhoneIcon } from "@/components/ui/phone";

interface PhoneInputProps {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  name?: string;
}

export function PhoneInput({ value, defaultValue = "", onChange, placeholder = "Enter phone number", className = "", disabled = false, name }: PhoneInputProps) {
  const initialPhone = value ?? defaultValue;
  const defaultCountry = countries.find(c => c.code === "IN") || countries[0];

  // Helper to parse the incoming value into country code and local number
  const { initialDialCode, initialLocalNumber } = useMemo(() => {
    let bestMatch = defaultCountry;
    let localNum = initialPhone || "";
    
    // Sort countries by dial code length descending to match longest dial codes first (e.g. +1 vs +1242)
    const sortedCountries = [...countries].sort((a, b) => b.dialCode.length - a.dialCode.length);
    
    for (const country of sortedCountries) {
      if (initialPhone.startsWith(country.dialCode)) {
        bestMatch = country;
        localNum = initialPhone.substring(country.dialCode.length).trim();
        break;
      }
    }
    
    return { initialDialCode: bestMatch.dialCode, initialLocalNumber: localNum };
  }, [initialPhone, defaultCountry]);

  const [dialCode, setDialCode] = useState(initialDialCode);
  const [localNumber, setLocalNumber] = useState(initialLocalNumber);

  // When internal state changes by user input, propagate to parent
  const handleDialCodeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCode = e.target.value;
    setDialCode(newCode);
    if (onChange) onChange(newCode + localNumber);
  };

  const handleLocalNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newNum = e.target.value.replace(/[^\d\s-]/g, ""); // Allow digits, spaces, hyphens
    setLocalNumber(newNum);
    if (onChange) onChange(dialCode + newNum);
  };

  return (
    <div className={`relative flex items-center w-full ${className}`}>
      {/* Icon (optional, we keep it if parent wraps it, but the plan asked for a direct drop-in replacement) */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 z-10 pointer-events-none">
        <PhoneIcon className="w-4 h-4 text-stone-400" />
      </div>

      <select
        value={dialCode}
        onChange={handleDialCodeChange}
        disabled={disabled}
        className="absolute left-10 top-0 bottom-0 appearance-none bg-transparent outline-none z-10 pl-2 pr-6 border-r border-stone-200 dark:border-stone-700/50 text-sm font-semibold text-stone-700 dark:text-stone-300 cursor-pointer"
        style={{ width: "90px" }}
      >
        {countries.map((c) => (
          <option key={c.code} value={c.dialCode} className="text-black">
            {c.code} ({c.dialCode})
          </option>
        ))}
      </select>
      
      {/* Dropdown caret */}
      <div className="absolute left-[110px] top-1/2 -translate-y-1/2 pointer-events-none z-10">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-stone-400">
          <path d="m6 9 6 6 6-6"/>
        </svg>
      </div>

      <input
        type="tel"
        placeholder={placeholder}
        value={localNumber}
        onChange={handleLocalNumberChange}
        disabled={disabled}
        className="w-full h-10 text-xs pl-[135px] pr-4 bg-white/5 border border-stone-200 dark:border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-[var(--sw-primary)] transition-all dark:text-white font-semibold"
      />
      {name && (
        <input type="hidden" name={name} value={dialCode + localNumber} />
      )}
    </div>
  );
}
