"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { CURRENCIES, CurrencyDetail } from "./currency";

interface CurrencyContextType {
  currency: string;
  currencyDetail: CurrencyDetail;
  setCurrency: (code: string) => void;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("preferredCurrency");
      if (saved && CURRENCIES[saved]) return saved;
    }
    return "INR";
  });

  const setCurrency = (code: string) => {
    if (CURRENCIES[code]) {
      setCurrencyState(code);
      localStorage.setItem("preferredCurrency", code);
    }
  };

  const currencyDetail = CURRENCIES[currency] || CURRENCIES.INR;

  return (
    <CurrencyContext.Provider value={{ currency, currencyDetail, setCurrency }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
}
