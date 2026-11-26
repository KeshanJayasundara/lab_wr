"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Check, Search } from "lucide-react";

// ---- Copied 1:1 from the manager "Analytics & Trends" GlassSelect (same classes, same look) ----
const glassFieldBase =
  "rounded-2xl border border-white/70 bg-white/60 backdrop-blur-xl font-medium text-slate-800 placeholder:text-slate-400 shadow-sm " +
  "transition-all duration-300 ease-out hover:bg-white/85 hover:border-blue-300 " +
  "focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:bg-white/90";

export type Option = { value: string; label: string; disabled?: boolean };

// "NW CAB-1234" and "nwcab1234" should find each other
const normalize = (v: string) => v.toLowerCase().replace(/[^a-z0-9]/g, "");

export default function GlassSearchSelect({
  value,
  options,
  onChange,
  size = "md",
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  emptyText = "No matches found",
  disabled = false,
}: {
  value: string;
  options: Option[];
  onChange: (v: string) => void;
  size?: "md" | "sm";
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(-1); // row highlighted with the arrow keys (-1 = none)
  const ref = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const filtered = useMemo(() => {
    const q = normalize(query);
    return q ? options.filter((o) => normalize(o.label).includes(q)) : options;
  }, [options, query]);

  const close = () => {
    setOpen(false);
    setQuery("");
    setActive(-1);
  };

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  // When it opens: focus the search box and keep the whole list visible near the bottom of the screen
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      searchRef.current?.focus({ preventScroll: true });
      panelRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }, 30);
    return () => clearTimeout(t);
  }, [open]);

  // Searching restarts the keyboard highlight
  useEffect(() => {
    setActive(-1);
  }, [query]);

  // Keep the keyboard-highlighted row in view
  useEffect(() => {
    if (!open || active < 0) return;
    (listRef.current?.children[active] as HTMLElement | undefined)?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const choose = (opt: Option) => {
    if (opt.disabled) return;
    onChange(opt.value);
    close();
  };

  const onSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, Math.max(filtered.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const pick = filtered[active >= 0 ? active : 0];
      if (pick) choose(pick);
    }
  };

  const selected = options.find((o) => o.value === value);
  // 16px text + 44px height on phones (no iOS zoom, easy to tap), compact from sm up
  const sizeClass =
    size === "sm"
      ? "px-3 py-2 sm:py-1.5 min-h-[44px] sm:min-h-0 text-base sm:text-xs"
      : "px-3.5 py-2.5 min-h-[44px] sm:min-h-0 text-base sm:text-sm";

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => !disabled && (open ? close() : setOpen(true))}
        className={`${glassFieldBase} ${sizeClass} w-full ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"} flex items-center justify-between gap-2 text-left hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(59,130,246,0.25)]`}
      >
        <span className={`truncate ${selected ? "" : "text-slate-400"}`}>{selected?.label ?? placeholder}</span>
        <ChevronDown
          size={size === "sm" ? 14 : 16}
          className={`flex-shrink-0 text-blue-600 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && !disabled && (
        // Same glass panel classes as the Analytics list
        <div
          ref={panelRef}
          className="absolute z-50 mt-2 min-w-full w-max max-w-[calc(100vw-3rem)] origin-top rounded-2xl p-1.5 bg-white/85 backdrop-blur-2xl border border-white/70 ring-1 ring-inset ring-white/50 shadow-[0_16px_40px_rgba(15,23,42,0.18)] animate-in fade-in zoom-in-95 slide-in-from-top-1 duration-150"
        >
          {/* Search box (stays at the top while the list scrolls) */}
          <div className="relative mb-1.5">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-600/70 pointer-events-none" />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onSearchKeyDown}
              placeholder={searchPlaceholder}
              autoComplete="off"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              aria-label="Search"
              className={`${glassFieldBase} w-full !rounded-xl pl-8 pr-3 py-2 min-h-[44px] sm:min-h-0 text-base sm:text-xs`}
            />
          </div>

          {/* px-1 + overflow-x-hidden: the "slide right on hover" never gets clipped or makes a sideways scrollbar */}
          <ul
            ref={listRef}
            role="listbox"
            className="max-h-60 overflow-y-auto overflow-x-hidden px-1 py-0.5 space-y-0.5"
          >
            {filtered.length === 0 ? (
              <li className="px-3 py-4 text-center text-xs text-slate-500">{emptyText}</li>
            ) : (
              filtered.map((opt, i) => {
                const isSelected = opt.value === value;
                return (
                  <li
                    key={opt.value}
                    role="option"
                    aria-selected={isSelected}
                    aria-disabled={opt.disabled}
                    onClick={() => choose(opt)}
                    className={`flex items-center justify-between gap-3 px-3 py-3 sm:py-2 rounded-xl text-sm sm:text-xs transition-all duration-200 ease-out ${
                      opt.disabled
                        ? "cursor-not-allowed opacity-40"
                        : "cursor-pointer hover:bg-blue-500/15 hover:text-blue-700 hover:translate-x-1"
                    } ${
                      isSelected
                        ? "bg-blue-500/10 font-semibold text-blue-700"
                        : i === active
                        ? "bg-blue-500/15 text-blue-700 translate-x-1"
                        : "text-slate-700"
                    }`}
                  >
                    <span className="min-w-0 break-words">{opt.label}</span>
                    {isSelected && <Check size={14} className="flex-shrink-0 text-blue-600" />}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}