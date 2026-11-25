"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Truck, PlusCircle, CheckCircle2, XCircle, Loader2, ClipboardCheck, AlertCircle } from "lucide-react";
import { evaluateGaliParams, type GaliParam } from "@/lib/galiRanges";
import GaliReport from "@/components/plant-operator/GaliReport";
import GlassSelect from "@/components/plant-operator/GlassSelect";

// Shared "frosted glass" look (same as the other pages)
const glass =
  "bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_32px_rgba(15,23,42,0.10)] ring-1 ring-inset ring-white/40";

const inputClass =
  "w-full h-12 sm:h-11 rounded-xl border border-white/70 bg-white/70 px-3 text-base sm:text-sm text-slate-800 " +
  "placeholder:text-slate-400 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/40";

type Vehicle = { id: string; vehicleNumber: string };

type CheckValue = { name: string; unit?: string | null; min: number; max: number; value: number; ok: boolean };

type CheckRow = {
  id: string;
  esValue: number;
  phValue: number;
  values: CheckValue[] | null; // every parameter that was checked (older records only have ES / PH)
  inRange: boolean;
  decision: "APPROVED" | "REJECTED";
  checkedBy: string;
  createdAt: string;
  vehicle: { vehicleNumber: string };
};

type Notice = { type: "success" | "error"; text: string } | null;

const toNum = (v: string | undefined) => (v === undefined || v.trim() === "" ? NaN : Number(v));

// Safe JSON fetch: if the server sends an HTML error page instead of JSON, we say WHICH url failed
async function getJson<T>(url: string) {
  const res = await fetch(url, { cache: "no-store", credentials: "same-origin" });
  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`${url} returned ${res.status} (not JSON)`);
  }
  if (typeof json !== "object" || json === null) {
    throw new Error(`${url} returned ${res.status} (invalid JSON)`);
  }
  return { res, json: json as { success?: boolean; error?: string; data?: T } };
}

// What to show in the "Recent checks" table for one record
function checkedValues(c: CheckRow): CheckValue[] {
  if (Array.isArray(c.values) && c.values.length > 0) return c.values;
  return [
    { name: "ES", min: 0, max: 0, value: c.esValue, ok: c.inRange },
    { name: "PH", min: 0, max: 0, value: c.phValue, ok: c.inRange },
  ];
}

