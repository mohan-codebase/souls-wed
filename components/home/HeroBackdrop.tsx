"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

// ─────────────────────────────────────────────────────────────────────────────
// HERO BACKDROP
//
// The old version autoplayed four MP4s on a 6s loop with no poster and no
// preload hint — 27 MB pulled within 24 seconds of page load, on the LCP path
// (docs/hero-search-analysis.md §3). This version:
//
//   • paints an optimised, blurred-up poster first, so LCP is a ~70 KB image
//   • mounts only the currently visible clip, never all four
//   • stops rotating once the hero scrolls out of view
//   • serves posters only — zero video — on reduced-motion, Save-Data, or 2G/3G
//
// Worst case is now one video instead of four; best case is 294 KB of posters.
// ─────────────────────────────────────────────────────────────────────────────

interface HeroClip {
  src: string;
  poster: string;
  blurDataURL: string;
}

const CLIPS: HeroClip[] = [
  {
    src: "/videos/home/98d54592b8b559aaba3a1be833d89a41.mp4",
    poster: "/images/hero/98d54592b8b559aaba3a1be833d89a41.jpg",
    blurDataURL:
      "data:image/jpeg;base64,/9j//gAQTGF2YzYyLjI4LjEwMgD/2wBDAAgoKC8oLzc3Nzc3N0E8QUNDQ0FBQUFDQ0NISEhVVVVISEhDQ0hIUFBVVVxfXFdXVVdfX2RkZHh4c3OMjJGsrM//xABgAAEAAwEAAAAAAAAAAAAAAAAHAQIEBQEBAQEAAAAAAAAAAAAAAAAAAwAEEAACAQIGAwEAAAAAAAAAAAABAgATYSGiUdERYjEDgZERAQEBAAAAAAAAAAAAAAAAAAAREv/AABEIAAwAFAMBIgACEQADEQD/2gAMAwEAAhEDEQA/AEhWsR+TSfZxew4hOjHHHwJzCSW+TJsMLtfq2XeTX6tl3gLVfUy9V9THqf/Z",
  },
  {
    src: "/videos/home/6443f7453a5075757e193491d6a69ea1.mp4",
    poster: "/images/hero/6443f7453a5075757e193491d6a69ea1.jpg",
    blurDataURL:
      "data:image/jpeg;base64,/9j//gAQTGF2YzYyLjI4LjEwMgD/2wBDAAgoKC8oLzc3Nzc3N0E8QUNDQ0FBQUFDQ0NISEhVVVVISEhDQ0hIUFBVVVxfXFdXVVdfX2RkZHh4c3OMjJGsrM//xABcAAEBAQEAAAAAAAAAAAAAAAAGBAIFAQEBAQAAAAAAAAAAAAAAAAADAgQQAAICAgEFAQAAAAAAAAAAAAEAAhEhEgMxsYFBItERAQEAAAAAAAAAAAAAAAAAAABB/8AAEQgADAAUAwEiAAIRAAMRAP/aAAwDAQACEQMRAD8AdynKM+vz2w8Q7TkRtihkNHOcjyn+InevVfqbTDG7csblsL//2Q==",
  },
  {
    src: "/videos/home/dd38fc3826a28cf0ac334ea9e9835830.mp4",
    poster: "/images/hero/dd38fc3826a28cf0ac334ea9e9835830.jpg",
    blurDataURL:
      "data:image/jpeg;base64,/9j//gAQTGF2YzYyLjI4LjEwMgD/2wBDAAgoKC8oLzc3Nzc3N0E8QUNDQ0FBQUFDQ0NISEhVVVVISEhDQ0hIUFBVVVxfXFdXVVdfX2RkZHh4c3OMjJGsrM//xABaAAACAwEAAAAAAAAAAAAAAAAFBAMCBwYBAQEAAAAAAAAAAAAAAAAAAAMCEAACAgIDAQAAAAAAAAAAAAAAAQIRA3EhgTIiEQEBAAAAAAAAAAAAAAAAAAAAQf/AABEIAAwAFAMBIgACEQADEQD/2gAMAwEAAhEDEQA/ANNyR+Wc7FUnsL5vUewNj5vQFIWZUUk3ZBbEQ//Z",
  },
  {
    src: "/videos/home/6fd8249497054ca4fe24aaf816e55282.mp4",
    poster: "/images/hero/6fd8249497054ca4fe24aaf816e55282.jpg",
    blurDataURL:
      "data:image/jpeg;base64,/9j//gAQTGF2YzYyLjI4LjEwMgD/2wBDAAgoKC8oLzc3Nzc3N0E8QUNDQ0FBQUFDQ0NISEhVVVVISEhDQ0hIUFBVVVxfXFdXVVdfX2RkZHh4c3OMjJGsrM//xABlAAEBAQEAAAAAAAAAAAAAAAAGBQMEAQEBAQAAAAAAAAAAAAAAAAAEAgMQAAECBAYCAwEAAAAAAAAAAAECAAMhMRITYQRx4UGSwRRSkRERAQEBAQEAAAAAAAAAAAAAAAARIQEx/8AAEQgADAAUAwEiAAIRAAMRAP/aAAwDAQACEQMRAD8AXRYYtSrur44KhiWz/sqhujTYemF1Aw7FpkQOsmXwjml0aJaoCVHDxjl+uMnUrUJpQdxy9/kH6Q/Hl61Ef//Z",
  },
];

