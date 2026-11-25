"use client";

import { formatChem, formatUnit } from "@/lib/chemFormat";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { FileText, Search, CheckCircle2, Clock, XCircle, Filter, Edit3, Lock, X, AlertCircle, Loader2, ChevronDown, ShieldCheck, Layers, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const glass =
  "bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_32px_rgba(15,23,42,0.10)] ring-1 ring-inset ring-white/40";

const glassInput =
  "w-full px-3.5 py-3 sm:py-2.5 rounded-2xl border border-white/70 bg-white/60 hover:bg-white/80 backdrop-blur-xl text-base sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 shadow-sm " +
  "transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:bg-white/90";

const modalOverlay =
  "fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/30 backdrop-blur-sm animate-in fade-in duration-200";

const modalPanel =
  "w-full sm:max-w-md max-h-[92dvh] sm:max-h-[90vh] flex flex-col overflow-hidden overscroll-contain " +
  "rounded-t-3xl sm:rounded-3xl bg-white/75 backdrop-blur-2xl border border-white/70 ring-1 ring-inset ring-white/50 " +
  "shadow-[0_24px_60px_rgba(15,23,42,0.25)] animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200";

const PAGE_SIZE = 5;

const statusFilters = ["All", "Normal", "Warning", "Critical", "Verified", "Pending"];

function StatusBadge({ status }: { status: string }) {
  const color =
    status === "Critical"
      ? "bg-red-400/20 text-red-700 border-red-400/40"
      : status === "Warning"
      ? "bg-amber-400/20 text-amber-700 border-amber-400/40"
      : "bg-emerald-400/20 text-emerald-700 border-emerald-400/40";

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold backdrop-blur-xl border whitespace-nowrap ${color}`}>
      {status === "Critical" && <XCircle size={13} />}
      {status === "Warning" && <Clock size={13} />}
      {status === "Normal" && <CheckCircle2 size={13} />}
      {status}
    </span>
  );
}

function LiveCountdown({ createdAt, onExpire }: { createdAt: string; onExpire: () => void }) {
  const targetTime = new Date(createdAt).getTime() + 60 * 60 * 1000;
  const [timeLeft, setTimeLeft] = useState(() => targetTime - Date.now());

  const onExpireRef = useRef(onExpire);
  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    const initial = targetTime - Date.now();
    setTimeLeft(initial);
    if (initial <= 0) return;

    const timer = setInterval(() => {
      const remaining = targetTime - Date.now();
      if (remaining <= 0) {
        clearInterval(timer);
        setTimeLeft(0);
        onExpireRef.current();
      } else {
        setTimeLeft(remaining);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [targetTime]);

  if (timeLeft <= 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold backdrop-blur-xl bg-white/50 text-slate-600 border border-white/70 rounded-2xl">
        <Lock size={12} /> Locked (Audit Safe)
      </span>
    );
  }

  const totalSeconds = Math.floor(timeLeft / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold backdrop-blur-xl bg-emerald-400/20 text-emerald-700 border border-emerald-400/40 animate-pulse rounded-2xl">
      <Clock size={12} /> {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")} left to edit
    </span>
  );
}

type SampleSet = {
  key: string;
  sampleId: string;
  category: string;
  unit: string;
  createdAt: string;
  status: string;
  allVerified: boolean;
  records: any[];
};

const statusBorder = (status: string) =>
  status === "Critical" ? "border-l-red-400" : status === "Warning" ? "border-l-amber-400" : "border-l-emerald-400";

export default function TechnicianHistoryPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const listTopRef = useRef<HTMLDivElement>(null);

  const [editingRecord, setEditingRecord] = useState<any | null>(null);
  const [editValue, setEditValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const [, setTick] = useState(0);
  const handleExpire = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setEditingRecord(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const fetchRecords = async () => {
    try {
      const res = await fetch("/api/technician/tests");
      const data = await res.json();
      if (res.ok) setRecords(data.data || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleOpenEdit = (r: any) => {
    const diffMs = Date.now() - new Date(r.createdAt).getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    if (diffHours > 1) {
      setToast({ message: "The 1-hour grace window has expired. Record is locked.", type: "error" });
      return;
    }
    setEditingRecord(r);
    setEditValue(r.value.toString());
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord || editValue === "") {
      setToast({ message: "Please enter a valid test value", type: "error" });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/technician/tests", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingRecord.id,
          value: editValue,
        }),
      });

      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await res.text();
        throw new Error(text || `Server error (${res.status})`);
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update record");

      setToast({ message: "Test record updated & status auto-evaluated successfully!", type: "success" });
      setEditingRecord(null);
      fetchRecords();
    } catch (err: any) {
      setToast({ message: err.message || "Failed to update", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  // One "data set" = every parameter the technician submitted together for one Category + Tank/Unit (same Sample ID)
  const sets: SampleSet[] = React.useMemo(() => {
    const map = new Map<string, SampleSet>();
    for (const r of records) {
      const key = `${r.sampleId}::${r.typeId ?? ""}`;
      let g = map.get(key);
      if (!g) {
        g = {
          key,
          sampleId: r.sampleId,
          category: r.type?.category?.name || "Category",
          unit: r.type?.name || "Unit",
          createdAt: r.createdAt,
          status: "Normal",
          allVerified: true,
          records: [],
        };
        map.set(key, g);
      }
      g.records.push(r);
      if (new Date(r.createdAt) < new Date(g.createdAt)) g.createdAt = r.createdAt;
      if (!r.isVerified) g.allVerified = false;
    }
    const rank: Record<string, number> = { Normal: 0, Warning: 1, Critical: 2 };
    const list = [...map.values()];
    for (const g of list) {
      g.records.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      g.status = g.records.reduce((worst, r) => ((rank[r.status] ?? 0) > (rank[worst] ?? 0) ? r.status : worst), "Normal");
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [records]);

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggleExpanded = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const q = searchQuery.trim().toLowerCase();
  const filteredSets = sets.filter((g) => {
    const matchesFilter =
      filterStatus === "All" ||
      g.records.some((r) => r.status === filterStatus) ||
      (filterStatus === "Verified" && g.allVerified) ||
      (filterStatus === "Pending" && !g.allVerified);

    const matchesSearch =
      !q ||
      [
        g.sampleId,
        g.category,
        g.unit,
        g.status,
        new Date(g.createdAt).toLocaleString(), // as displayed on the card
        g.createdAt.slice(0, 10), // 2026-11-18
        new Date(g.createdAt).toLocaleDateString("en-GB"), // 18/11/2026
        new Date(g.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }), // November 18, 2026
        ...g.records.map((r) => r.parameter),
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);

    return matchesFilter && matchesSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filteredSets.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pagedSets = filteredSets.slice(pageStart, pageStart + PAGE_SIZE);

  const goToPage = (n: number) => {
    setPage(Math.min(Math.max(1, n), totalPages));
    listTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="w-full min-w-0 space-y-4 sm:space-y-6 relative">
      <div className={`${glass} p-4 sm:p-6 rounded-3xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4`}>
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl font-semibold tracking-tight text-slate-900 flex items-start sm:items-center gap-3 leading-tight">
            <span className="p-2 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow-lg shadow-blue-500/30 ring-1 ring-inset ring-white/40 shrink-0">
              <FileText size={22} />
            </span>
            <span className="mt-1 sm:mt-0">Test History & Live 1-Hour Countdown</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
            Each row is one data set (Category + Tank/Unit) with all the parameters you submitted together. Expand a set to review or edit values within the live 1-hour grace window.
          </p>
        </div>
      </div>

      <div ref={listTopRef} className={`${glass} p-3 sm:p-4 rounded-3xl flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3 sm:gap-4 scroll-mt-4`}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 min-w-0">
          <div className="flex items-center gap-2 shrink-0">
            <Filter size={16} className="text-blue-600 flex-shrink-0" />
            <span className="text-xs font-semibold text-slate-700">Filter:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {statusFilters.map((status) => (
              <button
                key={status}
                onClick={() => {
                  setFilterStatus(status);
                  setPage(1);
                }}
                className={`px-3.5 py-2 sm:py-1 min-h-[40px] sm:min-h-0 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer hover:-translate-y-0.5 ${
                  filterStatus === status
                    ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md shadow-blue-500/30 ring-1 ring-inset ring-white/30"
                    : "bg-white/60 text-slate-600 border border-white/70 backdrop-blur-xl hover:bg-white/90 hover:text-blue-700"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <div className="relative w-full lg:w-72 group">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-blue-600" />
          <input
            type="text"
            placeholder="Search Sample ID, Tank, Parameter, Date..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 min-h-[44px] sm:min-h-0 rounded-full border border-white/70 bg-white/60 hover:bg-white/80 backdrop-blur-xl text-base sm:text-xs text-slate-800 font-medium placeholder:text-slate-400 shadow-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:bg-white/90"
          />
        </div>
      </div>

      {loading ? (
        <div className={`${glass} flex justify-center py-20 rounded-3xl`}>
          <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:gap-4">
          {pagedSets.map((g) => {
            const isOpen = expanded.has(g.key);
            const counts = { Normal: 0, Warning: 0, Critical: 0 } as Record<string, number>;
            g.records.forEach((r) => { counts[r.status] = (counts[r.status] || 0) + 1; });

            return (
              <div key={g.key} className={`${glass} rounded-2xl sm:rounded-3xl border-l-4 min-w-0 overflow-hidden ${statusBorder(g.status)}`}>
                {/* Data-set header: one row for the whole Category / Unit submission */}
                <button
                  type="button"
                  onClick={() => toggleExpanded(g.key)}
                  aria-expanded={isOpen}
                  className="w-full text-left p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-6 cursor-pointer hover:bg-white/30 transition-colors"
                >
                  <div className="min-w-0 lg:flex-1">
                    <p className="text-sm font-bold font-mono text-slate-900 break-all">{g.sampleId}</p>
                    <span className="inline-block mt-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-white/60 backdrop-blur-xl border border-white/70 text-slate-700 break-words">
                      {g.category} • {g.unit}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-slate-600 lg:flex-1">
                    <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                      <Layers size={13} className="text-blue-600" /> {g.records.length} parameter{g.records.length === 1 ? "" : "s"}
                    </span>
                    {counts.Normal > 0 && <span className="text-emerald-700 font-semibold">{counts.Normal} Normal</span>}
                    {counts.Warning > 0 && <span className="text-amber-700 font-semibold">{counts.Warning} Warning</span>}
                    {counts.Critical > 0 && <span className="text-red-700 font-semibold">{counts.Critical} Critical</span>}
                    <span>{new Date(g.createdAt).toLocaleString()}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                    {g.allVerified && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 border border-emerald-500/30">
                        <ShieldCheck size={13} /> Verified
                      </span>
                    )}
                    <StatusBadge status={g.status} />
                    <LiveCountdown createdAt={g.createdAt} onExpire={handleExpire} />
                    <ChevronDown size={18} className={`text-blue-600 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
                  </div>
                </button>

                {/* Parameters of this data set */}
                {isOpen && (
                  <div className="border-t border-white/60 bg-white/20 divide-y divide-white/50 animate-in fade-in duration-200">
                    {g.records.map((r) => {
                      const editable = (Date.now() - new Date(r.createdAt).getTime()) / (1000 * 60 * 60) < 1;
                      return (
                        <div key={r.id} className="px-4 sm:px-5 py-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                          <div className="min-w-0 font-mono text-xs text-slate-800 break-words">
                            <strong>{formatChem(r.parameter)}:</strong> {r.value} {formatUnit(r.unit)}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <StatusBadge status={r.status} />
                            {editable && (
                              <Button
                                onClick={() => handleOpenEdit(r)}
                                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-full h-8 px-3.5 text-xs font-semibold cursor-pointer shadow-md shadow-amber-500/30 ring-1 ring-inset ring-white/30 inline-flex items-center gap-1 transition-all hover:-translate-y-0.5 active:translate-y-0"
                              >
                                <Edit3 size={13} /> Edit
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {filteredSets.length === 0 && (
            <div className={`${glass} py-12 px-4 rounded-2xl text-center text-slate-500 text-xs`}>
              No test records found matching your filters.
            </div>
          )}

          {/* Pagination */}
          {filteredSets.length > 0 && (
            <div className={`${glass} rounded-2xl px-4 sm:px-5 py-3 flex items-center justify-between gap-3`}>
              <span className="text-xs sm:text-sm text-slate-600">
                Showing {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, filteredSets.length)} of {filteredSets.length}
              </span>
              <div className="flex items-center gap-2 sm:gap-3">
                <Button
                  variant="outline"
                  aria-label="Previous page"
                  className="text-slate-700 border-white/70 bg-white/40 hover:bg-white/80 backdrop-blur-xl rounded-full cursor-pointer shadow-sm transition-all hover:-translate-y-0.5 h-9 w-9 p-0 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage <= 1}
                >
                  <ChevronLeft size={16} />
                </Button>
                <span className="text-xs sm:text-sm font-semibold text-slate-700 whitespace-nowrap">
                  Page {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  aria-label="Next page"
                  className="text-slate-700 border-white/70 bg-white/40 hover:bg-white/80 backdrop-blur-xl rounded-full cursor-pointer shadow-sm transition-all hover:-translate-y-0.5 h-9 w-9 p-0 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                >
                  <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {editingRecord && (
        <div className={modalOverlay} onClick={() => setEditingRecord(null)}>
          <div className={modalPanel} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="sm:hidden mx-auto mt-2 h-1.5 w-10 rounded-full bg-slate-300/80 flex-shrink-0" />

            <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-white/60 flex-shrink-0">
              <h3 className="font-semibold tracking-tight text-base text-slate-900 flex items-center gap-2 min-w-0">
                <Edit3 size={18} className="text-amber-600 shrink-0" />
                <span className="truncate">Edit Test Record ({editingRecord.sampleId})</span>
              </h3>
              <button
                onClick={() => setEditingRecord(null)}
                aria-label="Close"
                className="p-2 rounded-full text-slate-500 hover:text-slate-800 hover:bg-white/70 cursor-pointer transition-all hover:rotate-90 shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="flex flex-col min-h-0 flex-1">
              <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Parameter</label>
                  <input
                    type="text"
                    value={formatChem(editingRecord.parameter)}
                    disabled
                    className="w-full px-3.5 py-3 sm:py-2.5 rounded-2xl border border-white/50 bg-white/30 backdrop-blur-xl text-base sm:text-sm font-bold text-slate-500 cursor-not-allowed"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Unit</label>
                  <input type="text" value={formatUnit(editingRecord.unit)} disabled className="w-full px-3.5 py-3 sm:py-2.5 rounded-2xl border border-white/50 bg-white/30 backdrop-blur-xl text-base sm:text-sm font-bold text-slate-500 cursor-not-allowed" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Correct Value</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="any"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className={glassInput}
                    required
                  />
                </div>

                <p className="text-[11px] text-slate-500 italic bg-blue-50/50 p-2.5 rounded-xl border border-blue-100">
                  ℹ️ Status will be automatically re-evaluated based on the configured parameter range upon saving.
                </p>
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center sm:justify-end gap-2 sm:gap-3 px-5 sm:px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-white/60 flex-shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingRecord(null)}
                  className="text-slate-700 border-white/70 bg-white/60 hover:bg-white/90 backdrop-blur-xl rounded-full h-11 sm:h-10 px-5 text-xs font-semibold cursor-pointer shadow-sm justify-center"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-full h-11 sm:h-10 px-6 text-xs font-semibold cursor-pointer shadow-lg shadow-amber-500/30 ring-1 ring-inset ring-white/30 transition-all hover:-translate-y-0.5 active:translate-y-0 justify-center"
                >
                  {submitting ? <Loader2 className="animate-spin h-4 w-4" /> : "Save Changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed z-[60] top-4 inset-x-3 sm:inset-x-auto sm:top-auto sm:bottom-6 sm:right-6 sm:max-w-sm flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/80 backdrop-blur-2xl border border-white/80 ring-1 ring-inset ring-white/50 shadow-2xl animate-in fade-in slide-in-from-top-4 sm:slide-in-from-bottom-4 duration-300">
          {toast.type === "success" ? (
            <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle size={18} className="text-red-600 flex-shrink-0" />
          )}
          <span className="text-xs font-semibold text-slate-800 flex-1 min-w-0 break-words">{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            aria-label="Dismiss"
            className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer flex-shrink-0"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}