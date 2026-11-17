"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { CheckSquare, CheckCircle2, Eye, Check, AlertTriangle, User, Loader2, X, AlertCircle, ShieldCheck, Edit3, Trash2, Clock, Lock, ChevronDown, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";

const glass =
  "bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_32px_rgba(15,23,42,0.10)] ring-1 ring-inset ring-white/40";

const btnPrimary =
  "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-full cursor-pointer shadow-lg shadow-blue-500/30 ring-1 ring-inset ring-white/30 transition-all hover:-translate-y-0.5 active:translate-y-0";

const btnGlassBlue =
  "text-blue-700 border-white/70 bg-white/60 hover:bg-white/90 backdrop-blur-xl rounded-full cursor-pointer shadow-sm transition-all hover:-translate-y-0.5";

const btnGlass =
  "text-slate-700 border-white/70 bg-white/40 hover:bg-white/80 backdrop-blur-xl rounded-full cursor-pointer shadow-sm transition-all hover:-translate-y-0.5";

const btnAmber =
  "text-amber-700 border-amber-300/60 bg-amber-400/10 hover:bg-amber-400/20 backdrop-blur-xl rounded-full cursor-pointer shadow-sm transition-all hover:-translate-y-0.5";

const btnRed =
  "text-red-600 border-red-300/60 bg-red-400/10 hover:bg-red-400/20 backdrop-blur-xl rounded-full cursor-pointer shadow-sm transition-all hover:-translate-y-0.5";

const glassInput =
  "w-full px-3.5 py-3 sm:py-2.5 rounded-2xl border border-white/70 bg-white/60 hover:bg-white/80 backdrop-blur-xl text-base sm:text-sm font-medium text-slate-800 shadow-sm " +
  "transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:bg-white/90";

const modalOverlay =
  "fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/30 backdrop-blur-sm animate-in fade-in duration-200";

const modalPanel =
  "w-full sm:max-w-lg max-h-[92dvh] sm:max-h-[90vh] flex flex-col overflow-hidden overscroll-contain " +
  "rounded-t-3xl sm:rounded-3xl bg-white/75 backdrop-blur-2xl border border-white/70 ring-1 ring-inset ring-white/50 " +
  "shadow-[0_24px_60px_rgba(15,23,42,0.25)] animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200";

const statusClass = (status: string) => {
  if (status === "Critical") return "bg-red-400/20 text-red-700 border-red-400/40";
  if (status === "Warning") return "bg-amber-400/20 text-amber-700 border-amber-400/40";
  return "bg-emerald-400/20 text-emerald-700 border-emerald-400/40";
};

function ManagerLiveCountdown({ createdAt, onExpire }: { createdAt: string; onExpire: () => void }) {
  const targetTime = new Date(createdAt).getTime() + 24 * 60 * 60 * 1000;
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
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold backdrop-blur-xl bg-white/50 text-slate-600 border border-white/70 whitespace-nowrap">
        <Lock size={12} /> 24h Window Expired
      </span>
    );
  }

  const totalSeconds = Math.floor(timeLeft / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold backdrop-blur-xl bg-blue-400/20 text-blue-700 border border-blue-400/40 animate-pulse whitespace-nowrap">
      <Clock size={12} /> {hours}h {String(minutes).padStart(2, "0")}m {String(seconds).padStart(2, "0")}s left
    </span>
  );
}

function DetailField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{label}</span>
      <div className="font-semibold text-slate-900 break-words">{children}</div>
    </div>
  );
}

type PendingTest = {
  id: string;
  typeId: string;
  sampleId: string;
  technician: string;
  category: string;
  sample: string;
  date: string;
  createdAt: string;
  status: string;
  results: string;
  parameter: string;
  value: number;
  unit: string;
  isVerified: boolean;
  selected: boolean;
};

