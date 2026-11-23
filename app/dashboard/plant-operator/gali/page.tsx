"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Truck, PlusCircle, CheckCircle2, XCircle, Loader2, ClipboardCheck, AlertCircle } from "lucide-react";
import { GALI_RANGES, evaluateGali, type GaliRangeSet } from "@/lib/galiRanges";
import GaliReport from "@/components/plant-operator/GaliReport";

// Shared "frosted glass" look (same as the other pages)
const glass =
  "bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_32px_rgba(15,23,42,0.10)] ring-1 ring-inset ring-white/40";

const inputClass =
  "w-full h-11 rounded-xl border border-white/70 bg-white/70 px-3 text-sm text-slate-800 " +
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

export default function GaliPage() {
  const [ranges, setRanges] = useState<GaliRangeSet>(GALI_RANGES);
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

  // Limits set by the Manager (falls back to the defaults if this fails)
  const loadRanges = useCallback(async () => {
    const { res, json } = await getJson("/api/plant-operator/gali/ranges");
    if (res.ok && json.success) setRanges(json.data);
  }, []);

  useEffect(() => {
    (async () => {
      // Each one on its own, so one failing does not block the other
      const results = await Promise.allSettled([loadVehicles(), loadChecks(), loadRanges()]);
      const failed = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
      if (failed.length > 0) {
        const msg = failed.map((f) => (f.reason instanceof Error ? f.reason.message : String(f.reason))).join(" | ");
        console.error("Gali load failed:", msg);
        setLoadError(msg);
      }
      setLoading(false);
    })();
  }, [loadVehicles, loadChecks, loadRanges]);

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

  // ---- Auto result for the ES / PH values ----
  const esNum = toNum(es);
  const phNum = toNum(ph);
  const bothFilled = !Number.isNaN(esNum) && !Number.isNaN(phNum);
  const result = useMemo(() => (bothFilled ? evaluateGali(esNum, phNum, ranges) : null), [bothFilled, esNum, phNum, ranges]);

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
        className={`flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm border ${
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
        <span>{notice.text}</span>
      </div>
    ) : null;

  return (
    <div className="w-full min-w-0 space-y-4 sm:space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30">
          <Truck size={20} />
        </div>
        <div>
          <h1 className="text-lg sm:text-xl font-semibold text-slate-800 tracking-tight">Gali</h1>
          <p className="text-xs text-slate-600">Register Gali vehicles and check them daily.</p>
        </div>
      </div>

      {loadError && (
        <div className="flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm border bg-red-500/10 text-red-700 border-red-400/40">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>Could not load data: {loadError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
        {/* ---------------- Register vehicle ---------------- */}
        <section className={`${glass} rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4`}>
          <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <PlusCircle size={18} className="text-emerald-600" /> Register Gali Vehicle
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
                className={inputClass}
              />
            </div>
            {renderNotice(registerNotice)}
            <button
              type="submit"
              disabled={registering || newVehicle.trim() === ""}
              className="w-full sm:w-auto min-h-[44px] px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-semibold shadow-lg shadow-emerald-500/30 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 cursor-pointer inline-flex items-center justify-center gap-2"
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
              <div className="flex flex-wrap gap-2">
                {vehicles.map((v) => (
                  <span
                    key={v.id}
                    className="px-3 py-1 rounded-full text-xs font-semibold bg-white/70 border border-white/70 text-slate-700"
                  >
                    {v.vehicleNumber}
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ---------------- Daily check ---------------- */}
        <section className={`${glass} rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4`}>
          <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <ClipboardCheck size={18} className="text-blue-600" /> Daily Gali Check
          </h2>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Select vehicle</label>
            <select
              value={vehicleId}
              onChange={(e) => {
                setVehicleId(e.target.value);
                setCheckNotice(null);
              }}
              className={inputClass}
            >
              <option value="">-- Select a registered vehicle --</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.vehicleNumber}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                ES <span className="font-normal text-slate-500">(range {ranges.ES.min} - {ranges.ES.max})</span>
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
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                PH <span className="font-normal text-slate-500">(range {ranges.PH.min} - {ranges.PH.max})</span>
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
              <p className="text-xs text-red-700/80 mt-0.5">
                {[
                  !result.esOk && `ES is outside ${ranges.ES.min} - ${ranges.ES.max}`,
                  !result.phOk && `PH is outside ${ranges.PH.min} - ${ranges.PH.max}`,
                ]
                  .filter(Boolean)
                  .join(" | ")}
              </p>
            </div>
          )}

          {renderNotice(checkNotice)}

          {/* Approval / Reject buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => submitCheck("APPROVED")}
              disabled={!canApprove}
              className="min-h-[46px] rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-semibold shadow-lg shadow-emerald-500/30 transition-all hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 cursor-pointer inline-flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              Approval
            </button>
            <button
              type="button"
              onClick={() => submitCheck("REJECTED")}
              disabled={!canReject}
              className="min-h-[46px] rounded-xl bg-gradient-to-r from-rose-500 to-red-600 text-white text-sm font-semibold shadow-lg shadow-red-500/30 transition-all hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 cursor-pointer inline-flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
              Reject
            </button>
          </div>
        </section>
      </div>

      {/* ---------------- Recent checks ---------------- */}
      <section className={`${glass} rounded-2xl sm:rounded-3xl p-4 sm:p-6`}>
        <h2 className="text-base font-semibold text-slate-800">Recent Gali Checks</h2>
        <p className="text-xs text-slate-600 mb-3">Showing this month's checks only.</p>
        {loading ? (
          <div className="h-16 rounded bg-white/50 animate-pulse" />
        ) : checks.length === 0 ? (
          <p className="text-sm text-slate-500">No checks recorded this month.</p>
        ) : (
          <div className="overflow-x-auto">
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
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                          c.decision === "APPROVED"
                            ? "bg-emerald-400/20 text-emerald-700 border-emerald-400/40"
                            : "bg-red-400/20 text-red-700 border-red-400/40"
                        }`}
                      >
                        {c.decision === "APPROVED" ? "Approved" : "Rejected"}
                      </span>
                    </td>
                    <td className="py-2">{c.checkedBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ---------------- Monthly PDF report ---------------- */}
      <GaliReport />
    </div>
  );
}