"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Truck,
  PlusCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  ClipboardCheck,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { evaluateGaliParams, type GaliParam } from "@/lib/galiRanges";
import GaliReport from "@/components/plant-operator/GaliReport";
import { GlassDropdown } from "@/components/manager/plant/ui"; // same dropdown as the Manager "Analytics & Trends" page

// Shared "frosted glass" look (same as the other pages)
const glass =
  "bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_32px_rgba(15,23,42,0.10)] ring-1 ring-inset ring-white/40";

// Phones: 16px text (stops the iOS zoom-on-focus) + 44px tap height. sm and up: compact.
const inputClass =
  "w-full min-h-[44px] sm:min-h-0 sm:h-11 rounded-xl border border-white/70 bg-white/70 px-3 text-base sm:text-sm text-slate-800 " +
  "placeholder:text-slate-400 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/40";

type Vehicle = { id: string; vehicleNumber: string };

// One saved reading inside a check (snapshot taken when the check was saved)
type SnapshotItem = { name: string; unit?: string | null; min?: number; max?: number; value: number; ok?: boolean };

type CheckRow = {
  id: string;
  esValue: number;
  phValue: number;
  values: SnapshotItem[] | null;
  inRange: boolean;
  decision: "APPROVED" | "REJECTED";
  checkedBy: string;
  createdAt: string;
  vehicle: { vehicleNumber: string };
};

type Notice = { type: "success" | "error"; text: string } | null;

// Recent Gali Checks: 3 checks per page, and the Total / Approved / Rejected buttons filter the list
const PAGE_SIZE = 3;
type Filter = "ALL" | "APPROVED" | "REJECTED";

const toNum = (v: string | undefined) => (v === undefined || v.trim() === "" ? NaN : Number(v));

// Safe JSON fetch: if the server sends an HTML error page instead of JSON, we say WHICH url failed
async function getJson(url: string) {
  const res = await fetch(url, { cache: "no-store", credentials: "same-origin" });
  const text = await res.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`${url} returned ${res.status} (not JSON)`);
  }
  return { res, json };
}

// Readings of a saved check. New checks carry every parameter; very old checks only have ES / PH.
function readingsOf(c: CheckRow): SnapshotItem[] {
  if (Array.isArray(c.values) && c.values.length > 0) return c.values;
  return [
    { name: "ES", value: c.esValue },
    { name: "PH", value: c.phValue },
  ];
}

// One table column per parameter name (matched ignoring upper / lower case)
type Column = { key: string; name: string; unit: string | null };
const keyOf = (name: string) => name.trim().toUpperCase();

// Date and time are shown separately, always in Sri Lanka time
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Colombo" });
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Colombo" });