// One data set = all parameters a technician submitted together for one Category + Tank/Unit (same Sample ID)
type SampleGroup = {
  key: string;
  sampleId: string;
  technician: string;
  category: string;
  unit: string;
  createdAt: string; // earliest record of the set
  date: string;
  status: string; // worst status in the set
  allVerified: boolean;
  records: PendingTest[];
};

export default function ManagerVerifyPage() {
  const [pendingTests, setPendingTests] = useState<PendingTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [viewingSet, setViewingSet] = useState<SampleGroup | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Manager Edit modal state (no manual status needed)
  const [editingRecord, setEditingRecord] = useState<PendingTest | null>(null);
  const [editValue, setEditValue] = useState("");

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
      if (e.key === "Escape") {
        setViewingSet(null);
        setEditingRecord(null);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const fetchRecords = async () => {
    try {
      const res = await fetch("/api/technician/tests");
      const data = await res.json();
      if (res.ok) {
        const formatted = (data.data || []).map((r: any) => ({
          id: r.id,
          typeId: r.typeId || "",
          sampleId: r.sampleId,
          technician: r.testedBy || "Technician",
          category: r.type?.category?.name || "Category",
          sample: `${r.type?.name || "Unit"} (${r.sampleId})`,
          date: new Date(r.createdAt).toLocaleString(),
          createdAt: r.createdAt,
          status: r.status,
          results: `${r.parameter}: ${r.value} ${r.unit}`,
          parameter: r.parameter,
          value: r.value,
          unit: r.unit,
          isVerified: r.isVerified,
          selected: false,
        }));
        setPendingTests(formatted);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  // group the flat records into data sets
  const sets: SampleGroup[] = React.useMemo(() => {
    const map = new Map<string, SampleGroup>();
    for (const t of pendingTests) {
      const key = `${t.sampleId}::${t.typeId}`;
      let g = map.get(key);
      if (!g) {
        g = {
          key,
          sampleId: t.sampleId,
          technician: t.technician,
          category: t.category,
          unit: t.sample.replace(` (${t.sampleId})`, ""),
          createdAt: t.createdAt,
          date: t.date,
          status: "Normal",
          allVerified: true,
          records: [],
        };
        map.set(key, g);
      }
      g.records.push(t);
      if (new Date(t.createdAt) < new Date(g.createdAt)) {
        g.createdAt = t.createdAt;
        g.date = t.date;
      }
      if (!t.isVerified) g.allVerified = false;
    }
    const rank: Record<string, number> = { Normal: 0, Warning: 1, Critical: 2 };
    const list = [...map.values()];
    for (const g of list) {
      g.records.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      g.status = g.records.reduce((w, r) => ((rank[r.status] ?? 0) > (rank[w] ?? 0) ? r.status : w), "Normal");
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [pendingTests]);

  const toggleExpanded = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const unverifiedSets = sets.filter((g) => !g.allVerified);
  const isSetSelected = (g: SampleGroup) => g.records.filter((r) => !r.isVerified).every((r) => r.selected);
  const allSelected = unverifiedSets.length > 0 && unverifiedSets.every(isSetSelected);
  const selectedCount = unverifiedSets.filter(isSetSelected).length;

  const toggleSelectAll = (checked: boolean) => {
    setPendingTests(pendingTests.map((t) => (!t.isVerified ? { ...t, selected: checked } : t)));
  };

  const toggleSelectSet = (g: SampleGroup) => {
    const ids = new Set(g.records.filter((r) => !r.isVerified).map((r) => r.id));
    const next = !isSetSelected(g);
    setPendingTests(pendingTests.map((t) => (ids.has(t.id) ? { ...t, selected: next } : t)));
  };

  // verify every unverified parameter of one or more data sets
  const verifyIds = async (ids: string[]) => {
    const results = await Promise.all(
      ids.map((id) =>
        fetch("/api/manager/verify", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, isVerified: true }),
        }).then((r) => r.ok)
      )
    );
    if (results.some((ok) => !ok)) throw new Error("Some records could not be verified. Please try again.");
  };

  const handleVerifySet = async (g: SampleGroup) => {
    setSubmitting(true);
    try {
      await verifyIds(g.records.filter((r) => !r.isVerified).map((r) => r.id));
      setToast({ message: `Data set ${g.sampleId} verified and certified successfully!`, type: "success" });
      fetchRecords();
    } catch (err: any) {
      setToast({ message: err.message || "Failed to verify", type: "error" });
      fetchRecords();
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkVerify = async () => {
    const selectedSets = unverifiedSets.filter(isSetSelected);
    if (selectedSets.length === 0) {
      setToast({ message: "Please select at least one unverified data set.", type: "error" });
      return;
    }

    setSubmitting(true);
    try {
      await verifyIds(selectedSets.flatMap((g) => g.records.filter((r) => !r.isVerified).map((r) => r.id)));
      setToast({ message: `Successfully verified and approved ${selectedSets.length} data set${selectedSets.length === 1 ? "" : "s"}!`, type: "success" });
      fetchRecords();
    } catch (err: any) {
      setToast({ message: err.message || "Failed to bulk verify", type: "error" });
      fetchRecords();
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEdit = (t: PendingTest) => {
    const diffHours = (Date.now() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60);
    if (diffHours > 24) {
      setToast({ message: "24-hour update window has expired. Cannot edit.", type: "error" });
      return;
    }
    setEditingRecord(t);
    setEditValue(t.value.toString());
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/manager/verify", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingRecord.id,
          value: editValue,
        }),
      });
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

  const handleDelete = async (id: string, createdAt: string) => {
    const diffHours = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
    if (diffHours > 24) {
      setToast({ message: "24-hour deletion window has expired. Cannot delete.", type: "error" });
      return;
    }

    if (!confirm("Are you sure you want to delete this test record?")) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/manager/verify?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete record");

      setToast({ message: "Test record deleted successfully!", type: "success" });
      fetchRecords();
    } catch (err: any) {
      setToast({ message: err.message || "Failed to delete", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  // delete every parameter of a data set in one go (24-hour window applies)
  const handleDeleteSet = async (g: SampleGroup) => {
    const diffHours = (Date.now() - new Date(g.createdAt).getTime()) / (1000 * 60 * 60);
    if (diffHours > 24) {
      setToast({ message: "24-hour deletion window has expired. Cannot delete.", type: "error" });
      return;
    }
    if (!confirm(`Delete the whole data set ${g.sampleId} (${g.records.length} parameter${g.records.length === 1 ? "" : "s"})? This cannot be undone.`)) return;

    setSubmitting(true);
    try {
      const results = await Promise.all(
        g.records.map((r) => fetch(`/api/manager/verify?id=${r.id}`, { method: "DELETE" }).then((res) => res.ok))
      );
      if (results.some((ok) => !ok)) throw new Error("Some records could not be deleted. Please refresh and try again.");
      setToast({ message: `Data set ${g.sampleId} deleted successfully!`, type: "success" });
    } catch (err: any) {
      setToast({ message: err.message || "Failed to delete data set", type: "error" });
    } finally {
      fetchRecords();
      setSubmitting(false);
    }
  };

  const EmptyState = () => (
    <div className="py-16 px-4 text-center text-slate-500 text-xs">
      <div className="mx-auto mb-3 w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 ring-1 ring-inset ring-white/40">
        <CheckCircle2 size={24} />
      </div>
      No pending test verifications in queue. All submitted records are certified!
    </div>
  );

  return (
    <div className={`space-y-4 sm:space-y-6 relative ${selectedCount > 0 ? "pb-24 xl:pb-0" : ""}`}>
      {/* Header */}
      <div className={`${glass} p-4 sm:p-6 rounded-3xl flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4`}>
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl font-semibold tracking-tight text-slate-900 flex items-start sm:items-center gap-3 leading-tight">
            <span className="p-2 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow-lg shadow-blue-500/30 ring-1 ring-inset ring-white/40 shrink-0">
              <CheckSquare size={22} />
            </span>
            <span className="mt-1 sm:mt-0">Test Verification & Live 24-Hr Queue</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-2">
            Review technician test submissions, inspect auto-evaluated status, and execute bulk verification or live 24-hour updates/deletions.
          </p>
        </div>
        <Button
          onClick={handleBulkVerify}
          disabled={submitting || selectedCount === 0}
          className={`${btnPrimary} w-full sm:w-auto justify-center text-sm px-5 py-3 sm:py-2.5 flex items-center gap-2 flex-shrink-0 ${
            selectedCount === 0 ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          {submitting ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
          <span className="sm:hidden">Verify Selected{selectedCount > 0 ? ` (${selectedCount})` : ""}</span>
          <span className="hidden sm:inline">
            Bulk Verify & Approve Selected{selectedCount > 0 ? ` (${selectedCount})` : ""}
          </span>
        </Button>
      </div>

      {loading ? (
        <div className={`${glass} flex justify-center py-20 rounded-3xl`}>
          <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
        </div>
      ) : (
        <>
          {sets.length === 0 ? (
            <div className={`${glass} rounded-3xl`}>
              <EmptyState />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:gap-4">
              {unverifiedSets.length > 0 && (
                <div className={`${glass} rounded-2xl px-4 py-1 flex items-center justify-between gap-3`}>
                  <label className="flex items-center gap-3 min-h-[48px] text-xs font-semibold text-slate-700 cursor-pointer flex-1">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={(e) => toggleSelectAll(e.target.checked)}
                      className="w-5 h-5 rounded border-slate-300 accent-blue-600 cursor-pointer"
                    />
                    Select all unverified data sets
                  </label>
                  <span className="text-[11px] font-semibold text-slate-600 whitespace-nowrap">{selectedCount} selected</span>
                </div>
              )}

              {sets.map((g) => {
                const isOpen = expanded.has(g.key);
                const selected = !g.allVerified && isSetSelected(g);
                const canModifySet = (Date.now() - new Date(g.createdAt).getTime()) / (1000 * 60 * 60) <= 24;
                const counts: Record<string, number> = { Normal: 0, Warning: 0, Critical: 0 };
                g.records.forEach((r) => { counts[r.status] = (counts[r.status] || 0) + 1; });

                return (
                  <div
                    key={g.key}
                    className={`${glass} rounded-2xl sm:rounded-3xl min-w-0 overflow-hidden transition-all duration-200 ${
                      selected ? "!bg-blue-500/10 !border-blue-400/50" : ""
                    } ${g.allVerified ? "opacity-90" : ""}`}
                  >
                    {/* Data-set header */}
                    <div className="p-4 sm:p-5 flex flex-col xl:flex-row xl:items-center gap-3 xl:gap-5">
                      <div className="flex items-start gap-3 min-w-0 xl:flex-1">
                        {!g.allVerified ? (
                          <label className="p-2 -m-2 cursor-pointer shrink-0" aria-label={`Select ${g.sampleId}`}>
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => toggleSelectSet(g)}
                              className="w-5 h-5 rounded border-slate-300 accent-blue-600 cursor-pointer block"
                            />
                          </label>
                        ) : (
                          <span className="w-5 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <div className="text-sm font-bold font-mono text-slate-900 break-all">{g.sampleId}</div>
                          <h3 className="text-sm font-bold text-slate-900 break-words">{g.category} • {g.unit}</h3>
                          <p className="text-[11px] text-slate-600 mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span className="inline-flex items-center gap-1"><User size={12} className="text-blue-600" /> {g.technician}</span>
                            <span>{g.date}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-slate-600 xl:flex-1">
                        <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                          <Layers size={13} className="text-blue-600" /> {g.records.length} parameter{g.records.length === 1 ? "" : "s"}
                        </span>
                        {counts.Normal > 0 && <span className="text-emerald-700 font-semibold">{counts.Normal} Normal</span>}
                        {counts.Warning > 0 && <span className="text-amber-700 font-semibold">{counts.Warning} Warning</span>}
                        {counts.Critical > 0 && <span className="text-red-700 font-semibold">{counts.Critical} Critical</span>}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold backdrop-blur-xl border ${statusClass(g.status)}`}>
                          {g.status === "Normal" ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
                          {g.status}
                        </span>
                        <ManagerLiveCountdown createdAt={g.createdAt} onExpire={handleExpire} />
                      </div>

                      <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                        {g.allVerified ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 border border-emerald-500/30">
                            <ShieldCheck size={14} /> Certified ✓
                          </span>
                        ) : (
                          <Button
                            variant="outline"
                            className={`${btnGlassBlue} h-9 px-3 text-xs font-semibold`}
                            onClick={() => handleVerifySet(g)}
                            disabled={submitting}
                          >
                            <Check size={13} className="mr-1" /> Verify All
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          aria-label={`View ${g.sampleId}`}
                          className={`${btnGlass} h-9 px-3 text-xs font-semibold`}
                          onClick={() => setViewingSet(g)}
                        >
                          <Eye size={13} className="mr-1 text-blue-600" /> View
                        </Button>
                        {canModifySet && (
                          <Button
                            variant="outline"
                            aria-label={`Delete data set ${g.sampleId}`}
                            className={`${btnRed} h-9 px-3 text-xs font-semibold`}
                            onClick={() => handleDeleteSet(g)}
                            disabled={submitting}
                          >
                            <Trash2 size={13} className="mr-1" /> Delete All
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          aria-expanded={isOpen}
                          aria-label={isOpen ? "Hide parameters" : "Show parameters"}
                          className={`${btnGlass} h-9 px-2.5`}
                          onClick={() => toggleExpanded(g.key)}
                        >
                          <ChevronDown size={16} className={`text-blue-600 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
                        </Button>
                      </div>
                    </div>

                    {/* Parameters of the data set */}
                    {isOpen && (
                      <div className="border-t border-white/60 bg-white/20 divide-y divide-white/50 animate-in fade-in duration-200">
                        {g.records.map((r) => (
                          <div key={r.id} className="px-4 sm:px-5 py-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                            <div className="min-w-0 font-mono text-xs text-slate-800 break-words">
                              <strong>{r.parameter}:</strong> {r.value} {r.unit}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold backdrop-blur-xl border ${statusClass(r.status)}`}>
                                {r.status === "Normal" ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
                                {r.status}
                              </span>
                              {canModifySet && (
                                <>
                                  <Button
                                    variant="outline"
                                    aria-label={`Edit ${r.parameter}`}
                                    className={`${btnAmber} h-8 px-2.5 text-xs font-semibold`}
                                    onClick={() => handleOpenEdit(r)}
                                  >
                                    <Edit3 size={13} />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    aria-label={`Delete ${r.parameter}`}
                                    className={`${btnRed} h-8 px-2.5 text-xs font-semibold`}
                                    onClick={() => handleDelete(r.id, r.createdAt)}
                                  >
                                    <Trash2 size={13} />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Sticky bulk-verify bar */}
      {selectedCount > 0 && (
        <div className="xl:hidden fixed inset-x-3 z-40 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] animate-in slide-in-from-bottom-4 fade-in duration-200">
          <div className="bg-white/70 backdrop-blur-2xl border border-white/70 ring-1 ring-inset ring-white/50 shadow-[0_16px_40px_rgba(15,23,42,0.2)] rounded-2xl p-2 flex items-center gap-2">
            <span className="pl-3 text-xs font-semibold text-slate-700 whitespace-nowrap">{selectedCount} selected</span>
            <Button
              onClick={handleBulkVerify}
              disabled={submitting}
              className={`${btnPrimary} flex-1 h-11 text-sm justify-center flex items-center gap-2`}
            >
              {submitting ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
              Verify Selected
            </Button>
          </div>
        </div>
      )}

      {/* VIEW MODAL POPUP */}
      {viewingSet && (
        <div className={modalOverlay} onClick={() => setViewingSet(null)}>
          <div className={modalPanel} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="sm:hidden mx-auto mt-2 h-1.5 w-10 rounded-full bg-slate-300/80 flex-shrink-0" />

            <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-white/60 flex-shrink-0">
              <h3 className="font-semibold tracking-tight text-base sm:text-lg text-slate-900 flex items-center gap-2 min-w-0">
                <Eye size={20} className="text-blue-600 shrink-0" />
                <span className="truncate">Test Submission Details</span>
              </h3>
              <button
                onClick={() => setViewingSet(null)}
                aria-label="Close"
                className="p-2 rounded-full text-slate-500 hover:text-slate-800 hover:bg-white/70 cursor-pointer transition-all hover:rotate-90 shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1 text-xs sm:text-sm text-slate-700">
              <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-3 p-4 rounded-2xl bg-white/50 backdrop-blur-xl border border-white/70">
                <DetailField label="Sample ID">
                  <span className="font-mono text-sm break-all">{viewingSet.sampleId}</span>
                </DetailField>
                <DetailField label="Overall Status">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${statusClass(viewingSet.status)}`}>
                    {viewingSet.status}
                  </span>
                </DetailField>
              </div>

              <div className="space-y-3 px-1">
                <DetailField label="Category & Unit">
                  {viewingSet.category} / {viewingSet.unit}
                </DetailField>
                <DetailField label="Tested By (Technician)">{viewingSet.technician}</DetailField>
                <DetailField label="Recorded Date">{viewingSet.date}</DetailField>
                <DetailField label="Verification State">
                  {viewingSet.allVerified ? "Certified / Verified ✓" : "Pending Verification"}
                </DetailField>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                    Test Results ({viewingSet.records.length} parameter{viewingSet.records.length === 1 ? "" : "s"})
                  </span>
                  <div className="mt-1 rounded-2xl border border-indigo-400/30 bg-indigo-400/10 divide-y divide-indigo-400/20 overflow-hidden">
                    {viewingSet.records.map((r) => (
                      <div key={r.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                        <span className="font-mono font-bold text-indigo-700 break-words min-w-0">
                          {r.parameter}: {r.value} {r.unit}
                        </span>
                        <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusClass(r.status)}`}>
                          {r.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end px-5 sm:px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-white/60 flex-shrink-0">
              <Button
                onClick={() => setViewingSet(null)}
                variant="outline"
                className={`${btnGlass} w-full sm:w-auto h-11 sm:h-10 px-6 font-semibold justify-center`}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MANAGER EDIT MODAL (Manual status dropdown removed; status auto-evaluates on backend) */}
      {editingRecord && (
        <div className={modalOverlay} onClick={() => setEditingRecord(null)}>
          <div className={`${modalPanel} sm:max-w-md`} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="sm:hidden mx-auto mt-2 h-1.5 w-10 rounded-full bg-slate-300/80 flex-shrink-0" />

            <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-white/60 flex-shrink-0">
              <h3 className="font-semibold tracking-tight text-base text-slate-900 flex items-center gap-2 min-w-0">
                <Edit3 size={18} className="text-amber-600 shrink-0" />
                <span className="truncate">Manager Edit ({editingRecord.sampleId})</span>
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
                    value={editingRecord.parameter}
                    disabled
                    className="w-full px-3.5 py-3 sm:py-2.5 rounded-2xl border border-white/50 bg-white/30 backdrop-blur-xl text-base sm:text-sm font-bold text-slate-500 cursor-not-allowed"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Unit</label>
                  <input type="text" value={editingRecord.unit} disabled className="w-full px-3.5 py-3 sm:py-2.5 rounded-2xl border border-white/50 bg-white/30 backdrop-blur-xl text-base sm:text-sm font-bold text-slate-500 cursor-not-allowed" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Value</label>
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
                  className={`${btnGlass} h-11 sm:h-10 px-5 text-xs font-semibold justify-center`}
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

      {/* Toast Notification */}
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