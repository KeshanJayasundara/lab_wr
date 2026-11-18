"use client";

import React, { useEffect, useRef, useState } from "react";
import { FileSpreadsheet, Download, Filter, Calendar, CheckCircle2, AlertTriangle, XCircle, Search, X, ChevronDown, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// Shared "frosted glass" look (same as the dashboard, layout and verify page)
const glass =
  "bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_32px_rgba(15,23,42,0.10)] ring-1 ring-inset ring-white/40";

// Glass form controls (16px text on phones so iOS doesn't zoom in on focus)
const glassField =
  "w-full px-3.5 py-2.5 min-h-[44px] sm:min-h-0 rounded-2xl border border-white/70 bg-white/60 backdrop-blur-xl text-base sm:text-xs text-slate-800 shadow-sm cursor-pointer " +
  // smooth hover animation: lifts slightly, border + glow turn blue, background brightens
  "transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-white/85 hover:border-blue-300 hover:shadow-[0_8px_24px_rgba(59,130,246,0.25)] " +
  "focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:bg-white/90 focus:translate-y-0";

const btnGlass =
  "text-slate-700 border-white/70 bg-white/60 hover:bg-white/90 backdrop-blur-xl rounded-full cursor-pointer shadow-sm transition-all hover:-translate-y-0.5";

const badgeBase = "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold backdrop-blur-xl border";
const statusStyles: Record<string, { cls: string; Icon: typeof CheckCircle2 }> = {
  Normal: { cls: "bg-emerald-400/20 text-emerald-700 border-emerald-400/40", Icon: CheckCircle2 },
  Warning: { cls: "bg-amber-400/20 text-amber-700 border-amber-400/40", Icon: AlertTriangle },
  Critical: { cls: "bg-red-400/20 text-red-700 border-red-400/40", Icon: XCircle },
};
function StatusBadge({ status }: { status: string }) {
  const s = statusStyles[status] || statusStyles.Normal;
  return (
    <span className={`${badgeBase} ${s.cls}`}>
      <s.Icon size={13} /> {status}
    </span>
  );
}

type Category = { id: string; name: string };
type PreviewRow = {
  category: string; unit: string; parameter: string; measureUnit: string; standard: string;
  tests: number; avg: number; min: number; max: number; status: string;
};
type Preview = { rows: PreviewRow[]; totals: { records: number; daysTested: number; categories: number; units: number } };

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
// last 12 months (current month first) -> { label, value: "YYYY-MM" }
function buildMonthOptions() {
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    return { value, label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}${i === 0 ? " (Current)" : ""}` };
  });
}
const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2));

// Custom glass dropdown: the option list is our own, so every option can have a hover animation
function GlassSelect({
  value,
  options,
  onChange,
  placeholder = "Select an option",
  hasError = false,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
  placeholder?: string;
  hasError?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const ref = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Close when clicking/tapping outside or pressing Escape
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  // Reset the search each time the list opens and focus the search box
  useEffect(() => {
    if (open) {
      setQuery("");
      const t = setTimeout(() => searchRef.current?.focus(), 40);
      return () => clearTimeout(t);
    }
  }, [open]);

  const q = query.trim().toLowerCase();
  const filtered = q ? options.filter((o) => o.toLowerCase().includes(q)) : options;

  // Keep the whole list visible when it opens near the bottom of the screen
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(
      () => listRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }),
      30
    );
    return () => clearTimeout(t);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`${glassField} flex items-center justify-between gap-2 text-left ${hasError ? "!border-red-400" : ""}`}
      >
        <span className={`truncate ${value ? "" : "text-slate-400"}`}>{value || placeholder}</span>
        <ChevronDown
          size={16}
          className={`flex-shrink-0 text-blue-600 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <ul
          ref={listRef}
          role="listbox"
          className="absolute z-50 mt-2 w-full max-h-72 overflow-y-auto origin-top rounded-2xl p-1.5 space-y-0.5 bg-white/75 backdrop-blur-2xl border border-white/70 ring-1 ring-inset ring-white/50 shadow-[0_16px_40px_rgba(15,23,42,0.18)] animate-in fade-in zoom-in-95 slide-in-from-top-1 duration-150"
        >
          <li className="sticky top-0 z-10 -mx-1.5 -mt-1.5 mb-1 px-1.5 pt-1.5 pb-1.5 bg-white/90 backdrop-blur-2xl rounded-t-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && filtered.length > 0) {
                    e.preventDefault();
                    onChange(filtered[0]);
                    setOpen(false);
                  }
                }}
                placeholder="Search..."
                className="w-full pl-8 pr-8 py-2 rounded-xl border border-white/80 bg-white/80 text-base sm:text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/60"
              />
              {query && (
                <button type="button" aria-label="Clear search" onClick={() => { setQuery(""); searchRef.current?.focus(); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer">
                  <X size={13} />
                </button>
              )}
            </div>
          </li>
          {filtered.length === 0 && (
            <li className="px-3 py-3 text-xs text-slate-500 text-center">No results found</li>
          )}
          {filtered.map((opt) => {
            const isSelected = !!value && opt === value;
            return (
              <li
                key={opt}
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
                className={`flex items-center justify-between gap-2 px-3 py-3 sm:py-2 rounded-xl text-sm sm:text-xs cursor-pointer transition-all duration-200 ease-out hover:bg-blue-500/15 hover:text-blue-700 hover:translate-x-1 ${
                  isSelected ? "bg-blue-500/10 font-semibold text-blue-700" : "text-slate-700"
                }`}
              >
                <span className="min-w-0 break-words">{opt}</span>
                {isSelected && <Check size={14} className="flex-shrink-0 text-blue-600" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function AdminReportsPage() {
  // built after mount (new Date() is not allowed during prerender with cacheComponents)
  const [monthOptions, setMonthOptions] = useState<{ value: string; label: string }[]>([]);
  useEffect(() => { setMonthOptions(buildMonthOptions()); }, []);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [showErrors, setShowErrors] = useState(false);
  const [isPreviewActive, setIsPreviewActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);

  // the filters that were actually used for the preview (so Export always matches what is on screen)
  const [applied, setApplied] = useState<{ month: string; monthLabel: string; categoryId: string; categoryLabel: string } | null>(null);

  useEffect(() => {
    fetch("/api/manager/categories")
      .then((r) => r.json())
      .then((j) => j.success && setCategories(j.data.map((c: any) => ({ id: c.id, name: c.name }))))
      .catch(() => setError("Could not load test categories."));
  }, []);

  const ALL = "All Categories";
  const monthValue = monthOptions.find((m) => m.label === selectedMonth)?.value || "";
  const categoryId = selectedCategory === ALL ? "all" : categories.find((c) => c.name === selectedCategory)?.id || "";

  const handleGeneratePreview = async () => {
    if (!selectedMonth || !selectedCategory) {
      setShowErrors(true);
      return;
    }
    setShowErrors(false);
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/manager/reports/preview?month=${monthValue}&categoryId=${encodeURIComponent(categoryId)}`);
      const j = await res.json();
      if (!j.success) throw new Error(j.error || "Failed to load report");
      setPreview(j.data);
      setApplied({ month: monthValue, monthLabel: selectedMonth, categoryId, categoryLabel: selectedCategory });
      setIsPreviewActive(true);
    } catch (e: any) {
      setError(e.message || "Failed to load report");
      setIsPreviewActive(false);
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = async () => {
    if (!applied) return;
    setExporting(true);
    setError("");
    try {
      const res = await fetch(`/api/manager/reports/export?month=${applied.month}&categoryId=${encodeURIComponent(applied.categoryId)}`);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Export failed");
      }
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition") || "";
      const name = cd.match(/filename="([^"]+)"/)?.[1] || `Daily_testing_records_${applied.month}.xlsx`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e.message || "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const rows = preview?.rows || [];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Page Header */}
      <div className={`${glass} p-4 sm:p-6 rounded-3xl`}>
        <h1 className="text-lg sm:text-2xl font-semibold tracking-tight text-slate-900 flex items-start sm:items-center gap-3 leading-tight">
          <span className="p-2 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow-lg shadow-blue-500/30 ring-1 ring-inset ring-white/40 shrink-0">
            <FileSpreadsheet size={22} />
          </span>
          <span className="mt-1 sm:mt-0">Plant Reports & Export Hub</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 mt-2">
          Select a month and a testing category, preview the recorded data, then export it in the official Daily Wastewater Quality Excel format.
        </p>
      </div>

      {/* Filter Toolbar */}
      <div className={`${glass} relative z-20 p-4 sm:p-5 rounded-3xl space-y-4`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Calendar size={14} className="text-blue-600" /> Select Month
            </label>
            <GlassSelect
              value={selectedMonth}
              placeholder="Select month"
              hasError={showErrors && !selectedMonth}
              onChange={(v) => { setSelectedMonth(v); setIsPreviewActive(false); }}
              options={monthOptions.map((m) => m.label)}
            />
            {showErrors && !selectedMonth && <p className="text-[11px] text-red-600">Select a month.</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Filter size={14} className="text-blue-600" /> Test Category
            </label>
            <GlassSelect
              value={selectedCategory}
              placeholder="Select test category"
              hasError={showErrors && !selectedCategory}
              onChange={(v) => { setSelectedCategory(v); setIsPreviewActive(false); }}
              options={[ALL, ...categories.map((c) => c.name)]}
            />
            {showErrors && !selectedCategory && <p className="text-[11px] text-red-600">Select a test category.</p>}
          </div>
        </div>

        {error && <p className="text-xs text-red-600 font-medium">{error}</p>}

        <div className="flex justify-stretch sm:justify-end pt-3 border-t border-white/50">
          <Button
            onClick={handleGeneratePreview}
            disabled={loading}
            className="w-full sm:w-auto justify-center bg-slate-900/90 hover:bg-slate-900 text-white font-semibold text-sm sm:text-xs px-5 py-3 sm:py-2.5 rounded-full shadow-lg shadow-slate-900/20 ring-1 ring-inset ring-white/10 flex items-center gap-2 cursor-pointer transition-all hover:-translate-y-0.5 active:translate-y-0"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
            {loading ? "Loading..." : "Generate Filter Preview"}
          </Button>
        </div>
      </div>

      {isPreviewActive && applied && preview ? (
        <div className={`${glass} p-4 sm:p-8 rounded-3xl space-y-4 sm:space-y-6 animate-in fade-in duration-300`}>
          <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center pb-4 sm:pb-6 border-b border-white/50 gap-4">
            <div className="min-w-0">
              <span className="inline-block max-w-full text-[10px] font-bold leading-snug px-2.5 py-1 rounded-2xl sm:rounded-full bg-blue-500/15 text-blue-700 border border-blue-400/40 backdrop-blur-xl break-words">
                Active Filter: {applied.categoryLabel}
              </span>
              <h2 className="text-base sm:text-lg font-semibold tracking-tight text-slate-900 mt-2 leading-snug">
                National Water Supply & Drainage Board - Kurunegala Plant
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Report Period: <strong className="text-slate-800">{applied.monthLabel}</strong>
                {" · "}{preview.totals.records} test records · {preview.totals.daysTested} days tested
              </p>
            </div>

            <div className="shrink-0">
              <Button
                onClick={handleExportExcel}
                disabled={exporting || rows.length === 0}
                className="w-full sm:w-auto h-11 sm:h-9 justify-center bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold text-xs sm:text-sm px-4 py-2 rounded-full shadow-lg shadow-blue-500/30 ring-1 ring-inset ring-white/30 flex items-center gap-2 cursor-pointer transition-all hover:-translate-y-0.5 active:translate-y-0"
              >
                {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                {exporting ? "Generating..." : applied.categoryId === "all" ? "Export Excel (ZIP)" : "Export Excel"}
              </Button>
            </div>
          </div>

          {rows.length === 0 ? (
            <p className="text-center text-sm text-slate-600 py-8">
              No test records found for {applied.categoryLabel} in {applied.monthLabel}.
            </p>
          ) : (
            <>
              {/* Table (tablet / desktop) */}
              <div className="hidden md:block overflow-x-auto rounded-2xl border border-white/60 bg-white/30 backdrop-blur-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white/40 border-b border-white/60 text-slate-600 text-[11px] font-bold uppercase tracking-wider">
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Tank / Unit</th>
                      <th className="py-3 px-4">Parameter</th>
                      <th className="py-3 px-4">Standard</th>
                      <th className="py-3 px-4 text-right">Tests</th>
                      <th className="py-3 px-4 text-right">Avg</th>
                      <th className="py-3 px-4 text-right">Min</th>
                      <th className="py-3 px-4 text-right">Max</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/50 text-xs text-slate-700">
                    {rows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-white/55 transition-all duration-200">
                        <td className="py-3 px-4">{row.category}</td>
                        <td className="py-3 px-4">{row.unit}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {row.parameter} {row.measureUnit && <span className="font-normal text-slate-500">({row.measureUnit})</span>}
                        </td>
                        <td className="py-3 px-4 text-slate-600">{row.standard}</td>
                        <td className="py-3 px-4 text-right">{row.tests}</td>
                        <td className="py-3 px-4 text-right font-semibold text-slate-800">{fmt(row.avg)}</td>
                        <td className="py-3 px-4 text-right">{fmt(row.min)}</td>
                        <td className="py-3 px-4 text-right">{fmt(row.max)}</td>
                        <td className="py-3 px-4"><StatusBadge status={row.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Cards (mobile) */}
              <div className="md:hidden space-y-3">
                {rows.map((row, idx) => (
                  <div key={idx} className="bg-white/50 backdrop-blur-xl border border-white/70 rounded-2xl p-3.5 space-y-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-slate-900 break-words">{row.parameter}</h3>
                        <p className="text-[11px] text-slate-500">{row.category} · {row.unit}</p>
                      </div>
                      <span className="shrink-0"><StatusBadge status={row.status} /></span>
                    </div>
                    <dl className="grid grid-cols-2 gap-3 text-xs">
                      <div className="min-w-0">
                        <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Standard</dt>
                        <dd className="mt-0.5 text-slate-600 break-words">{row.standard}</dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Avg ({row.tests} tests)</dt>
                        <dd className="mt-0.5 font-semibold text-slate-800">{fmt(row.avg)} {row.measureUnit}</dd>
                      </div>
                      <div>
                        <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Min</dt>
                        <dd className="mt-0.5 text-slate-700">{fmt(row.min)}</dd>
                      </div>
                      <div>
                        <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Max</dt>
                        <dd className="mt-0.5 text-slate-700">{fmt(row.max)}</dd>
                      </div>
                    </dl>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="bg-white/30 backdrop-blur-2xl p-6 sm:p-12 rounded-3xl border border-dashed border-white/80 ring-1 ring-inset ring-white/30 text-center space-y-3">
          <div className="w-12 h-12 bg-gradient-to-br from-sky-400 to-blue-600 text-white rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-blue-500/30 ring-1 ring-inset ring-white/40">
            <Filter size={22} />
          </div>
          <h3 className="text-sm font-bold text-slate-800">No Preview Generated Yet</h3>
          <p className="text-xs text-slate-600 max-w-sm mx-auto">
            Choose a Month and a Test Category above, then click <strong className="text-slate-700">&quot;Generate Filter Preview&quot;</strong> to view and export the report.
          </p>
        </div>
      )}
    </div>
  );
}