export default function GaliPage() {
  const [params, setParams] = useState<GaliParam[]>([]);
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
  const [values, setValues] = useState<Record<string, string>>({}); // parameterId -> typed value
  const [submitting, setSubmitting] = useState(false);
  const [checkNotice, setCheckNotice] = useState<Notice>(null);

  const loadVehicles = useCallback(async () => {
    const { res, json } = await getJson<Vehicle[]>("/api/plant-operator/gali/vehicles");
    if (res.ok && json.success) setVehicles(json.data ?? []);
    else throw new Error(json.error || `Vehicles failed (${res.status})`);
  }, []);

  const loadChecks = useCallback(async () => {
    const { res, json } = await getJson<CheckRow[]>("/api/plant-operator/gali/checks");
    if (res.ok && json.success) setChecks(json.data ?? []);
    else throw new Error(json.error || `Checks failed (${res.status})`);
  }, []);

  // The parameters + ranges the Manager added (Plant Operator > Gali Operator > Parameters & Ranges)
  const loadParams = useCallback(async () => {
    const { res, json } = await getJson<GaliParam[]>("/api/plant-operator/gali/parameters");
    if (res.ok && json.success) setParams(json.data ?? []);
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
    } catch (err: unknown) {
      setRegisterNotice({ type: "error", text: err instanceof Error ? err.message : "Failed to register vehicle" });
    } finally {
      setRegistering(false);
    }
  };

  // ---- Auto result for the typed values (all Manager parameters) ----
  const numeric = useMemo(() => {
    const out: Record<string, number> = {};
    params.forEach((p) => (out[p.id] = toNum(values[p.id])));
    return out;
  }, [params, values]);
  const allFilled = params.length > 0 && params.every((p) => !Number.isNaN(numeric[p.id]));
  const result = useMemo(() => (allFilled ? evaluateGaliParams(params, numeric) : null), [allFilled, params, numeric]);

  const canReject = !!vehicleId && !!result && !submitting;
  // Approval is only possible when EVERY value is inside its range
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
        body: JSON.stringify({ vehicleId, values, decision }),
      });
      const json = await res.json().catch(() => ({ error: `Server error (${res.status})` })) as {
        success?: boolean;
        error?: string;
      };
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to save the check");
      const plate = vehicles.find((v) => v.id === vehicleId)?.vehicleNumber ?? "Vehicle";
      setCheckNotice({
        type: "success",
        text: decision === "APPROVED" ? `${plate} approved.` : `${plate} rejected.`,
      });
      setValues({});
      await loadChecks();
    } catch (err: unknown) {
      setCheckNotice({ type: "error", text: err instanceof Error ? err.message : "Failed to save the check" });
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

  const vehicleOptions = useMemo(() => vehicles.map((v) => ({ id: v.id, label: v.vehicleNumber })), [vehicles]);

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
            <GlassSelect
              options={vehicleOptions}
              value={vehicleId}
              onChange={(id) => {
                setVehicleId(id);
                setCheckNotice(null);
              }}
              placeholder="-- Select a registered vehicle --"
              searchPlaceholder="Search vehicle number..."
              icon={Truck}
            />
          </div>

          {/* One box for every parameter the Manager added (name + range come from the Manager) */}
          {loading ? (
            <div className="h-16 rounded bg-white/50 animate-pulse" />
          ) : params.length === 0 ? (
            <div className="rounded-xl border border-white/70 bg-white/50 px-4 py-3 text-sm text-slate-500">
              The Manager has not added any Gali parameters yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {params.map((p) => {
                const n = numeric[p.id];
                const filled = !Number.isNaN(n);
                const outside = filled && (n < p.min || n > p.max);
                return (
                  <div key={p.id}>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      <span className="break-words">
                        {p.name}
                        {p.unit ? <span className="font-normal text-slate-500"> ({p.unit})</span> : null}
                      </span>
                      <span className="block sm:inline sm:ml-1 font-normal text-slate-500">
                        (range {p.min} - {p.max})
                      </span>
                    </label>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="any"
                      value={values[p.id] ?? ""}
                      onChange={(e) => {
                        setValues((prev) => ({ ...prev, [p.id]: e.target.value }));
                        setCheckNotice(null);
                      }}
                      placeholder={`Enter ${p.name} value`}
                      className={`${inputClass} ${outside ? "!border-red-400 focus:!ring-red-400/40" : ""}`}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {/* Automatic message */}
          {!result ? (
            <div className="rounded-xl border border-white/70 bg-white/50 px-4 py-3 text-sm text-slate-500">
              {params.length === 0 ? "No parameters to check." : "Enter all the values to see the result."}
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
              <p className="text-xs text-red-700/80 mt-0.5">
                {result.results
                  .filter((r) => !r.ok)
                  .map((r) => `${r.name} is outside ${r.min} - ${r.max}`)
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
              className="min-h-[48px] rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-semibold shadow-lg shadow-emerald-500/30 transition-all hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 cursor-pointer inline-flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              Approval
            </button>
            <button
              type="button"
              onClick={() => submitCheck("REJECTED")}
              disabled={!canReject}
              className="min-h-[48px] rounded-xl bg-gradient-to-r from-rose-500 to-red-600 text-white text-sm font-semibold shadow-lg shadow-red-500/30 transition-all hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 cursor-pointer inline-flex items-center justify-center gap-2"
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
        <p className="text-xs text-slate-600 mb-3">Showing this month&apos;s checks only.</p>
        {loading ? (
          <div className="h-16 rounded bg-white/50 animate-pulse" />
        ) : checks.length === 0 ? (
          <p className="text-sm text-slate-500">No checks recorded this month.</p>
        ) : (
          <>
            {/* Phones: one card per check */}
            <div className="md:hidden space-y-2.5">
              {checks.map((c) => (
                <div key={c.id} className="rounded-2xl border border-white/70 bg-white/50 p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{c.vehicle.vehicleNumber}</p>
                      <p className="text-[11px] text-slate-500">{new Date(c.createdAt).toLocaleString()}</p>
                    </div>
                    <span
                      className={`shrink-0 inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                        c.decision === "APPROVED"
                          ? "bg-emerald-400/20 text-emerald-700 border-emerald-400/40"
                          : "bg-red-400/20 text-red-700 border-red-400/40"
                      }`}
                    >
                      {c.decision === "APPROVED" ? "Approved" : "Rejected"}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {checkedValues(c).map((v) => (
                      <span
                        key={v.name}
                        className={`px-2 py-0.5 rounded-lg text-xs font-semibold border ${
                          v.ok ? "bg-white/70 border-white/70 text-slate-700" : "bg-red-400/15 border-red-400/40 text-red-700"
                        }`}
                      >
                        {v.name}: {v.value}
                      </span>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-500">By {c.checkedBy}</p>
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
                  <th className="py-2 pr-3 font-semibold">Values</th>
                  <th className="py-2 pr-3 font-semibold">Decision</th>
                  <th className="py-2 font-semibold">By</th>
                </tr>
              </thead>
              <tbody>
                {checks.map((c) => (
                  <tr key={c.id} className="border-b border-white/40 last:border-0 text-slate-700 align-top">
                    <td className="py-2 pr-3 whitespace-nowrap">{new Date(c.createdAt).toLocaleString()}</td>
                    <td className="py-2 pr-3 font-semibold">{c.vehicle.vehicleNumber}</td>
                    <td className="py-2 pr-3">
                      <div className="flex flex-wrap gap-1.5">
                        {checkedValues(c).map((v) => (
                          <span
                            key={v.name}
                            className={`px-2 py-0.5 rounded-lg text-xs font-semibold border whitespace-nowrap ${
                              v.ok
                                ? "bg-white/70 border-white/70 text-slate-700"
                                : "bg-red-400/15 border-red-400/40 text-red-700"
                            }`}
                          >
                            {v.name}: {v.value}
                          </span>
                        ))}
                      </div>
                    </td>
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
          </>
        )}
      </section>

      {/* ---------------- Monthly PDF report ---------------- */}
      <GaliReport />
    </div>
  );
}