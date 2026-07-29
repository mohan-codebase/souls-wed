"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "@/components/shared/CustomImage";

// The root layout persists across client-side navigations, so this must only
// run once per page load — not once per component instance. Re-triggering on
// every `pathname` change (the previous behavior) put a `pointer-events: auto`,
// z-[9999] overlay on top of the whole app for ~1.5-2.3s after every search
// submit, filter click, or city selection, silently swallowing the click.
let hasShownPreloader = false;

export default function Preloader() {
  const [isLoading, setIsLoading] = useState(!hasShownPreloader);

  useEffect(() => {
    if (hasShownPreloader) return;
    hasShownPreloader = true;

    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500); // 1.5 seconds display

    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.8, ease: "easeInOut" } }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden pointer-events-none"
          style={{ background: "var(--sw-preloader-bg)" }} // Theme-aware premium background
        >
          {/* Animated background noise/texture */}
          <div className="absolute inset-0 opacity-20 pointer-events-none noise-texture" />

          {/* Golden accent glow in the center */}
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.15 }}
            transition={{ duration: 2, ease: "easeOut" }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40vw] h-[40vw] max-w-[600px] max-h-[600px] bg-amber-400 rounded-full blur-[120px] pointer-events-none"
          />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
            className="relative z-10 flex flex-col items-center"
          >
            {/* Logo Image */}
            <div className="relative w-48 md:w-64 h-12 md:h-16 mb-6">
              <Image
                src="/logo/logo-by-soulswed.png" // Using the main logo
                alt="SoulsWed"
                fill
                sizes="(max-width: 768px) 192px, 256px"
                className="object-contain" // Original dark logo
                loading="eager"
                priority
              />
            </div>

            {/* Tagline / Loading bar */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.8 }}
              className="flex flex-col items-center"
            >
              <p className="text-amber-600 font-bold uppercase tracking-[0.3em] text-xs md:text-sm mb-6">
                Your Destination, Our Expertice
              </p>

              {/* Elegant thin loading bar */}
              <div className="w-48 h-[2px] bg-amber-100 rounded-full overflow-hidden relative">
                <motion.div
                  initial={{ x: "-100%" }}
                  animate={{ x: "100%" }}
                  transition={{ 
                    repeat: Infinity, 
                    duration: 1.5, 
                    ease: "easeInOut" 
                  }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-500 to-transparent w-full h-full"
                />
              </div>
            </motion.div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