const ROTATE_MS = 9000;

/** Cellular data-saver / slow-connection detection, where the browser exposes it. */
function connectionIsCheap(): boolean {
  const nav = navigator as Navigator & {
    connection?: { saveData?: boolean; effectiveType?: string };
  };
  const conn = nav.connection;
  if (!conn) return true;
  if (conn.saveData) return false;
  return !["slow-2g", "2g", "3g"].includes(conn.effectiveType ?? "");
}

export default function HeroBackdrop() {
  const prefersReducedMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);

  const [index, setIndex] = useState(0);
  const [playVideo, setPlayVideo] = useState(false);
  const [inView, setInView] = useState(true);

  // Decide once, on the client, whether this visitor should get video at all —
  // and only after the poster has had a chance to paint, so the first frame of
  // the page never competes with an 8 MB download.
  useEffect(() => {
    if (prefersReducedMotion) return;
    const id = window.setTimeout(() => setPlayVideo(connectionIsCheap()), 600);
    return () => window.clearTimeout(id);
  }, [prefersReducedMotion]);

  // Off-screen hero = no reason to keep pulling clips.
  useEffect(() => {
    const node = containerRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.15 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!playVideo || !inView) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % CLIPS.length), ROTATE_MS);
    return () => clearInterval(timer);
  }, [playVideo, inView]);

  const clip = CLIPS[index];

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden rounded-[32px] sm:rounded-[35px] z-0"
      aria-hidden="true"
    >
      {/* Poster layer — this is the LCP element. */}
      <AnimatePresence initial={false}>
        <motion.div
          key={`poster-${index}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 1.2, ease: "easeInOut" }}
          className="absolute inset-0"
        >
          <Image
            src={clip.poster}
            alt=""
            fill
            priority={index === 0}
            sizes="100vw"
            quality={75}
            placeholder="blur"
            blurDataURL={clip.blurDataURL}
            className="object-cover object-center"
          />
        </motion.div>
      </AnimatePresence>

      {/* Video layer — only the current clip is ever mounted. */}
      {playVideo && inView && (
        <AnimatePresence initial={false}>
          <motion.video
            key={`video-${index}`}
            src={clip.src}
            poster={clip.poster}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
        </AnimatePresence>
      )}

      {/* Readability scrim — slightly stronger at the bottom, where the bar sits. */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/35 to-black/55" />
    </div>
  );
}
