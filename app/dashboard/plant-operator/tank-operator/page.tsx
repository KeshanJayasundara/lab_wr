"use client";

import React, { useCallback, useEffect, useState } from "react";
import { GlassDropdown } from "@/components/manager/plant/ui"; // same dropdown as the Manager "Analytics & Trends" page
import { AlertCircle, CalendarCheck, CheckCircle2, Clock, Droplets, Loader2, Lock, PlayCircle, Save } from "lucide-react";

const glass =
  "bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_32px_rgba(15,23,42,0.10)] ring-1 ring-inset ring-white/40";
const inputClass =
  "w-full h-12 sm:h-11 rounded-xl border border-white/70 bg-white/70 px-3 text-base sm:text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/40";

type Param = { id: string; name: string; unit: string | null; min: number | null; max: number | null; checkMode: "SINGLE" | "IN_OUT"; frequency: "SHIFT" | "DAILY" };
type Tank = { id: string; name: string; parameters: Param[] };
type Shift = {
  shiftNo: number; label: string; startTime: string; endTime: string;
  status: "RUNNING" | "CLOSED" | "UPCOMING";
};
type Reading = {
  tankId: string; date: string; shiftNo: number;
  values: Record<string, number>; valuesOut: Record<string, number> | null; recordedBy: string;
};
type Data = { date: string; today: string; shifts: Shift[]; operatorName: string; tanks: Tank[]; readings: Reading[] };
type Notice = { type: "success" | "error"; text: string } | null;

const outOfRange = (p: Param, v: number) => (p.min !== null && v < p.min) || (p.max !== null && v > p.max);

