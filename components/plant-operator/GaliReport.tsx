"use client";

import React, { useEffect, useState } from "react";
import { FileDown, Loader2, AlertCircle, CalendarDays } from "lucide-react";

// Same "frosted glass" look as the Gali page
const glass =
  "bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_32px_rgba(15,23,42,0.10)] ring-1 ring-inset ring-white/40";

const inputClass =
  "w-full h-11 rounded-xl border border-white/70 bg-white/70 px-3 text-sm text-slate-800 " +
  "outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/40";

// Sri Lanka's current month as "YYYY-MM" (the lab works on Sri Lanka time)
function colomboMonthNow() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Colombo" }).slice(0, 7);
}

export default function GaliReport() {
  const [month, setMonth] = useState("");
  const [maxMonth, setMaxMonth] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  // Set after mount so the server and browser always render the same first screen
  useEffect(() => {
    const now = colomboMonthNow();
    setMonth(now);
    setMaxMonth(now);
  }, []);

  const download = async () => {
    if (!month || downloading) return;
    setDownloading(true);
    setError("");
    try {
      const res = await fetch(`/api/plant-operator/gali/report?month=${encodeURIComponent(month)}`, {
        cache: "no-store",
        credentials: "same-origin",
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error || `Server error (${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Gali-Report-${month}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || "Failed to download the report");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <section className={`${glass} rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4`}>
      <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
        <FileDown size={18} className="text-emerald-600" /> Gali Monthly Report (PDF)
      </h2>
      <p className="text-xs text-slate-600">Select a month and download all Gali checks of that month as a PDF.</p>

      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="sm:w-60">
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            <CalendarDays size={12} className="inline -mt-0.5 mr-1" />
            Select month
          </label>
          <input
            type="month"
            value={month}
            max={maxMonth || undefined}
            onChange={(e) => {
              setMonth(e.target.value);
              setError("");
            }}
            className={inputClass}
          />
        </div>
        <button
          type="button"
          onClick={download}
          disabled={!month || downloading}
          className="min-h-[44px] px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-semibold shadow-lg shadow-emerald-500/30 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 cursor-pointer inline-flex items-center justify-center gap-2"
        >
          {downloading ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
          Download PDF
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm border bg-red-500/10 text-red-700 border-red-400/40">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </section>
  );
}