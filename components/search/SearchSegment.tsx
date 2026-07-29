"use client";

import { motion } from "framer-motion";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  type KeyboardEvent,
  type ReactNode,
} from "react";

// ─────────────────────────────────────────────────────────────────────────────
// One field of the hero search bar.
//
// The previous implementation was four ~80-line copies of a `div` with an
// onClick — unreachable by keyboard and invisible to screen readers. This is
// the single shared primitive: a real <button> with the WAI-ARIA disclosure
// contract, Escape-to-close, and focus returned to the trigger on close.
// ─────────────────────────────────────────────────────────────────────────────

const PANEL_ALIGN = {
  start: "left-0",
  center: "left-1/2 -translate-x-1/2",
  end: "right-0",
} as const;

export interface SearchSegmentProps {
  label: string;
  /** Selected value, rendered in place of the placeholder. */
  value: string | null;
  placeholder: string;
  icon?: ReactNode;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  /** Which segment the pointer is over — drives the shared sliding pill. */
  isHighlighted: boolean;
  onPointerHighlight: () => void;
  align?: keyof typeof PANEL_ALIGN;
  panelClassName?: string;
  /** Receives a `close` callback so options can dismiss the panel on select. */
  children: (close: () => void) => ReactNode;
}

export default function SearchSegment({
  label,
  value,
  placeholder,
  icon,
  isOpen,
  onOpenChange,
  isHighlighted,
  onPointerHighlight,
  align = "start",
  panelClassName = "min-w-[260px]",
  children,
}: SearchSegmentProps) {
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => onOpenChange(false), [onOpenChange]);

  // Selecting an option unmounts the element that had focus, dropping focus to
  // <body>. Hand it back to the trigger so keyboard users keep their place. If
  // focus landed somewhere real — the user tabbed away, or the selection
  // navigated — leave it alone.
  //
  // The panel deliberately has no exit animation (see below); it unmounts
  // synchronously, so by the time this runs `activeElement` is already <body>.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (isOpen) {
      wasOpen.current = true;
      return;
    }
    if (!wasOpen.current) return;
    wasOpen.current = false;
    if (document.activeElement && document.activeElement !== document.body) return;
    triggerRef.current?.focus();
  }, [isOpen]);

  // Escape closes from anywhere inside the segment and hands focus back.
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape" && isOpen) {
      event.stopPropagation();
      close();
    }
  };

  // Moving focus out of the segment entirely (Tab away) closes the panel
  // without stealing focus back.
  useEffect(() => {
    if (!isOpen) return;
    const onFocusIn = (event: FocusEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      onOpenChange(false);
    };
    document.addEventListener("focusin", onFocusIn);
    return () => document.removeEventListener("focusin", onFocusIn);
  }, [isOpen, onOpenChange]);

  return (
    <div
      className={`relative flex-1 w-full md:w-auto min-w-0 ${isOpen ? "z-50" : "z-10"}`}
      onKeyDown={handleKeyDown}
      onMouseEnter={onPointerHighlight}
    >
      {isHighlighted && (
        <motion.div
          layoutId="hero-search-pill"
          aria-hidden="true"
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background:
              "linear-gradient(135deg, rgba(238,116,41,0.10) 0%, rgba(238,116,41,0.03) 100%)",
            border: "1px solid rgba(238,116,41,0.12)",
            boxShadow: "inset 0 1px 1px var(--sw-chip-bg), 0 2px 10px rgba(238,116,41,0.05)",
          }}
          transition={{ type: "spring", stiffness: 120, damping: 20, mass: 1.1 }}
        />
      )}

      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={`${label}: ${value ?? placeholder}`}
        aria-controls={isOpen ? panelId : undefined}
        onClick={() => onOpenChange(!isOpen)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" && !isOpen) {
            event.preventDefault();
            onOpenChange(true);
          }
        }}
        className="relative z-10 w-full text-left px-5 py-2.5 rounded-full cursor-pointer flex flex-col justify-center group focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sw-primary)] focus-visible:ring-offset-1"
      >
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500 group-hover:text-[var(--sw-primary)] mb-0.5">
          {label}
        </span>
        <span className="flex items-center gap-1.5 text-[15px] font-semibold leading-tight min-w-0">
          {icon}
          <span className={`truncate ${value ? "text-gray-900" : "text-gray-500"}`}>
            {value || placeholder}
          </span>
        </span>
      </button>

      {/*
        Entry animation only, and no AnimatePresence. An exit animation keeps
        the panel mounted while it fades, and Framer does not always complete
        it — leaving an invisible panel with focusable options stranded in the
        tab order. Unmounting synchronously is worth more than a 180ms fade.
      */}
      {isOpen && (
        <motion.div
          ref={panelRef}
          id={panelId}
          role="dialog"
          aria-label={label}
          initial={{ opacity: 0, y: 8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className={`absolute top-full mt-2.5 rounded-[26px] p-2 z-50 flex flex-col ${PANEL_ALIGN[align]} ${panelClassName}`}
          style={{
            background: "var(--sw-nav-solid)",
            border: "1px solid rgba(238,116,41,0.2)",
            boxShadow: "0 20px 50px rgba(0, 0, 0, 0.22), 0 8px 20px rgba(238,116,41,0.10)",
          }}
        >
          {children(close)}
        </motion.div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// A keyboard-navigable option list. Options are real focusable buttons, so
// arrow keys move DOM focus — no aria-activedescendant bookkeeping needed and
// it degrades correctly if JS for the arrow handler ever fails.
// ─────────────────────────────────────────────────────────────────────────────

export interface OptionListProps {
  label: string;
  children: ReactNode;
  className?: string;
}

export function OptionList({ label, children, className = "" }: OptionListProps) {
  const ref = useRef<HTMLDivElement>(null);

  const move = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp" && event.key !== "Home" && event.key !== "End") {
      return;
    }
    const options = Array.from(
      ref.current?.querySelectorAll<HTMLButtonElement>('[role="option"]:not([disabled])') ?? [],
    );
    if (options.length === 0) return;
    event.preventDefault();

    const current = options.indexOf(document.activeElement as HTMLButtonElement);
    let next: number;
    if (event.key === "Home") next = 0;
    else if (event.key === "End") next = options.length - 1;
    else if (event.key === "ArrowDown") next = current < 0 ? 0 : (current + 1) % options.length;
    else next = current <= 0 ? options.length - 1 : current - 1;

    options[next]?.focus();
  };

  return (
    <div
      ref={ref}
      role="listbox"
      aria-label={label}
      onKeyDown={move}
      className={`flex flex-col gap-0.5 max-h-[240px] overflow-y-auto custom-scrollbar pr-1 ${className}`}
    >
      {children}
    </div>
  );
}

export interface OptionProps {
  selected: boolean;
  onSelect: () => void;
  children: ReactNode;
  /** Secondary text shown right-aligned (e.g. a listing count). */
  hint?: ReactNode;
  icon?: ReactNode;
}

export function Option({ selected, onSelect, children, hint, icon }: OptionProps) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={onSelect}
      className="relative flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold w-full text-left rounded-full transition-colors hover:bg-[rgba(238,116,41,0.08)] focus:outline-none focus-visible:bg-[rgba(238,116,41,0.12)] focus-visible:ring-1 focus-visible:ring-[var(--sw-primary)]"
      style={{
        color: selected ? "var(--sw-primary)" : "var(--sw-navy)",
        fontFamily: "var(--font-heading)",
        background: selected ? "rgba(238,116,41,0.08)" : undefined,
      }}
    >
      {icon && <span className="shrink-0 opacity-70">{icon}</span>}
      <span className="flex-1 truncate">{children}</span>
      {hint != null && (
        <span className="shrink-0 text-[11px] font-medium text-gray-400">{hint}</span>
      )}
    </button>
  );
}
