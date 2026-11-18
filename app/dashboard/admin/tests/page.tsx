"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FileText, CheckCircle2, AlertTriangle, User, Loader2, X, ShieldCheck, Eye, ChevronDown, Layers, FlaskConical, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

// Same "frosted glass" look as the manager Test Verification page
const glass =
  "bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_32px_rgba(15,23,42,0.10)] ring-1 ring-inset ring-white/40";

const btnGlass =
  "text-slate-700 border-white/70 bg-white/40 hover:bg-white/80 backdrop-blur-xl rounded-full cursor-pointer shadow-sm transition-all hover:-translate-y-0.5";

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

function DetailField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{label}</span>
      <div className="font-semibold text-slate-900 break-words">{children}</div>
    </div>
  );
}

type RawRecord = {
  id: string;
  sampleId: string;
  typeId: string | null;
  parameter: string;
  value: number;
  unit: string;
  status: string;
  testedBy: string;
  isVerified: boolean;
  createdAt: string;
  type?: { name: string; category?: { name: string } | null } | null;
};
type RawDosage = { typeId: string; parameterName: string; amount: number; unit: string; chemical?: { name: string } | null };
type RawUser = { name: string; email: string };

type ParamRow = {
  id: string;
  parameter: string;
  value: number;
  unit: string;
  status: string;
  chemicals: string[];
};

// One data set = all parameters submitted together for one Category + Tank/Unit (same Sample ID)
type SampleGroup = {
  key: string;
  sampleId: string;
  technician: string;
  category: string;
  unit: string;
  createdAt: string;
  date: string;
  status: string; // worst status in the set
  records: ParamRow[];
};

const fmtNum = (n: number) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 1000) / 1000));

