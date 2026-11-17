"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import { AlertTriangle, RefreshCw, ShieldAlert, CheckCircle2, ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

// Shared "frosted glass" look (same as the other pages)
const glass =
  "bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_32px_rgba(15,23,42,0.10)] ring-1 ring-inset ring-white/40";

// Glass form controls
// - text-base on mobile (16px) stops iOS Safari from zooming in when a field is focused
// - min-h-[44px] gives a comfortable touch target on phones
const glassField =
  "w-full min-w-0 min-h-[44px] px-3.5 py-2.5 rounded-2xl border border-white/70 bg-white/60 backdrop-blur-xl text-base sm:text-xs font-medium text-slate-800 placeholder:text-slate-400 shadow-sm " +
  "transition-all duration-300 ease-out hover:bg-white/85 hover:border-amber-300 " +
  "focus:outline-none focus:ring-2 focus:ring-amber-500/60 focus:bg-white/90";

type Option = { value: string; label: string };

// Custom glass dropdown: every option has a hover animation
function GlassSelect({
  id,
  value,
  options,
  onChange,
}: {
  id?: string;
  value: string;
  options: Option[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close when tapping/clicking outside or pressing Escape
  // (pointerdown covers mouse, touch and pen)
  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} className="relative w-full min-w-0">
      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`${glassField} cursor-pointer flex items-center justify-between gap-2 text-left sm:hover:-translate-y-0.5 sm:hover:shadow-[0_8px_24px_rgba(245,158,11,0.25)]`}
      >
        <span className="truncate">{selected?.label ?? value}</span>
        <ChevronDown
          size={16}
          className={`flex-shrink-0 text-amber-600 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <ul
          role="listbox"
          // max-h + overflow keeps long lists usable on short phone screens
          className="absolute left-0 right-0 z-50 mt-2 max-h-[min(16rem,50vh)] overflow-y-auto overscroll-contain origin-top rounded-2xl p-1.5 space-y-0.5 bg-white/90 backdrop-blur-2xl border border-white/70 ring-1 ring-inset ring-white/50 shadow-[0_16px_40px_rgba(15,23,42,0.18)] animate-in fade-in zoom-in-95 slide-in-from-top-1 duration-150"
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <li
                key={opt.value}
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`flex items-center justify-between gap-2 px-3 py-3 sm:py-2 min-h-[44px] sm:min-h-0 rounded-xl text-sm sm:text-xs cursor-pointer transition-all duration-200 ease-out active:bg-amber-500/20 sm:hover:bg-amber-500/15 sm:hover:text-amber-700 sm:hover:translate-x-1 ${
                  isSelected ? "bg-amber-500/10 font-semibold text-amber-700" : "text-slate-700"
                }`}
              >
                <span className="break-words min-w-0">{opt.label}</span>
                {isSelected && <Check size={14} className="flex-shrink-0 text-amber-600" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

const toOptions = (labels: string[]): Option[] => labels.map((l) => ({ value: l, label: l }));

const itemOptions = toOptions([
  "Glass Beaker (500ml)",
  "Volumetric Flask (1000ml)",
  "Glass Pipette (10ml)",
  "Digital pH Meter Probe",
  "Turbidimeter Cuvette",
  "Conical Flask (250ml)",
]);

const severityOptions: Option[] = [
  { value: "Minor", label: "Minor (Usable / Cracked)" },
  { value: "Moderate", label: "Moderate (Shattered / Broken)" },
  { value: "Critical", label: "Critical (High-value equipment failure)" },
];

export default function TechnicianBreakagePage() {
  const uid = useId();
  const ids = {
    item: `${uid}-item`,
    qty: `${uid}-qty`,
    severity: `${uid}-severity`,
    tech: `${uid}-tech`,
    reason: `${uid}-reason`,
  };

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Form states
  const [itemType, setItemType] = useState("Glass Beaker (500ml)");
  const [quantity, setQuantity] = useState("2");
  const [severity, setSeverity] = useState("Moderate");
  const [reason, setReason] = useState("Accidentally slipped and cracked during laboratory washing process.");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccess(false);

    setTimeout(() => {
      setSubmitting(false);
      setSuccess(true);
      // Reset after success
      setTimeout(() => setSuccess(false), 4000);
    }, 1200);
  };

  return (
    <div className="w-full min-w-0 space-y-4 sm:space-y-6 max-w-4xl mx-auto">
      {/* Page Header */}
      <div
        className={`${glass} p-4 sm:p-6 rounded-2xl sm:rounded-3xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4`}
      >
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl font-semibold tracking-tight text-slate-900 flex items-start sm:items-center gap-3 leading-snug">
            <span className="flex-shrink-0 p-2 rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-500/30 ring-1 ring-inset ring-white/40">
              <AlertTriangle className="w-5 h-5 sm:w-[22px] sm:h-[22px]" />
            </span>
            <span className="min-w-0 break-words">Report Glassware / Equipment Breakage</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-2 sm:mt-2 leading-relaxed">
            Log damaged or broken laboratory equipment instantly to alert the Inventory Manager and sync breakage logs.
          </p>
        </div>
      </div>

      {success && (
        <div
          role="status"
          className="bg-emerald-400/20 backdrop-blur-2xl border border-emerald-400/40 ring-1 ring-inset ring-white/30 text-emerald-900 p-3.5 sm:p-4 rounded-2xl text-xs font-semibold flex items-start sm:items-center gap-2 shadow-sm animate-in fade-in slide-in-from-top-1 duration-200"
        >
          <CheckCircle2 size={18} className="flex-shrink-0 text-emerald-600" />
          <span className="min-w-0 break-words">
            Breakage incident successfully reported! The Inventory Manager has been notified.
          </span>
        </div>
      )}

      {/* Breakage Form */}
      <form
        onSubmit={handleSubmit}
        className={`${glass} p-4 sm:p-8 rounded-2xl sm:rounded-3xl space-y-4 sm:space-y-6`}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <div className="space-y-1.5 min-w-0">
            <label htmlFor={ids.item} className="block text-xs font-bold text-slate-700">
              Damaged Item / Glassware
            </label>
            <GlassSelect id={ids.item} value={itemType} onChange={setItemType} options={itemOptions} />
          </div>

          <div className="space-y-1.5 min-w-0">
            <label htmlFor={ids.qty} className="block text-xs font-bold text-slate-700">
              Quantity Damaged
            </label>
            <input
              id={ids.qty}
              type="number"
              inputMode="numeric"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className={`${glassField} font-semibold`}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <div className="space-y-1.5 min-w-0">
            <label htmlFor={ids.severity} className="block text-xs font-bold text-slate-700">
              Severity Level
            </label>
            <GlassSelect id={ids.severity} value={severity} onChange={setSeverity} options={severityOptions} />
          </div>

          <div className="space-y-1.5 min-w-0">
            <label htmlFor={ids.tech} className="block text-xs font-bold text-slate-700">
              Reporting Technician
            </label>
            <input
              id={ids.tech}
              type="text"
              disabled
              value="Chaminda Perera (Lab Technician)"
              className="w-full min-w-0 min-h-[44px] px-3.5 py-2.5 rounded-2xl border border-white/50 bg-white/30 backdrop-blur-xl text-base sm:text-xs text-slate-500 font-medium truncate"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor={ids.reason} className="block text-xs font-bold text-slate-700">
            Incident Details / Reason
          </label>
          <textarea
            id={ids.reason}
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className={`${glassField} resize-y leading-relaxed`}
            required
          />
        </div>

        {/* Submit Button: full width on phones, auto width from sm up */}
        <div className="pt-2 sm:pt-4 flex justify-end">
          <Button
            type="submit"
            disabled={submitting}
            className="w-full sm:w-auto min-h-[48px] sm:min-h-0 justify-center bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-sm font-semibold px-6 py-3 sm:py-2.5 rounded-full shadow-lg shadow-amber-500/30 ring-1 ring-inset ring-white/30 flex items-center gap-2 cursor-pointer transition-all sm:hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] disabled:opacity-70"
          >
            {submitting ? (
              <>
                <RefreshCw className="animate-spin flex-shrink-0" size={16} />
                <span className="sm:hidden">Submitting...</span>
                <span className="hidden sm:inline">Submitting to Inventory Manager...</span>
              </>
            ) : (
              <>
                <ShieldAlert className="flex-shrink-0" size={16} /> Submit Breakage Report
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}