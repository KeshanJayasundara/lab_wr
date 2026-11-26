"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  AlertCircle, ArrowLeftRight, CalendarClock, CheckCircle2, Clock, Droplets, Layers, Loader2, Lock, PenLine, PlayCircle, Save,
} from "lucide-react";
import { GlassDropdown } from "@/components/manager/plant/ui"; // same dropdown as the Manager "Analytics & Trends" page

const glass =
  "bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_32px_rgba(15,23,42,0.10)] ring-1 ring-inset ring-white/40";
// Desktop columns shared by the heading row and every parameter row: Parameter | Reading
const COLS = "lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)]";
const inputClass =
  "w-full h-11 rounded-xl border border-white/70 bg-white/70 px-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/40 disabled:opacity-50 disabled:cursor-not-allowed";
const noSpin = "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

// Each parameter has its OWN settings, set by the Manager (Plant Operator -> Tank Operator -> Tanks & Parameters):
//   checkMode: SINGLE = one value, IN_OUT = an In value and an Out value
//   frequency: SHIFT  = every shift (only while a shift is running), DAILY = once a day (any time today, no shift)
type CheckMode = "SINGLE" | "IN_OUT";
type Frequency = "SHIFT" | "DAILY";
type Param = {
  id: string; name: string; unit: string | null; min: number | null; max: number | null;
  checkMode: CheckMode; frequency: Frequency;
};
type Tank = { id: string; name: string; parameters: Param[] };
type Shift = {
  shiftNo: number; label: string; startTime: string; endTime: string;
  status: "RUNNING" | "CLOSED" | "UPCOMING";
};
// shiftNo 0 = the "once a day" row of that date
type Reading = {
  tankId: string; date: string; shiftNo: number;
  values: Record<string, number>; valuesOut: Record<string, number> | null; recordedBy: string;
};
type Data = { date: string; today: string; shifts: Shift[]; operatorName: string; tanks: Tank[]; readings: Reading[] };
type Notice = { type: "success" | "error"; text: string } | null;
type Draft = { inn: Record<string, string>; out: Record<string, string> };

const emptyDraft: Draft = { inn: {}, out: {} };
const isInOut = (p: Param) => p.checkMode === "IN_OUT";
const isDaily = (p: Param) => p.frequency === "DAILY";
const isNum = (v: string) => v.trim() !== "" && Number.isFinite(Number(v));
const outOfRange = (p: Param, v: number) => (p.min !== null && v < p.min) || (p.max !== null && v > p.max);
const rangeLabel = (p: Param) =>
  p.min !== null && p.max !== null ? `${p.min} - ${p.max}` : p.min !== null ? `Min ${p.min}` : p.max !== null ? `Max ${p.max}` : "";
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;


// Small "In" / "Out" tag inside the box (left) and the unit (right)
const Tag = ({ children }: { children: React.ReactNode }) => (
  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase tracking-wider text-sky-600">{children}</span>
);
const UnitTag = ({ unit }: { unit: string | null }) =>
  unit ? <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 max-w-[4.5rem] truncate text-[11px] font-medium text-slate-400">{unit}</span> : null;