export default function AdminTestRecordsPage() {
  const [sets, setSets] = useState<SampleGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [viewingSet, setViewingSet] = useState<SampleGroup | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const loadData = useCallback(async () => {
    try {
      const [recRes, dosRes, usrRes] = await Promise.all([
        fetch("/api/tests", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/manager/parameter-dosages", { cache: "no-store" }).then((r) => r.json()).catch(() => null),
        fetch("/api/users", { cache: "no-store" }).then((r) => r.json()).catch(() => null),
      ]);
      if (!recRes.success) throw new Error(recRes.error || "Failed to load test records");

      const dosages: RawDosage[] = dosRes?.success ? dosRes.data : [];
      const users: RawUser[] = usrRes?.success ? usrRes.data : [];

      // testedBy is stored as the technician's email -> show the real name when we can
      const nameByEmail = new Map(users.map((u) => [u.email.toLowerCase(), u.name]));

      // chemicals auto-deducted for each Unit + Parameter
      const chemMap = new Map<string, string[]>();
      for (const d of dosages) {
        const key = `${d.typeId}::${d.parameterName}`;
        const label = `${d.chemical?.name ?? "Chemical"} (${fmtNum(d.amount)}${d.unit})`;
        chemMap.set(key, [...(chemMap.get(key) || []), label]);
      }

      // group flat records into data sets
      const map = new Map<string, SampleGroup & { allVerified: boolean }>();
      for (const r of recRes.data as RawRecord[]) {
        const key = `${r.sampleId}::${r.typeId || ""}`;
        let g = map.get(key);
        if (!g) {
          g = {
            key,
            sampleId: r.sampleId,
            technician: nameByEmail.get((r.testedBy || "").toLowerCase()) || r.testedBy || "Technician",
            category: r.type?.category?.name || "Category",
            unit: r.type?.name || "Unit",
            createdAt: r.createdAt,
            date: new Date(r.createdAt).toLocaleString(),
            status: "Normal",
            records: [],
            allVerified: true,
          };
          map.set(key, g);
        }
        g.records.push({
          id: r.id,
          parameter: r.parameter,
          value: r.value,
          unit: r.unit,
          status: r.status,
          chemicals: (r.typeId && chemMap.get(`${r.typeId}::${r.parameter}`)) || [],
        });
        if (new Date(r.createdAt) < new Date(g.createdAt)) {
          g.createdAt = r.createdAt;
          g.date = new Date(r.createdAt).toLocaleString();
        }
        if (!r.isVerified) g.allVerified = false;
      }

      const rank: Record<string, number> = { Normal: 0, Warning: 1, Critical: 2 };
      const certified = [...map.values()].filter((g) => g.allVerified);
      for (const g of certified) {
        g.status = g.records.reduce((w, r) => ((rank[r.status] ?? 0) > (rank[w] ?? 0) ? r.status : w), "Normal");
      }
      // latest first
      certified.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setSets(certified);
      setError("");
    } catch (e: any) {
      setError(e.message || "Failed to load test records");
    } finally {
      setLoading(false);
    }
  }, []);

  // Load now, then keep fresh: every 30s and whenever the tab gets focus again
  useEffect(() => {
    loadData();
    const timer = setInterval(loadData, 30000);
    window.addEventListener("focus", loadData);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", loadData);
    };
  }, [loadData]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setViewingSet(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const toggleExpanded = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const filteredSets = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return sets;
    return sets.filter(
      (g) =>
        g.sampleId.toLowerCase().includes(q) ||
        g.category.toLowerCase().includes(q) ||
        g.unit.toLowerCase().includes(q) ||
        g.technician.toLowerCase().includes(q) ||
        g.records.some((r) => r.parameter.toLowerCase().includes(q))
    );
  }, [sets, searchTerm]);

  const ChemicalList = ({ items }: { items: string[] }) =>
    items.length === 0 ? null : (
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
        {items.map((c, i) => (
          <span key={i} className="inline-flex items-center gap-1 text-[11px] text-slate-600 font-sans">
            <FlaskConical size={12} className="text-blue-500 shrink-0" /> {c}
          </span>
        ))}
      </div>
    );

  return (
    <div className="space-y-4 sm:space-y-6 relative">
      {/* Header */}
      <div className={`${glass} p-4 sm:p-6 rounded-3xl flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4`}>
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl font-semibold tracking-tight text-slate-900 flex items-start sm:items-center gap-3 leading-tight">
            <span className="p-2 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow-lg shadow-blue-500/30 ring-1 ring-inset ring-white/40 shrink-0">
              <FileText size={22} />
            </span>
            <span className="mt-1 sm:mt-0">Test Records</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-2">
            Test data sets that have been verified and certified by the Lab Manager, latest first.
          </p>
        </div>

        <div className="w-full lg:w-80 relative group flex-shrink-0">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-500 transition-colors group-focus-within:text-blue-600">
            <Search size={18} />
          </span>
          <input
            type="text"
            placeholder="Search sample, unit, technician..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 min-h-[44px] sm:min-h-0 rounded-full border border-white/70 bg-white/60 hover:bg-white/80 backdrop-blur-xl text-base sm:text-sm text-slate-800 font-medium placeholder:text-slate-400 shadow-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:bg-white/90"
          />
        </div>
      </div>

      {error && <div className="rounded-2xl border border-red-300/60 bg-red-500/10 px-4 py-3 text-xs text-red-700">{error}</div>}

      {loading ? (
        <div className={`${glass} flex justify-center py-20 rounded-3xl`}>
          <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
        </div>
      ) : filteredSets.length === 0 ? (
        <div className={`${glass} rounded-3xl py-16 px-4 text-center text-slate-500 text-xs`}>
          {sets.length === 0 ? "No certified test records yet." : "No test records found matching your query."}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:gap-4">
          {filteredSets.map((g) => {
            const isOpen = expanded.has(g.key);
            const counts: Record<string, number> = { Normal: 0, Warning: 0, Critical: 0 };
            g.records.forEach((r) => {
              counts[r.status] = (counts[r.status] || 0) + 1;
            });

            return (
              <div key={g.key} className={`${glass} rounded-2xl sm:rounded-3xl min-w-0 overflow-hidden transition-all duration-200`}>
                {/* Data-set header */}
                <div className="p-4 sm:p-5 flex flex-col xl:flex-row xl:items-center gap-3 xl:gap-5">
                  <div className="flex items-start gap-3 min-w-0 xl:flex-1">
                    <div className="min-w-0">
                      <div className="text-sm font-bold font-mono text-slate-900 break-all">{g.sampleId}</div>
                      <h3 className="text-sm font-bold text-slate-900 break-words">
                        {g.category} • {g.unit}
                      </h3>
                      <p className="text-[11px] text-slate-600 mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="inline-flex items-center gap-1">
                          <User size={12} className="text-blue-600" /> {g.technician}
                        </span>
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
                  </div>

                  <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 border border-emerald-500/30">
                      <ShieldCheck size={14} /> Certified ✓
                    </span>
                    <Button
                      variant="outline"
                      aria-label={`View ${g.sampleId}`}
                      className={`${btnGlass} h-9 px-3 text-xs font-semibold`}
                      onClick={() => setViewingSet(g)}
                    >
                      <Eye size={13} className="mr-1 text-blue-600" /> View
                    </Button>
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
                        <div className="min-w-0">
                          <div className="font-mono text-xs text-slate-800 break-words">
                            <strong>{r.parameter}:</strong> {fmtNum(r.value)} {r.unit}
                          </div>
                          <ChemicalList items={r.chemicals} />
                        </div>
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold backdrop-blur-xl border shrink-0 ${statusClass(r.status)}`}>
                          {r.status === "Normal" ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
                          {r.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
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
                <span className="truncate">Test Record Details</span>
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
                <DetailField label="Verification State">Certified / Verified ✓</DetailField>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                    Test Results ({viewingSet.records.length} parameter{viewingSet.records.length === 1 ? "" : "s"})
                  </span>
                  <div className="mt-1 rounded-2xl border border-indigo-400/30 bg-indigo-400/10 divide-y divide-indigo-400/20 overflow-hidden">
                    {viewingSet.records.map((r) => (
                      <div key={r.id} className="px-3 py-2.5">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-mono font-bold text-indigo-700 break-words min-w-0">
                            {r.parameter}: {fmtNum(r.value)} {r.unit}
                          </span>
                          <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusClass(r.status)}`}>
                            {r.status}
                          </span>
                        </div>
                        <ChemicalList items={r.chemicals} />
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
    </div>
  );
  
}