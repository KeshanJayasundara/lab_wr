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
} from "lucide-react";
import { GALI_RANGES, evaluateGali } from "@/lib/galiRanges";
import GaliReport from "@/components/plant-operator/GaliReport";
import GlassSearchSelect, { type Option } from "@/components/plant-operator/GlassSearchSelect";

// Shared "frosted glass" look (same as the other pages)
const glass =
  "bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_32px_rgba(15,23,42,0.10)] ring-1 ring-inset ring-white/40";

// Phones: 16px text (stops the iOS zoom-on-focus) + 44px tap height. sm and up: compact.
const inputClass =
  "w-full min-h-[44px] sm:min-h-0 sm:h-11 rounded-xl border border-white/70 bg-white/70 px-3 text-base sm:text-sm text-slate-800 " +
  "placeholder:text-slate-400 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/40";

type Vehicle = { id: string; vehicleNumber: string };

type CheckRow = {
  id: string;
  esValue: number;
  phValue: number;
  inRange: boolean;
  decision: "APPROVED" | "REJECTED";
  checkedBy: string;
  createdAt: string;
  vehicle: { vehicleNumber: string };
};

type Notice = { type: "success" | "error"; text: string } | null;

const toNum = (v: string) => (v.trim() === "" ? NaN : Number(v));

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