export default function TankOperatorPage() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [tankId, setTankId] = useState("");
  // Only what the operator has typed. Everything else is shown from the saved readings,
  // so the 20-second refresh can never wipe a half-typed value.
  const [draft, setDraft] = useState<Draft>(emptyDraft);
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
    } catch (e: any) { setError(e.message); }
  }, []);

  // Load now, then every 20 seconds so the shift blocks open / close automatically
  useEffect(() => {
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [load]);

  const activeShift = data?.shifts.find((s) => s.status === "RUNNING") ?? null;
  const tank = data?.tanks.find((t) => t.id === tankId);

  // Saved rows of the chosen tank: this shift (on the shift's day) and today's "once a day" row
  const shiftRow = data && activeShift
    ? data.readings.find((r) => r.tankId === tankId && r.date === data.date && r.shiftNo === activeShift.shiftNo)
    : undefined;
  const dayRow = data ? data.readings.find((r) => r.tankId === tankId && r.date === data.today && r.shiftNo === 0) : undefined;
  const rowOf = (p: Param) => (isDaily(p) ? dayRow : shiftRow);

  const savedIn = (p: Param) => { const v = rowOf(p)?.values?.[p.id]; return v === undefined || v === null ? "" : String(v); };
  const savedOut = (p: Param) => { const v = rowOf(p)?.valuesOut?.[p.id]; return v === undefined || v === null ? "" : String(v); };
  const inVal = (p: Param) => draft.inn[p.id] ?? savedIn(p);
  const outVal = (p: Param) => draft.out[p.id] ?? savedOut(p);

  // A parameter that already has a saved value is write-once: the operator can't add it again or edit it (the manager can).
  const isSaved = (p: Param) => savedIn(p) !== "" && (!isInOut(p) || savedOut(p) !== "");
  // A "once a day" parameter is open any time today. An "every shift" parameter is open only while a shift is running.
  // Either way it closes as soon as it has been saved.
  const closedByTime = (p: Param) => !isDaily(p) && !activeShift;
  const locked = (p: Param) => closedByTime(p) || isSaved(p);
  const isDirty = (p: Param) => inVal(p) !== savedIn(p) || (isInOut(p) && outVal(p) !== savedOut(p));
  const isStarted = (p: Param) => inVal(p).trim() !== "" || (isInOut(p) && outVal(p).trim() !== "");
  const isComplete = (p: Param) => isNum(inVal(p)) && (!isInOut(p) || isNum(outVal(p)));

  const params = tank?.parameters ?? [];
  const open = params.filter((p) => !locked(p));
  const toSend = open.filter((p) => isDirty(p) && isComplete(p));
  const incomplete = open.filter((p) => isStarted(p) && !isComplete(p));
  // Any name can be typed - it only has to be filled in. It is saved as "recorded by".
  const nameTyped = signName.trim() !== "";
  const canSubmit = toSend.length > 0 && incomplete.length === 0 && nameTyped && !saving;

  const setIn = (p: Param, v: string) => { setDraft((d) => ({ ...d, inn: { ...d.inn, [p.id]: v } })); setNotice(null); };
  const setOut = (p: Param, v: string) => { setDraft((d) => ({ ...d, out: { ...d.out, [p.id]: v } })); setNotice(null); };
  const pickTank = (id: string) => { setTankId(id); setDraft(emptyDraft); setNotice(null); };

  const save = async () => {
    if (!tank || !canSubmit) return;
    setSaving(true); setNotice(null);
    try {
      const values: Record<string, string> = {};
      const valuesOut: Record<string, string> = {};
      toSend.forEach((p) => {
        values[p.id] = inVal(p);
        if (isInOut(p)) valuesOut[p.id] = outVal(p);
      });
      const res = await fetch("/api/plant-operator/tank", {
        method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tankId: tank.id, shiftNo: activeShift?.shiftNo, values, valuesOut, signName }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to save");
      setNotice({ type: "success", text: `${tank.name} - ${plural(toSend.length, "reading")} saved.` });
      setSignName("");
      setDraft(emptyDraft); // the saved values are shown from the server now
      await load();
    } catch (e: any) { setNotice({ type: "error", text: e.message }); await load(); }
    finally { setSaving(false); }
  };

  const badge = (s: Shift) => {
    if (s.status === "RUNNING") return { text: "Running", cls: "bg-emerald-500/15 text-emerald-700 border-emerald-400/50", Icon: PlayCircle };
    if (s.status === "CLOSED") return { text: "Closed", cls: "bg-slate-400/20 text-slate-600 border-slate-400/40", Icon: Lock };
    return { text: "Not started", cls: "bg-amber-400/20 text-amber-700 border-amber-400/50", Icon: Clock };
  };

  const shiftParams = params.filter((p) => !isDaily(p));
  const dailyParams = params.filter(isDaily);
  const savedCount = (list: Param[]) => list.filter(isSaved).length;
  const shiftTankCount = data ? data.tanks.filter((t) => t.parameters.some((p) => !isDaily(p))).length : 0;
  // Tanks that have "once a day" parameters, and how many of them already have today's row
  const dailyTankCount = data ? data.tanks.filter((t) => t.parameters.some(isDaily)).length : 0;
  const dailyDone = data ? data.readings.filter((r) => r.date === data.today && r.shiftNo === 0).length : 0;
  const dailyPct = dailyTankCount ? Math.min(100, Math.round((dailyDone / dailyTankCount) * 100)) : 0;

  // One parameter = one row: name / type / range on the left, the box(es) on the right.
  // The right side is always the same width: a Single value is ONE box that fills it, In & Out is TWO equal boxes.
  const renderParam = (p: Param) => {
    const dis = locked(p);
    const inOut = isInOut(p);
    const badIn = isNum(inVal(p)) && outOfRange(p, Number(inVal(p)));
    const badOut = inOut && isNum(outVal(p)) && outOfRange(p, Number(outVal(p)));
    const half = isStarted(p) && !isComplete(p);
    const saved = isSaved(p);
    const box = (bad: boolean, empty: boolean) =>
      `h-11 w-full min-w-0 rounded-xl border bg-white/80 pr-14 text-sm font-semibold tabular-nums text-slate-800 outline-none transition placeholder:text-slate-300 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/40 disabled:cursor-not-allowed disabled:bg-white/40 ${noSpin} ${
        bad ? "border-red-400 ring-2 ring-red-400/30" : half && empty ? "border-amber-400 ring-2 ring-amber-400/30" : "border-white/80"
      }`;
    return (
      <div key={p.id} className={`grid grid-cols-1 ${COLS} gap-x-6 gap-y-3 items-center px-4 py-3.5 ${dis && !saved ? "opacity-60" : ""}`}>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-sm font-semibold text-slate-800 break-words">{p.name}</span>
            {saved && <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700"><Lock size={11} /> Saved - locked</span>}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold bg-sky-500/10 border border-sky-400/40 text-sky-700">
              <ArrowLeftRight size={10} />{inOut ? "In & Out" : "Single value"}
            </span>
            <span>{rangeLabel(p) ? `Allowed: ${rangeLabel(p)}` : "No range set"}</span>
          </div>
        </div>

        <div className="min-w-0">
          <div className={`grid ${inOut ? "grid-cols-2" : "grid-cols-1"} gap-3`}>
            <div className="relative min-w-0">
              {inOut && <Tag>In</Tag>}
              <input type="number" inputMode="decimal" step="any" disabled={dis} aria-label={inOut ? `${p.name} In value` : p.name}
                className={`${box(badIn, inVal(p).trim() === "")} ${inOut ? "pl-10" : "pl-3.5"}`}
                value={inVal(p)} onChange={(e) => setIn(p, e.target.value)} />
              <UnitTag unit={p.unit} />
            </div>
            {inOut && (
              <div className="relative min-w-0">
                <Tag>Out</Tag>
                <input type="number" inputMode="decimal" step="any" disabled={dis} aria-label={`${p.name} Out value`}
                  className={`${box(badOut, outVal(p).trim() === "")} pl-11`}
                  value={outVal(p)} onChange={(e) => setOut(p, e.target.value)} />
                <UnitTag unit={p.unit} />
              </div>
            )}
          </div>
          {(badIn || badOut || half) && (
            <p className={`mt-1.5 text-[11px] font-medium ${half ? "text-amber-700" : "text-red-600"}`}>
              {half ? "Enter both the In and the Out value." : "Outside the allowed range - check the reading."}
            </p>
          )}
        </div>
      </div>
    );
  };

  // A group of parameters (Every shift / Once a day) as one card: header with progress, then the rows
  const renderGroup = (opts: {
    icon: React.ReactNode; title: string; sub: string; list: Param[]; lockedMsg?: string; savedBy?: string;
  }) => {
    const done = savedCount(opts.list);
    const pct = Math.round((done / opts.list.length) * 100);
    return (
      <div className="rounded-2xl bg-white/45 border border-white/70 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-white/50 border-b border-white/70">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 shrink-0 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/30">{opts.icon}</div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800">{opts.title}</p>
              <p className="text-[11px] text-slate-500">{opts.sub}</p>
            </div>
          </div>
          <div className="w-full sm:w-40">
            <div className="flex justify-between text-[11px] font-semibold text-slate-600 mb-1"><span>Saved</span><span>{done}/{opts.list.length}</span></div>
            <div className="h-1.5 rounded-full bg-slate-300/40 overflow-hidden"><div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${pct}%` }} /></div>
          </div>
        </div>
        {opts.lockedMsg && (
          <p className="flex items-start gap-2 text-xs text-slate-600 bg-amber-400/10 border-b border-amber-300/40 px-4 py-2.5"><Lock size={14} className="mt-0.5 shrink-0 text-amber-600" /><span>{opts.lockedMsg}</span></p>
        )}
        {opts.savedBy && (
          <p className="flex items-start gap-2 text-xs text-emerald-800 bg-emerald-500/10 border-b border-emerald-300/40 px-4 py-2.5"><CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-600" /><span>Last saved by {opts.savedBy}. Saved readings can't be changed here - ask the manager for a correction.</span></p>
        )}
        <div className={`hidden lg:grid ${COLS} gap-x-6 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 bg-white/30 border-b border-white/70`}>
          <span>Parameter</span><span>Reading</span>
        </div>
        <div className="divide-y divide-white/70">{opts.list.map(renderParam)}</div>
      </div>
    );
  };

  return (
    <div className="w-full min-w-0 space-y-4 sm:space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30"><Droplets size={20} /></div>
        <div>
          <h1 className="text-lg sm:text-xl font-semibold text-slate-800 tracking-tight">Tank Operator</h1>
          <p className="text-xs text-slate-600">Pick a tank and enter its readings. A shift opens and closes automatically by time.</p>
        </div>
      </div>

      {error && <div className="flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm border bg-red-500/10 text-red-700 border-red-400/40"><AlertCircle size={16} className="mt-0.5" />{error}</div>}
      {!data && !error && <div className="h-32 rounded-2xl bg-white/50 animate-pulse" />}

      {data && (
        <>
          {/* ---- the 3 shift blocks ---- */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {data.shifts.map((s) => {
              const b = badge(s);
              const isOpen = s.status === "RUNNING";
              const done = data.readings.filter((r) => r.date === data.date && r.shiftNo === s.shiftNo).length;
              const pct = shiftTankCount ? Math.min(100, Math.round((done / shiftTankCount) * 100)) : 0;
              return (
                <div key={s.shiftNo} className={`${glass} rounded-2xl p-4 space-y-3 transition ${isOpen ? "ring-2 ring-emerald-400/70" : "opacity-70"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{s.label}</p>
                      <p className="text-xs text-slate-600 tabular-nums">{s.startTime} - {s.endTime}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${b.cls}`}><b.Icon size={12} />{b.text}</span>
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-600 mb-1"><span>Tanks recorded</span><span className="font-semibold">{done}/{shiftTankCount}</span></div>
                    <div className="h-1.5 rounded-full bg-slate-300/40 overflow-hidden"><div className="h-full rounded-full bg-sky-500 transition-all duration-500" style={{ width: `${pct}%` }} /></div>
                  </div>
                  {s.status === "CLOSED" && <p className="hidden md:flex text-[11px] text-slate-500 items-start gap-1"><Lock size={11} className="mt-0.5 shrink-0" /> Time is over. If data is missing, ask the manager to add it.</p>}
                  {s.status === "UPCOMING" && <p className="hidden md:flex text-[11px] text-slate-500 items-start gap-1"><Lock size={11} className="mt-0.5 shrink-0" /> Opens at {s.startTime}.</p>}
                </div>
              );
            })}

            {/* ---- "Once a day" block: always open all day, no shift needed ---- */}
            <div className={`${glass} rounded-2xl p-4 space-y-3 transition ring-2 ring-sky-400/70`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Once a day</p>
                  <p className="text-xs text-slate-600 tabular-nums">{data.today}</p>
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border bg-sky-500/15 text-sky-700 border-sky-400/50"><CalendarClock size={12} />Open all day</span>
              </div>
              <div>
                <div className="flex justify-between text-[11px] text-slate-600 mb-1"><span>Tanks recorded</span><span className="font-semibold">{dailyDone}/{dailyTankCount}</span></div>
                <div className="h-1.5 rounded-full bg-slate-300/40 overflow-hidden"><div className="h-full rounded-full bg-sky-500 transition-all duration-500" style={{ width: `${dailyPct}%` }} /></div>
              </div>
              <p className="hidden sm:flex text-[11px] text-slate-500 items-start gap-1"><Clock size={11} className="mt-0.5 shrink-0" /> Enter any time today. No shift needed.</p>
            </div>
          </div>

          {data.tanks.length === 0 && <section className={`${glass} rounded-2xl p-6 text-sm text-slate-600`}>No tanks have been set up yet. Ask the manager to add tanks and parameters.</section>}

          {/* ---- entry form: tank -> its parameters, grouped by how the Manager set them up ---- */}
          {data.tanks.length > 0 && (
            <section className={`${glass} rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-5`}>
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-slate-800">Enter readings</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {activeShift ? <>Current shift: <b className="text-slate-700">{activeShift.label}</b></> : "No shift is open right now"} - Today {data.today}
                  </p>
                </div>
                <div className="sm:w-80">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Tank</label>
                  <GlassDropdown
                    icon={Droplets}
                    value={tankId}
                    onChange={pickTank}
                    options={data.tanks.map((t) => {
                      const d = t.parameters.filter(isDaily).length;
                      const sh = t.parameters.length - d;
                      return { id: t.id, label: t.name, sub: t.parameters.length === 0 ? "No parameters yet" : [sh ? `${sh} every shift` : "", d ? `${d} once a day` : ""].filter(Boolean).join(" - ") };
                    })}
                    placeholder="Select a tank"
                  />
                </div>
              </div>

              {tank && params.length === 0 && <p className="text-sm text-slate-500">This tank has no parameters yet. Ask the manager to add them.</p>}

              {shiftParams.length > 0 && renderGroup({
                icon: <Layers size={16} />,
                title: `Every shift${activeShift ? ` - ${activeShift.label}` : ""}`,
                sub: "Recorded in each shift, only while that shift is running",
                list: shiftParams,
                lockedMsg: activeShift ? undefined : "No shift is open right now, so these can't be entered. They open automatically when the next shift starts.",
                savedBy: activeShift ? shiftRow?.recordedBy : undefined,
              })}

              {dailyParams.length > 0 && renderGroup({
                icon: <CalendarClock size={16} />,
                title: "Once a day",
                sub: `One reading per day (${data.today}). No shift needed, enter it any time today`,
                list: dailyParams,
                savedBy: dayRow?.recordedBy,
              })}

              {params.length > 0 && (
                <div className="rounded-2xl bg-white/50 border border-white/70 p-4 space-y-3">
                  {notice && (
                    <div className={`flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm border ${notice.type === "success" ? "bg-emerald-500/10 text-emerald-700 border-emerald-400/40" : "bg-red-500/10 text-red-700 border-red-400/40"}`}>
                      {notice.type === "success" ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> : <AlertCircle size={16} className="mt-0.5 shrink-0" />}<span>{notice.text}</span>
                    </div>
                  )}
                  <div className="flex flex-col md:flex-row md:items-end gap-3">
                    <div className="flex-1 min-w-0">
                      <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1.5"><PenLine size={13} /> Type your name to submit <span className="text-red-600">*</span></label>
                      <div className="relative">
                        <input type="text" value={signName} onChange={(e) => { setSignName(e.target.value); setNotice(null); }}
                          placeholder="Your full name" autoComplete="off" maxLength={100}
                          className={`${inputClass} pr-10 ${nameTyped ? "border-emerald-400 ring-2 ring-emerald-400/30 focus:border-emerald-400 focus:ring-emerald-400/40" : ""}`} />
                        {nameTyped && <CheckCircle2 size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600" />}
                      </div>
                      <p className={`mt-1.5 text-[11px] ${nameTyped ? "text-emerald-700" : "text-slate-500"}`}>
                        Type any name to submit. Once submitted, these readings are locked.
                      </p>
                    </div>
                    <button type="button" onClick={save} disabled={!canSubmit}
                      className="min-h-[46px] md:min-w-[200px] px-6 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-white text-sm font-semibold shadow-lg shadow-blue-500/30 transition-all hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 cursor-pointer inline-flex items-center justify-center gap-2">
                      {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                      {toSend.length > 0 ? `Submit ${plural(toSend.length, "reading")}` : "Submit reading"}
                    </button>
                  </div>
                  {toSend.length === 0 && incomplete.length === 0 && <p className="text-[11px] text-slate-500">Enter at least one value to submit.</p>}
                </div>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}