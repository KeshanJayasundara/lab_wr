"use client";

import React, { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";

// Same frosted-glass dropdown (with search) that the Manager pages use.
const glassField =
  "w-full px-3.5 py-2.5 min-h-[48px] sm:min-h-[44px] rounded-2xl border border-white/70 bg-white/60 backdrop-blur-xl text-sm font-medium text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/60";

export type GlassOption = { id: string; label: string; subLabel?: string };

type Props = {
  options: GlassOption[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  icon?: React.ElementType;
  disabled?: boolean;
};

export default function GlassSelect({
  options,
  value,
  onChange,
  placeholder = "-- Select --",
  searchPlaceholder = "Search...",
  icon: Icon,
  disabled = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.id === value);
  const q = search.trim().toLowerCase();
  const filtered = q
    ? options.filter((o) => o.label.toLowerCase().includes(q) || (o.subLabel && o.subLabel.toLowerCase().includes(q)))
    : options;

  const close = () => {
    setOpen(false);
    setSearch("");
  };
  const pick = (id: string) => {
    onChange(id);
    close();
  };

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => (open ? close() : setOpen(true))}
        className={`${glassField} flex items-center justify-between gap-2 text-left ${
          disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
        }`}
      >
        <span className="flex items-center gap-2 truncate">
          {Icon && <Icon size={16} className="text-slate-500 flex-shrink-0" />}
          <span className={`truncate ${selected ? "text-slate-800 font-semibold" : "text-slate-400 font-normal"}`}>
            {selected ? selected.label : placeholder}
          </span>
        </span>
        <ChevronDown
          size={16}
          className={`flex-shrink-0 text-slate-500 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && !disabled && (
        <div className="absolute z-50 mt-2 w-full rounded-2xl bg-white/95 backdrop-blur-2xl border border-white/80 shadow-2xl p-2.5 space-y-2 animate-in fade-in zoom-in-95 duration-150">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-3.5 sm:top-3 text-slate-400" />
            <input
              type="text"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") close();
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (filtered[0]) pick(filtered[0].id);
                }
              }}
              placeholder={searchPlaceholder}
              className="w-full pl-8 pr-3 py-2.5 sm:py-2 rounded-xl border border-slate-200 bg-slate-50/80 text-base sm:text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
            />
          </div>

          <div role="listbox" className="max-h-56 sm:max-h-48 overflow-y-auto overscroll-contain space-y-1 pr-1">
            {filtered.map((o) => (
              <div
                key={o.id}
                role="option"
                aria-selected={value === o.id}
                onClick={() => pick(o.id)}
                className={`px-3 py-3 sm:py-2 rounded-xl text-sm sm:text-xs font-medium flex items-center justify-between cursor-pointer transition-colors ${
                  value === o.id ? "bg-emerald-500 text-white font-semibold" : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                <div>
                  <p>{o.label}</p>
                  {o.subLabel && (
                    <p className={`text-[10px] ${value === o.id ? "text-emerald-100" : "text-slate-400"}`}>{o.subLabel}</p>
                  )}
                </div>
                {value === o.id && <Check size={14} />}
              </div>
            ))}
            {filtered.length === 0 && <div className="text-center py-4 text-xs text-slate-400">No results found</div>}
          </div>
        </div>
      )}
    </div>
  );
}