export default function TankOperatorPage() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [tankId, setTankId] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [valuesOut, setValuesOut] = useState<Record<string, string>>({});
  const [signName, setSignName] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/plant-operator/tank", { cache: "no-store", credentials: "same-origin" });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || `Error ${res.status}`);
      setData(json.data);
      setError("");
      setTankId((t) => t || json.data.tanks[0]?.id || "");
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed to load tank data"); }
  }, []);

  // Load now, then every 20 seconds so the shift blocks open / close automatically
  useEffect(() => {
    const initialLoad = window.setTimeout(() => { void load(); }, 0);
    const t = setInterval(load, 20000);
    return () => {
      window.clearTimeout(initialLoad);
      clearInterval(t);
    };
  }, [load]);

  // The shift that is open right now
  const activeShift = data?.shifts.find((s) => s.status === "RUNNING") ?? null;
  const tank = data?.tanks.find((t) => t.id === tankId);
  // Every parameter has its own settings: "once a day" parameters are always open, "every shift" ones only while a shift is running
  const isOpen = (p: Param) => p.frequency === "DAILY" || !!activeShift;
  const openParams = tank?.parameters.filter(isOpen) ?? [];
  const lockedCount = (tank?.parameters.length ?? 0) - openParams.length;
  const tankOpen = openParams.length > 0;
  const existingShift = data && tank && activeShift
    ? data.readings.find((r) => r.tankId === tank.id && r.shiftNo === activeShift.shiftNo && r.date === data.date) : undefined;
  const existingDay = data && tank ? data.readings.find((r) => r.tankId === tank.id && r.shiftNo === 0 && r.date === data.today) : undefined;
  const existingFor = (p: Param) => (p.frequency === "DAILY" ? existingDay : existingShift);

  // Pre-fill only when the tank / shift / saved values really change (not on every refresh)
  const fillKey = `${tankId}|${activeShift?.shiftNo ?? ""}|${JSON.stringify([existingShift?.values, existingShift?.valuesOut, existingDay?.values, existingDay?.valuesOut])}`;
  useEffect(() => {
    if (!tank) return;
    const fillTimer = window.setTimeout(() => {
      const next: Record<string, string> = {};
      const nextOut: Record<string, string> = {};
      tank.parameters.forEach((p) => {
        const ex = existingFor(p);
        const v = ex?.values?.[p.id];
        next[p.id] = v === undefined ? "" : String(v);
        const o = ex?.valuesOut?.[p.id];
        nextOut[p.id] = o === undefined || o === null ? "" : String(o);
      });
      setValues(next);
      setValuesOut(nextOut);
    }, 0);
    return () => window.clearTimeout(fillTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fillKey]);

  const isNum = (v: string | undefined) => v !== undefined && v.trim() !== "" && Number.isFinite(Number(v));
  const allFilled = openParams.length > 0 && openParams.every((p) => isNum(values[p.id]) && (p.checkMode !== "IN_OUT" || isNum(valuesOut[p.id])));
  const canSubmit = tankOpen && allFilled && signName.trim() !== "" && !saving;

  const save = async () => {
    if (!tank || !canSubmit) return;
    setSaving(true); setNotice(null);
    try {
      const res = await fetch("/api/plant-operator/tank", {
        method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tankId: tank.id, shiftNo: activeShift?.shiftNo, signName,
          values: Object.fromEntries(openParams.map((p) => [p.id, values[p.id]])),
          valuesOut: Object.fromEntries(openParams.filter((p) => p.checkMode === "IN_OUT").map((p) => [p.id, valuesOut[p.id]])),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to save");
      setNotice({ type: "success", text: `${tank.name} - reading saved.` });
      setSignName("");
      await load();
    } catch (e: unknown) { setNotice({ type: "error", text: e instanceof Error ? e.message : "Failed to save" }); await load(); }
    finally { setSaving(false); }
  };

  const badge = (s: Shift) => {
    if (s.status === "RUNNING") return { text: "Running now", cls: "bg-emerald-400/20 text-emerald-700 border-emerald-400/50", Icon: PlayCircle };
    if (s.status === "CLOSED") return { text: "Closed", cls: "bg-slate-400/20 text-slate-600 border-slate-400/40", Icon: Lock };
    return { text: "Not started", cls: "bg-amber-400/20 text-amber-700 border-amber-400/50", Icon: Clock };
  };

  // one input box (with its range warning)
  const box = (p: Param, label: string, val: string | undefined, onChange: (v: string) => void) => {
    const n = Number(val);
    const bad = val !== undefined && val.trim() !== "" && Number.isFinite(n) && outOfRange(p, n);
    return (
      <div>
        <label className="block text-[11px] font-semibold text-slate-600 mb-1">{label}</label>
        <input type="number" inputMode="decimal" step="any" className={`${inputClass} ${bad ? "border-red-400 ring-2 ring-red-400/30" : ""}`}
          value={val ?? ""} onChange={(e) => { onChange(e.target.value); setNotice(null); }} />
        {bad && <p className="text-[11px] text-red-600 mt-1">Outside the allowed range</p>}
      </div>
    );
  };
  // one parameter: a single value box, or an In box + an Out box for In & Out parameters
  const paramRow = (p: Param) => (
    <div key={p.id} className="rounded-2xl bg-white/40 border border-white/60 p-3 space-y-2">
      <p className="text-sm font-semibold text-slate-800">
        {p.name}{p.unit ? ` (${p.unit})` : ""}
        {(p.min !== null || p.max !== null) && <span className="font-normal text-xs text-slate-500"> range {p.min ?? "-"} - {p.max ?? "-"}</span>}
        <span className="ml-2 text-[10px] font-semibold text-blue-700">{p.checkMode === "IN_OUT" ? "In & Out" : "Single"} - {p.frequency === "DAILY" ? "once a day" : "every shift"}</span>
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {box(p, p.checkMode === "IN_OUT" ? "In" : "Value", values[p.id], (v) => setValues({ ...values, [p.id]: v }))}
        {p.checkMode === "IN_OUT" && box(p, "Out", valuesOut[p.id], (v) => setValuesOut({ ...valuesOut, [p.id]: v }))}
      </div>
    </div>
  );

  const shiftTanks = data?.tanks.filter((t) => t.parameters.some((p) => p.frequency !== "DAILY")) ?? [];
  const dailyTanks = data?.tanks.filter((t) => t.parameters.some((p) => p.frequency === "DAILY")) ?? [];

  return (
    <div className="w-full min-w-0 space-y-4 sm:space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30"><Droplets size={20} /></div>
        <div>
          <h1 className="text-lg sm:text-xl font-semibold text-slate-800 tracking-tight">Tank Operator</h1>
          <p className="text-xs text-slate-600">Enter the tank readings. &quot;Every shift&quot; parameters open and close automatically by time; &quot;once a day&quot; parameters stay open all day.</p>
        </div>
      </div>

      {error && <div className="flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm border bg-red-500/10 text-red-700 border-red-400/40"><AlertCircle size={16} className="mt-0.5" />{error}</div>}
      {!data && !error && <div className="h-32 rounded-2xl bg-white/50 animate-pulse" />}

      {data && (
        <>
          {/* ---- the 3 shift blocks ---- */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
            {data.shifts.map((s) => {
              const b = badge(s);
              const open = s.status === "RUNNING";
              const done = data.readings.filter((r) => r.shiftNo === s.shiftNo && r.date === data.date && shiftTanks.some((t) => t.id === r.tankId)).length;
              return (
                <div key={s.shiftNo} className={`${glass} rounded-2xl p-4 space-y-2 ${open ? "ring-2 ring-emerald-400/60" : "opacity-75"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{s.label}</p>
                      <p className="text-xs text-slate-600">{s.startTime} - {s.endTime}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${b.cls}`}><b.Icon size={12} />{b.text}</span>
                  </div>
                  {shiftTanks.length > 0 && <p className="text-xs text-slate-600">{done}/{shiftTanks.length} tanks recorded</p>}
                  {s.status === "CLOSED" && <p className="text-[11px] text-slate-500 flex items-center gap-1"><Lock size={11} /> Time is over. If data is missing, ask the manager to add it.</p>}
                  {s.status === "UPCOMING" && <p className="text-[11px] text-slate-500 flex items-center gap-1"><Lock size={11} /> Opens at {s.startTime}.</p>}
                </div>
              );
            })}
          </div>

          {/* ---- once-a-day tanks (no shift) ---- */}
          {dailyTanks.length > 0 && (
            <div className={`${glass} rounded-2xl p-4 flex items-center justify-between gap-3 ring-2 ring-sky-400/40`}>
              <div className="flex items-center gap-3 min-w-0">
                <CalendarCheck size={20} className="text-sky-600 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800">Once-a-day parameters</p>
                  <p className="text-xs text-slate-600">Open all day - no shift needed.</p>
                </div>
              </div>
              <p className="text-xs font-semibold text-slate-700 shrink-0">
                {data.readings.filter((r) => r.shiftNo === 0 && r.date === data.today && dailyTanks.some((t) => t.id === r.tankId)).length}/{dailyTanks.length} recorded today
              </p>
            </div>
          )}

          {data.tanks.length === 0 && <section className={`${glass} rounded-2xl p-6 text-sm text-slate-600`}>No tanks have been set up yet. Ask the manager to add tanks and parameters.</section>}

          {/* ---- entry form ---- */}
          {data.tanks.length > 0 && (
            <section className={`${glass} rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4`}>
              <h2 className="text-base font-semibold text-slate-800">
                {activeShift ? `${activeShift.label} - enter readings` : "Enter readings"}
              </h2>
              <div className="sm:w-1/2">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Tank</label>
                <GlassDropdown
                  value={tankId}
                  onChange={(id) => { setTankId(id); setNotice(null); }}
                  options={data.tanks.map((t) => ({ id: t.id, label: t.name, sub: `${t.parameters.length} parameter${t.parameters.length === 1 ? "" : "s"}` }))}
                  placeholder="Select a tank"
                />
              </div>

              {!tankOpen ? (
                <div className="rounded-xl border border-white/70 bg-white/50 px-4 py-3 text-sm text-slate-600 flex items-start gap-2">
                  <Lock size={16} className="mt-0.5 shrink-0" />
                  <span>{tank && tank.parameters.length === 0 ? "This tank has no parameters yet. Ask the manager to add them." : "No shift is open right now. The parameters of this tank are checked every shift, so you can enter data only while a shift is running."}</span>
                </div>
              ) : (
                <>
                  {(existingShift || existingDay) && <p className="text-xs text-emerald-700 bg-emerald-500/10 border border-emerald-400/40 rounded-xl px-3 py-2">Some values are already recorded. Saving again will correct them.</p>}
                  {lockedCount > 0 && <p className="text-xs text-slate-600 flex items-start gap-1.5"><Lock size={12} className="mt-0.5 shrink-0" />{lockedCount} &quot;every shift&quot; parameter{lockedCount === 1 ? " is" : "s are"} locked until a shift starts.</p>}
                  <div className="space-y-3">{openParams.map(paramRow)}</div>

                  <div className="sm:w-1/2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Type your name to submit <span className="text-red-600">*</span></label>
                    <input type="text" className={inputClass} value={signName} onChange={(e) => { setSignName(e.target.value); setNotice(null); }} placeholder="Your full name" autoComplete="off" />
                  </div>

                  {notice && (
                    <div className={`flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm border ${notice.type === "success" ? "bg-emerald-500/10 text-emerald-700 border-emerald-400/40" : "bg-red-500/10 text-red-700 border-red-400/40"}`}>
                      {notice.type === "success" ? <CheckCircle2 size={16} className="mt-0.5" /> : <AlertCircle size={16} className="mt-0.5" />}{notice.text}
                    </div>
                  )}

                  <button type="button" onClick={save} disabled={!canSubmit}
                    className="w-full sm:w-auto min-h-[48px] px-6 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-white text-sm font-semibold shadow-lg shadow-blue-500/30 transition-all hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 cursor-pointer inline-flex items-center justify-center gap-2">
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Submit reading
                  </button>
                </>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}