function DecisionBadge({ decision }: { decision: "APPROVED" | "REJECTED" }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border whitespace-nowrap ${
        decision === "APPROVED"
          ? "bg-emerald-400/20 text-emerald-700 border-emerald-400/40"
          : "bg-red-400/20 text-red-700 border-red-400/40"
      }`}
    >
      {decision === "APPROVED" ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
      {decision === "APPROVED" ? "Approved" : "Rejected"}
    </span>
  );
}

// A value in the table: red + warning icon when it was outside its range, "-" when that check did not have the parameter
function ValueCell({ reading }: { reading?: SnapshotItem }) {
  if (!reading) return <span className="text-slate-400">-</span>;
  const bad = reading.ok === false;
  return (
    <span className={`inline-flex items-center justify-center gap-1 font-semibold ${bad ? "text-red-600" : "text-slate-800"}`}>
      {reading.value}
      {bad && <AlertCircle size={12} className="shrink-0" aria-label="Outside the allowed range" />}
    </span>
  );
}

export default function GaliPage() {
  // Parameters + ranges the Manager added (Manager > Plant Operator > Gali Operator > Parameters & Ranges)
  const [params, setParams] = useState<GaliParam[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [checks, setChecks] = useState<CheckRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Register vehicle
  const [newVehicle, setNewVehicle] = useState("");
  const [registering, setRegistering] = useState(false);
  const [registerNotice, setRegisterNotice] = useState<Notice>(null);

  // Daily check: one text value per parameter id
  const [vehicleId, setVehicleId] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [checkNotice, setCheckNotice] = useState<Notice>(null);

  // Recent Gali Checks: which filter button is on, and which page is open
  const [filter, setFilter] = useState<Filter>("ALL");
  const [page, setPage] = useState(1);

  const loadVehicles = useCallback(async () => {
    const { res, json } = await getJson("/api/plant-operator/gali/vehicles");
    if (res.ok && json.success) setVehicles(json.data);
    else throw new Error(json.error || `Vehicles failed (${res.status})`);
  }, []);

  const loadChecks = useCallback(async () => {
    const { res, json } = await getJson("/api/plant-operator/gali/checks");
    if (res.ok && json.success) setChecks(json.data);
    else throw new Error(json.error || `Checks failed (${res.status})`);
  }, []);

  const loadParams = useCallback(async () => {
    const { res, json } = await getJson("/api/plant-operator/gali/parameters");
    if (res.ok && json.success) setParams(json.data);
    else throw new Error(json.error || `Parameters failed (${res.status})`);
  }, []);

  useEffect(() => {
    (async () => {
      // Each one on its own, so one failing does not block the others
      const results = await Promise.allSettled([loadVehicles(), loadChecks(), loadParams()]);
      const failed = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
      if (failed.length > 0) {
        const msg = failed.map((f) => (f.reason instanceof Error ? f.reason.message : String(f.reason))).join(" | ");
        console.error("Gali load failed:", msg);
        setLoadError(msg);
      }
      setLoading(false);
    })();
  }, [loadVehicles, loadChecks, loadParams]);

  // The Manager may change a parameter / range while this page is open -> refresh when the operator comes back to the tab
  useEffect(() => {
    const refresh = () => {
      loadParams().catch(() => {});
    };
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [loadParams]);

  // ---- Register a vehicle ----
  const registerVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (registering) return;
    setRegistering(true);
    setRegisterNotice(null);
    try {
      const res = await fetch("/api/plant-operator/gali/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ vehicleNumber: newVehicle }),
      });
      const json = await res.json().catch(() => ({ error: `Server error (${res.status})` }));
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to register vehicle");
      setRegisterNotice({ type: "success", text: `Vehicle ${json.data.vehicleNumber} registered.` });
      setNewVehicle("");
      await loadVehicles();
      setVehicleId(json.data.id); // pick the new vehicle for the check
    } catch (err: any) {
      setRegisterNotice({ type: "error", text: err.message });
    } finally {
      setRegistering(false);
    }
  };

  // ---- Auto result for ALL the Manager's parameters ----
  const hasParams = params.length > 0;
  const allFilled = hasParams && params.every((p) => Number.isFinite(toNum(values[p.id])));

  const result = useMemo(() => {
    if (!allFilled) return null;
    const nums: Record<string, number> = {};
    for (const p of params) nums[p.id] = toNum(values[p.id]);
    return evaluateGaliParams(params, nums);
  }, [allFilled, params, values]);

  const canReject = !!vehicleId && !!result && !submitting;
  // Approval is only possible when EVERY value is inside its range
  const canApprove = canReject && !!result?.approved;

  const setValue = (id: string, v: string) => {
    setValues((prev) => ({ ...prev, [id]: v }));
    setCheckNotice(null);
  };

  const submitCheck = async (decision: "APPROVED" | "REJECTED") => {
    if (submitting) return;
    if (decision === "APPROVED" ? !canApprove : !canReject) return;
    setSubmitting(true);
    setCheckNotice(null);
    try {
      // The server expects { vehicleId, values: { [parameterId]: value }, decision }
      const payload: Record<string, string> = {};
      for (const p of params) payload[p.id] = values[p.id] ?? "";

      const res = await fetch("/api/plant-operator/gali/checks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ vehicleId, values: payload, decision }),
      });
      const json = await res.json().catch(() => ({ error: `Server error (${res.status})` }));
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to save the check");
      const plate = vehicles.find((v) => v.id === vehicleId)?.vehicleNumber ?? "Vehicle";
      setCheckNotice({
        type: "success",
        text: decision === "APPROVED" ? `${plate} approved.` : `${plate} rejected.`,
      });
      setValues({});
      setPage(1);
      await loadChecks();
    } catch (err: any) {
      setCheckNotice({ type: "error", text: err.message });
      loadParams().catch(() => {}); // the Manager may have changed something - show the latest ranges
    } finally {
      setSubmitting(false);
    }
  };

  // Table columns: the Manager's current parameters first, then any older parameter that only exists in past checks
  const columns = useMemo<Column[]>(() => {
    const cols: Column[] = [];
    const seen = new Set<string>();
    const add = (name: string, unit?: string | null) => {
      const k = keyOf(name);
      if (seen.has(k)) return;
      seen.add(k);
      cols.push({ key: k, name: name.trim(), unit: unit ?? null });
    };
    params.forEach((p) => add(p.name, p.unit));
    checks.forEach((c) => readingsOf(c).forEach((r) => add(r.name, r.unit)));
    return cols;
  }, [params, checks]);

  const approvedCount = checks.filter((c) => c.decision === "APPROVED").length;
  const rejectedCount = checks.length - approvedCount;

  // Filter buttons (Total / Approved / Rejected) -> pages of 3
  const filtered = useMemo(() => (filter === "ALL" ? checks : checks.filter((c) => c.decision === filter)), [checks, filter]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount); // stays valid when the list shrinks after a refresh
  const start = (safePage - 1) * PAGE_SIZE;
  const paged = filtered.slice(start, start + PAGE_SIZE);
  // Page numbers to show: first, last and the ones around the current page (-1 = "...")
  const pageNumbers = useMemo(() => {
    if (pageCount <= 5) return Array.from({ length: pageCount }, (_, i) => i + 1);
    const nums = Array.from(new Set([1, pageCount, safePage - 1, safePage, safePage + 1]))
      .filter((n) => n >= 1 && n <= pageCount)
      .sort((a, b) => a - b);
    const out: number[] = [];
    nums.forEach((n, i) => {
      if (i > 0 && n - nums[i - 1] > 1) out.push(-1);
      out.push(n);
    });
    return out;
  }, [pageCount, safePage]);
  const filterChips: { key: Filter; label: string; count: number; on: string; off: string }[] = [
    { key: "ALL", label: "Total", count: checks.length, on: "bg-slate-800 text-white border-slate-800", off: "bg-white/70 text-slate-700 border-white/70 hover:bg-white" },
    { key: "APPROVED", label: "Approved", count: approvedCount, on: "bg-emerald-600 text-white border-emerald-600", off: "bg-emerald-400/20 text-emerald-700 border-emerald-400/40 hover:bg-emerald-400/30" },
    { key: "REJECTED", label: "Rejected", count: rejectedCount, on: "bg-red-600 text-white border-red-600", off: "bg-red-400/20 text-red-700 border-red-400/40 hover:bg-red-400/30" },
  ];

  const renderNotice = (notice: Notice) =>
    notice ? (
      <div
        role="status"
        className={`flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm border break-words ${
          notice.type === "success"
            ? "bg-emerald-500/10 text-emerald-700 border-emerald-400/40"
            : "bg-red-500/10 text-red-700 border-red-400/40"
        }`}
      >
        {notice.type === "success" ? (
          <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
        ) : (
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
        )}
        <span className="min-w-0">{notice.text}</span>
      </div>
    ) : null;

  const outsideMessages = result ? result.results.filter((r) => !r.ok).map((r) => `${r.name} is outside ${r.min} - ${r.max}`) : [];

  return (
    <div className="w-full min-w-0 space-y-4 sm:space-y-6">
      {/* Page title */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 shrink-0 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30">
          <Truck size={20} />
        </div>
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-semibold text-slate-800 tracking-tight">Gali</h1>
          <p className="text-xs text-slate-600 leading-snug">Register Gali vehicles and check them daily.</p>
        </div>
      </div>

      {loadError && (
        <div className="flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm border bg-red-500/10 text-red-700 border-red-400/40 break-words">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span className="min-w-0">Could not load data: {loadError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
        {/* ---------------- Register vehicle ---------------- */}
        <section className={`${glass} min-w-0 rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4`}>
          <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <PlusCircle size={18} className="text-emerald-600 shrink-0" /> Register Gali Vehicle
          </h2>
          <form onSubmit={registerVehicle} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Vehicle number</label>
              <input
                type="text"
                value={newVehicle}
                onChange={(e) => setNewVehicle(e.target.value)}
                placeholder="e.g. NW CAB-1234"
                maxLength={20}
                autoComplete="off"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                className={inputClass}
              />
            </div>
            {renderNotice(registerNotice)}
            <button
              type="submit"
              disabled={registering || newVehicle.trim() === ""}
              className="w-full sm:w-auto min-h-[46px] sm:min-h-[44px] px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-semibold shadow-lg shadow-emerald-500/30 transition-all active:scale-[0.98] sm:hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 cursor-pointer inline-flex items-center justify-center gap-2"
            >
              {registering ? <Loader2 size={16} className="animate-spin" /> : <PlusCircle size={16} />}
              Register
            </button>
          </form>

          <div>
            <p className="text-xs font-semibold text-slate-700 mb-2">Registered vehicles ({vehicles.length})</p>
            {loading ? (
              <div className="h-8 w-40 rounded bg-white/60 animate-pulse" />
            ) : vehicles.length === 0 ? (
              <p className="text-xs text-slate-500">No vehicles registered yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-1">
                {vehicles.map((v) => (
                  <span
                    key={v.id}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold bg-white/70 border border-white/70 text-slate-700 break-all"
                  >
                    {v.vehicleNumber}
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ---------------- Daily check ---------------- */}
        {/* relative z-20: same as the Analytics cards, so the open dropdown is painted above everything below it */}
        <section className={`${glass} relative z-20 min-w-0 rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4`}>
          <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <ClipboardCheck size={18} className="text-blue-600 shrink-0" /> Daily Gali Check
          </h2>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Select vehicle</label>
            <GlassDropdown
              value={vehicleId}
              onChange={(id) => {
                setVehicleId(id);
                setCheckNotice(null);
              }}
              options={vehicles.map((v) => ({ id: v.id, label: v.vehicleNumber }))}
              placeholder="Select a registered vehicle"
            />
          </div>

          {/* One input per parameter the Manager added (name + range come from the database) */}
          {loading ? (
            <div className="h-20 rounded-xl bg-white/50 animate-pulse" />
          ) : !hasParams ? (
            <div className="rounded-xl border border-white/70 bg-white/50 px-4 py-3 text-sm text-slate-500">
              The Manager has not added any Gali parameters yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-3">
              {params.map((p) => (
                <div key={p.id} className="min-w-0">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {p.name}{" "}
                    <span className="font-normal text-slate-500">
                      (range {p.min} - {p.max}
                      {p.unit ? ` ${p.unit}` : ""})
                    </span>
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="any"
                    value={values[p.id] ?? ""}
                    onChange={(e) => setValue(p.id, e.target.value)}
                    placeholder={`Enter ${p.name} value`}
                    className={inputClass}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Automatic message */}
          {hasParams &&
            (!result ? (
              <div className="rounded-xl border border-white/70 bg-white/50 px-4 py-3 text-sm text-slate-500">
                Enter all the values to see the result.
              </div>
            ) : result.approved ? (
              <div className="rounded-xl border border-emerald-400/50 bg-emerald-500/10 px-4 py-3">
                <p className="text-base font-bold text-emerald-700 flex items-center gap-2">
                  <CheckCircle2 size={18} /> Approval
                </p>
                <p className="text-xs text-emerald-700/80 mt-0.5">All values are inside the allowed range.</p>
              </div>
            ) : (
              <div className="rounded-xl border border-red-400/50 bg-red-500/10 px-4 py-3">
                <p className="text-base font-bold text-red-700 flex items-center gap-2">
                  <XCircle size={18} /> Reject
                </p>
                <p className="text-xs text-red-700/80 mt-0.5 break-words">{outsideMessages.join(" | ")}</p>
              </div>
            ))}

          {renderNotice(checkNotice)}

          {/* Approval / Reject buttons - side by side on every screen */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => submitCheck("APPROVED")}
              disabled={!canApprove}
              className="min-h-[48px] rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-semibold shadow-lg shadow-emerald-500/30 transition-all active:scale-[0.98] sm:hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:active:scale-100 cursor-pointer inline-flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              Approval
            </button>
            <button
              type="button"
              onClick={() => submitCheck("REJECTED")}
              disabled={!canReject}
              className="min-h-[48px] rounded-xl bg-gradient-to-r from-rose-500 to-red-600 text-white text-sm font-semibold shadow-lg shadow-red-500/30 transition-all active:scale-[0.98] sm:hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:active:scale-100 cursor-pointer inline-flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
              Reject
            </button>
          </div>
        </section>
      </div>

      {/* ---------------- Recent checks ---------------- */}
      <section className={`${glass} min-w-0 rounded-2xl sm:rounded-3xl p-4 sm:p-6`}>
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-800">Recent Gali Checks</h2>
            <p className="text-xs text-slate-600">Showing this month&apos;s checks only. Newest first.</p>
          </div>
          {!loading && checks.length > 0 && (
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filter the checks">
              {filterChips.map((ch) => (
                <button
                  key={ch.key}
                  type="button"
                  aria-pressed={filter === ch.key}
                  onClick={() => {
                    setFilter(ch.key);
                    setPage(1);
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border cursor-pointer transition-all active:scale-[0.97] ${
                    filter === ch.key ? `${ch.on} shadow-md` : ch.off
                  }`}
                >
                  {ch.label}: {ch.count}
                </button>
              ))}
            </div>
          )}
        </div>

        {loading ? (
          <div className="h-16 rounded bg-white/50 animate-pulse" />
        ) : checks.length === 0 ? (
          <p className="text-sm text-slate-500">No checks recorded this month.</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-slate-500">No {filter === "APPROVED" ? "approved" : "rejected"} checks this month.</p>
        ) : (
          <>
            {/* Phones: one card per check (no sideways scrolling) */}
            <div className="md:hidden space-y-3">
              {paged.map((c) => {
                const byKey = new Map(readingsOf(c).map((r) => [keyOf(r.name), r]));
                return (
                  <div
                    key={c.id}
                    className={`rounded-2xl border bg-white/50 p-3.5 space-y-3 border-l-4 ${
                      c.decision === "APPROVED" ? "border-white/60 border-l-emerald-400" : "border-white/60 border-l-red-400"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 break-all">{c.vehicle.vehicleNumber}</p>
                        <p className="text-xs text-slate-600 mt-0.5">
                          {fmtDate(c.createdAt)} &middot; {fmtTime(c.createdAt)}
                        </p>
                      </div>
                      <DecisionBadge decision={c.decision} />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {columns
                        .filter((col) => byKey.has(col.key))
                        .map((col) => (
                          <div key={col.key} className="rounded-xl bg-white/60 border border-white/70 px-3 py-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 truncate">
                              {col.name}
                              {col.unit ? ` (${col.unit})` : ""}
                            </p>
                            <p className="text-base mt-0.5">
                              <ValueCell reading={byKey.get(col.key)} />
                            </p>
                          </div>
                        ))}
                    </div>

                    <p className="text-xs text-slate-600">
                      Checked by <span className="font-semibold text-slate-800 break-all">{c.checkedBy}</span>
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Tablet / desktop: table - one column per parameter */}
            <div className="hidden md:block rounded-2xl border border-white/60 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm" style={{ minWidth: 520 + columns.length * 90 }}>
                  <thead>
                    <tr className="text-[11px] uppercase tracking-wide text-slate-600">
                      <th className="sticky top-0 z-10 bg-white/80 backdrop-blur py-2.5 pl-4 pr-2 text-left font-semibold w-10">#</th>
                      <th className="sticky top-0 z-10 bg-white/80 backdrop-blur py-2.5 px-3 text-left font-semibold">Date</th>
                      <th className="sticky top-0 z-10 bg-white/80 backdrop-blur py-2.5 px-3 text-left font-semibold">Time</th>
                      <th className="sticky top-0 z-10 bg-white/80 backdrop-blur py-2.5 px-3 text-left font-semibold">Vehicle</th>
                      {columns.map((col) => (
                        <th key={col.key} className="sticky top-0 z-10 bg-white/80 backdrop-blur py-2.5 px-3 text-center font-semibold">
                          {col.name}
                          {col.unit && <span className="block text-[10px] font-normal normal-case text-slate-500">{col.unit}</span>}
                        </th>
                      ))}
                      <th className="sticky top-0 z-10 bg-white/80 backdrop-blur py-2.5 px-3 text-center font-semibold">Decision</th>
                      <th className="sticky top-0 z-10 bg-white/80 backdrop-blur py-2.5 pl-3 pr-4 text-left font-semibold">Checked by</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map((c, i) => {
                      const byKey = new Map(readingsOf(c).map((r) => [keyOf(r.name), r]));
                      return (
                        <tr key={c.id} className="border-t border-white/50 odd:bg-white/30 hover:bg-white/60 transition-colors text-slate-700">
                          <td className="py-2.5 pl-4 pr-2 text-xs text-slate-500">{start + i + 1}</td>
                          <td className="py-2.5 px-3 whitespace-nowrap">{fmtDate(c.createdAt)}</td>
                          <td className="py-2.5 px-3 whitespace-nowrap">{fmtTime(c.createdAt)}</td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900 whitespace-nowrap">{c.vehicle.vehicleNumber}</td>
                          {columns.map((col) => (
                            <td key={col.key} className="py-2.5 px-3 text-center">
                              <ValueCell reading={byKey.get(col.key)} />
                            </td>
                          ))}
                          <td className="py-2.5 px-3 text-center">
                            <DecisionBadge decision={c.decision} />
                          </td>
                          <td className="py-2.5 pl-3 pr-4 break-all">{c.checkedBy}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            <p className="hidden md:block text-[11px] text-slate-500 mt-2">
              Values in <span className="text-red-600 font-semibold">red</span> were outside the allowed range when the check was saved.
            </p>

            {/* Pagination: 3 checks per page */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-slate-600">
                Showing {start + 1}-{Math.min(start + PAGE_SIZE, filtered.length)} of {filtered.length}
              </p>
              {pageCount > 1 && (
                <nav aria-label="Pagination" className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPage(safePage - 1)}
                    disabled={safePage === 1}
                    aria-label="Previous page"
                    className="w-9 h-9 rounded-xl border border-white/70 bg-white/70 text-slate-700 flex items-center justify-center transition-all hover:bg-white active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white/70 disabled:active:scale-100"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  {pageNumbers.map((n, i) =>
                    n === -1 ? (
                      <span key={`gap-${i}`} className="px-1 text-slate-500">
                        &hellip;
                      </span>
                    ) : (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setPage(n)}
                        aria-current={n === safePage ? "page" : undefined}
                        className={`min-w-9 h-9 px-2 rounded-xl border text-sm font-semibold transition-all active:scale-95 cursor-pointer ${
                          n === safePage
                            ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/30"
                            : "bg-white/70 text-slate-700 border-white/70 hover:bg-white"
                        }`}
                      >
                        {n}
                      </button>
                    )
                  )}
                  <button
                    type="button"
                    onClick={() => setPage(safePage + 1)}
                    disabled={safePage === pageCount}
                    aria-label="Next page"
                    className="w-9 h-9 rounded-xl border border-white/70 bg-white/70 text-slate-700 flex items-center justify-center transition-all hover:bg-white active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white/70 disabled:active:scale-100"
                  >
                    <ChevronRight size={16} />
                  </button>
                </nav>
              )}
            </div>
          </>
        )}
      </section>

      {/* ---------------- Monthly PDF report ---------------- */}
      <GaliReport />
    </div>
  );
}