function DecisionBadge({ decision }: { decision: "APPROVED" | "REJECTED" }) {
  return (
    <span
      className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border whitespace-nowrap ${
        decision === "APPROVED"
          ? "bg-emerald-400/20 text-emerald-700 border-emerald-400/40"
          : "bg-red-400/20 text-red-700 border-red-400/40"
      }`}
    >
      {decision === "APPROVED" ? "Approved" : "Rejected"}
    </span>
  );
}

export default function GaliPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [checks, setChecks] = useState<CheckRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Register vehicle
  const [newVehicle, setNewVehicle] = useState("");
  const [registering, setRegistering] = useState(false);
  const [registerNotice, setRegisterNotice] = useState<Notice>(null);

  // Daily check
  const [vehicleId, setVehicleId] = useState("");
  const [es, setEs] = useState("");
  const [ph, setPh] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [checkNotice, setCheckNotice] = useState<Notice>(null);

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

  useEffect(() => {
    (async () => {
      // Each one on its own, so one failing does not block the other
      const results = await Promise.allSettled([loadVehicles(), loadChecks()]);
      const failed = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
      if (failed.length > 0) {
        const msg = failed.map((f) => (f.reason instanceof Error ? f.reason.message : String(f.reason))).join(" | ");
        console.error("Gali load failed:", msg);
        setLoadError(msg);
      }
      setLoading(false);
    })();
  }, [loadVehicles, loadChecks]);

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

  const vehicleOptions = useMemo<Option[]>(
    () => vehicles.map((v) => ({ value: v.id, label: v.vehicleNumber })),
    [vehicles]
  );

  // ---- Auto result for the ES / PH values ----
  const esNum = toNum(es);
  const phNum = toNum(ph);
  const bothFilled = !Number.isNaN(esNum) && !Number.isNaN(phNum);
  const result = useMemo(() => (bothFilled ? evaluateGali(esNum, phNum) : null), [bothFilled, esNum, phNum]);

  const canReject = !!vehicleId && !!result && !submitting;
  // Approval is only possible when BOTH values are inside the range
  const canApprove = canReject && !!result?.approved;

  const submitCheck = async (decision: "APPROVED" | "REJECTED") => {
    if (submitting) return;
    if (decision === "APPROVED" ? !canApprove : !canReject) return;
    setSubmitting(true);
    setCheckNotice(null);
    try {
      const res = await fetch("/api/plant-operator/gali/checks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ vehicleId, es, ph, decision }),
      });
      const json = await res.json().catch(() => ({ error: `Server error (${res.status})` }));
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to save the check");
      const plate = vehicles.find((v) => v.id === vehicleId)?.vehicleNumber ?? "Vehicle";
      setCheckNotice({
        type: "success",
        text: decision === "APPROVED" ? `${plate} approved.` : `${plate} rejected.`,
      });
      setEs("");
      setPh("");
      await loadChecks();
    } catch (err: any) {
      setCheckNotice({ type: "error", text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

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
            <GlassSearchSelect
              value={vehicleId}
              onChange={(v) => {
                setVehicleId(v);
                setCheckNotice(null);
              }}
              options={vehicleOptions}
              placeholder="-- Select a registered vehicle --"
              searchPlaceholder="Search vehicle number..."
              emptyText={vehicles.length === 0 ? "No vehicles registered yet" : "No vehicle matches your search"}
            />
          </div>

          <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-3">
            <div className="min-w-0">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                ES <span className="font-normal text-slate-500">(range {GALI_RANGES.ES.min} - {GALI_RANGES.ES.max})</span>
              </label>
              <input
                type="number"
                inputMode="decimal"
                step="any"
                value={es}
                onChange={(e) => {
                  setEs(e.target.value);
                  setCheckNotice(null);
                }}
                placeholder="Enter ES value"
                className={inputClass}
              />
            </div>
            <div className="min-w-0">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                PH <span className="font-normal text-slate-500">(range {GALI_RANGES.PH.min} - {GALI_RANGES.PH.max})</span>
              </label>
              <input
                type="number"
                inputMode="decimal"
                step="any"
                value={ph}
                onChange={(e) => {
                  setPh(e.target.value);
                  setCheckNotice(null);
                }}
                placeholder="Enter PH value"
                className={inputClass}
              />
            </div>
          </div>

          {/* Automatic message */}
          {!result ? (
            <div className="rounded-xl border border-white/70 bg-white/50 px-4 py-3 text-sm text-slate-500">
              Enter both ES and PH values to see the result.
            </div>
          ) : result.approved ? (
            <div className="rounded-xl border border-emerald-400/50 bg-emerald-500/10 px-4 py-3">
              <p className="text-base font-bold text-emerald-700 flex items-center gap-2">
                <CheckCircle2 size={18} /> Approval
              </p>
              <p className="text-xs text-emerald-700/80 mt-0.5">ES and PH are inside the allowed range.</p>
            </div>
          ) : (
            <div className="rounded-xl border border-red-400/50 bg-red-500/10 px-4 py-3">
              <p className="text-base font-bold text-red-700 flex items-center gap-2">
                <XCircle size={18} /> Reject
              </p>
              <p className="text-xs text-red-700/80 mt-0.5 break-words">
                {[
                  !result.esOk && `ES is outside ${GALI_RANGES.ES.min} - ${GALI_RANGES.ES.max}`,
                  !result.phOk && `PH is outside ${GALI_RANGES.PH.min} - ${GALI_RANGES.PH.max}`,
                ]
                  .filter(Boolean)
                  .join(" | ")}
              </p>
            </div>
          )}

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
        <h2 className="text-base font-semibold text-slate-800">Recent Gali Checks</h2>
        <p className="text-xs text-slate-600 mb-3">Showing this month&apos;s checks only.</p>
        {loading ? (
          <div className="h-16 rounded bg-white/50 animate-pulse" />
        ) : checks.length === 0 ? (
          <p className="text-sm text-slate-500">No checks recorded this month.</p>
        ) : (
          <>
            {/* Phones: one card per check (no sideways scrolling) */}
            <div className="md:hidden space-y-3">
              {checks.map((c) => (
                <div
                  key={c.id}
                  className={`rounded-2xl border bg-white/50 p-3.5 space-y-2.5 border-l-4 ${
                    c.decision === "APPROVED" ? "border-white/60 border-l-emerald-400" : "border-white/60 border-l-red-400"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold text-slate-900 break-all">{c.vehicle.vehicleNumber}</p>
                    <DecisionBadge decision={c.decision} />
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">ES</p>
                      <p className="mt-0.5 text-slate-800 font-semibold">{c.esValue}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">PH</p>
                      <p className="mt-0.5 text-slate-800 font-semibold">{c.phValue}</p>
                    </div>
                    <div className="col-span-2 min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Date / Time</p>
                      <p className="mt-0.5 text-slate-700">{new Date(c.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="col-span-2 min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Checked by</p>
                      <p className="mt-0.5 text-slate-700 break-all">{c.checkedBy}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Tablet / desktop: table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm min-w-[560px]">
                <thead>
                  <tr className="text-left text-xs text-slate-600 border-b border-white/60">
                    <th className="py-2 pr-3 font-semibold">Date / Time</th>
                    <th className="py-2 pr-3 font-semibold">Vehicle</th>
                    <th className="py-2 pr-3 font-semibold">ES</th>
                    <th className="py-2 pr-3 font-semibold">PH</th>
                    <th className="py-2 pr-3 font-semibold">Decision</th>
                    <th className="py-2 font-semibold">By</th>
                  </tr>
                </thead>
                <tbody>
                  {checks.map((c) => (
                    <tr key={c.id} className="border-b border-white/40 last:border-0 text-slate-700">
                      <td className="py-2 pr-3 whitespace-nowrap">{new Date(c.createdAt).toLocaleString()}</td>
                      <td className="py-2 pr-3 font-semibold">{c.vehicle.vehicleNumber}</td>
                      <td className="py-2 pr-3">{c.esValue}</td>
                      <td className="py-2 pr-3">{c.phValue}</td>
                      <td className="py-2 pr-3">
                        <DecisionBadge decision={c.decision} />
                      </td>
                      <td className="py-2 break-all">{c.checkedBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {/* ---------------- Monthly PDF report ---------------- */}
      <GaliReport />
    </div>
  );
}