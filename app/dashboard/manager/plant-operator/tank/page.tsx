"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowLeftRight, CalendarClock, Clock, Droplets, FileDown, Layers, PlusCircle, Save, SlidersHorizontal, Trash2, X } from "lucide-react";
import {
  api, btnDanger, btnPrimary, colomboToday, downloadFile, glass, GlassDropdown, inputClass,
  PageTitle, send, Spinner, Tabs, Toast, type DropdownOption, type Notice,
} from "@/components/manager/plant/ui";

type CheckMode = "SINGLE" | "IN_OUT";
type Frequency = "SHIFT" | "DAILY";
type TParam = { id: string; name: string; unit: string | null; min: number | null; max: number | null; checkMode: CheckMode; frequency: Frequency };
type Tank = { id: string; name: string; parameters: TParam[] };
type Shift = { shiftNo: number; label: string; startTime: string; endTime: string };
type Reading = {
  id: string; tankId: string; shiftNo: number;
  values: Record<string, number>; valuesOut: Record<string, number> | null; recordedBy: string;
};
type Tab = "tanks" | "shifts" | "daily" | "report";

const rangeText = (p: TParam) => (p.min === null && p.max === null ? "no range" : `${p.min ?? "-"} to ${p.max ?? "-"}`);
const outOfRange = (p: TParam, v: number) => (p.min !== null && v < p.min) || (p.max !== null && v > p.max);

const modeLabel = (m: CheckMode) => (m === "IN_OUT" ? "In & Out" : "Single value");
const freqLabel = (f: Frequency) => (f === "DAILY" ? "Once a day" : "Every shift");

// Reading type / check frequency belong to each PARAMETER
const MODE_OPTIONS: DropdownOption[] = [
  { id: "SINGLE", label: "Single value", sub: "One value for every parameter" },
  { id: "IN_OUT", label: "In & Out", sub: "An inlet and an outlet value for every parameter" },
];
const FREQ_OPTIONS: DropdownOption[] = [
  { id: "SHIFT", label: "Every shift", sub: "Recorded in each of the 3 daily shifts" },
  { id: "DAILY", label: "Once a day", sub: "One reading per day, no shift needed" },
];

export default function ManagerTank() {
  const [tab, setTab] = useState<Tab>("tanks");
  const [notice, setNotice] = useState<Notice>(null);
  const fail = (e: any) => setNotice({ type: "error", text: e.message });
  const ok = (text: string) => setNotice({ type: "success", text });

  // ---- tanks & parameters ----
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [tankName, setTankName] = useState("");
  type ParamForm = { name: string; unit: string; min: string; max: string; checkMode: CheckMode; frequency: Frequency };
  const emptyForm: ParamForm = { name: "", unit: "", min: "", max: "", checkMode: "SINGLE", frequency: "SHIFT" };
  const [pf, setPf] = useState<Record<string, ParamForm>>({});
  const loadTanks = useCallback(async () => { try { setTanks(await api("/api/manager/plant/tanks")); } catch (e) { fail(e); } }, []);

  // ---- shifts ----
  const [shifts, setShifts] = useState<Shift[]>([]);
  const loadShifts = useCallback(async () => {
    try { setShifts((await api<{ shifts: Shift[] }>("/api/manager/plant/shifts")).shifts); } catch (e) { fail(e); }
  }, []);

  // ---- daily ----
  const [date, setDate] = useState("");
  const [daily, setDaily] = useState<{ tanks: Tank[]; readings: Reading[]; shifts: Shift[] } | null>(null);
  const loadDaily = useCallback(async (d: string) => { try { setDaily(await api(`/api/manager/plant/tank/daily?date=${d}`)); } catch (e) { fail(e); } }, []);

  // ---- manager adds / corrects a reading (when the operator missed the shift) ----
  const [mTank, setMTank] = useState("");
  const [mParam, setMParam] = useState("");
  const [mShift, setMShift] = useState(1);
  const [mVal, setMVal] = useState("");
  const [mValOut, setMValOut] = useState("");
  const [mSaving, setMSaving] = useState(false);
  // Current time, read only in the browser (never while Next.js prerenders) and refreshed every 30 s,
  // so a shift that just ended shows up without reloading the page. 0 = not read yet.
  const [nowMs, setNowMs] = useState(0);
  useEffect(() => {
    const tick = () => setNowMs(Date.now());
    const first = setTimeout(tick, 0);
    const i = setInterval(tick, 30000);
    return () => { clearTimeout(first); clearInterval(i); };
  }, []);

  // ---- report ----
  const [month, setMonth] = useState("");
  const [reportTank, setReportTank] = useState("");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const today = colomboToday();
    setDate(today); setMonth(today.slice(0, 7));
    loadTanks(); loadShifts(); loadDaily(today);
  }, [loadTanks, loadShifts, loadDaily]);

  const addTank = async (e: React.FormEvent) => {
    e.preventDefault(); setNotice(null);
    try { await send("/api/manager/plant/tanks", "POST", { name: tankName }); setTankName(""); ok("Tank added."); loadTanks(); } catch (err) { fail(err); }
  };
  const delTank = async (t: Tank) => {
    if (!confirm(`Delete ${t.name}? Its parameters and ALL recorded readings will be deleted.`)) return;
    try { await send(`/api/manager/plant/tanks?id=${t.id}`, "DELETE"); ok(`${t.name} deleted.`); loadTanks(); } catch (err) { fail(err); }
  };
  const addParam = async (t: Tank) => {
    const f = pf[t.id]; if (!f?.name.trim()) return; setNotice(null);
    try {
      await send("/api/manager/plant/tank-parameters", "POST", { tankId: t.id, ...f });
      setPf({ ...pf, [t.id]: { ...emptyForm, checkMode: f.checkMode, frequency: f.frequency } }); ok(`Parameter added to ${t.name}.`); loadTanks(); if (date) loadDaily(date);
    } catch (err) { fail(err); }
  };
  const delParam = async (p: TParam) => {
    if (!confirm(`Delete parameter ${p.name}? Recorded values for it are no longer shown.`)) return;
    try { await send(`/api/manager/plant/tank-parameters?id=${p.id}`, "DELETE"); ok(`${p.name} removed.`); loadTanks(); if (date) loadDaily(date); } catch (err) { fail(err); }
  };

  const saveShifts = async () => {
    setNotice(null);
    try { await send("/api/manager/plant/shifts", "PUT", { shifts }); ok("Shifts saved."); } catch (err) { fail(err); }
  };
  const download = async () => {
    setDownloading(true); setNotice(null);
    try { await downloadFile(`/api/manager/plant/tank/report?month=${month}${reportTank ? `&tankId=${reportTank}` : ""}`, `Tank-Report-${month}.xlsx`); }
    catch (err) { fail(err); } finally { setDownloading(false); }
  };

  // ---- add / correct reading: tank -> parameter -> shift -> value(s) ----
  // The chosen PARAMETER decides the rest: "Once a day" parameters have no shift, "In & Out" parameters get an In and an Out box.
  // (the first tank / its first parameter are used until the manager picks one)
  const mTankObj = daily?.tanks.find((t) => t.id === mTank) ?? daily?.tanks[0];
  const mParamObj = mTankObj?.parameters.find((p) => p.id === mParam) ?? mTankObj?.parameters[0];
  const tankSel = mTankObj?.id ?? "";
  const paramSel = mParamObj?.id ?? "";
  const mDaily = mParamObj?.frequency === "DAILY";
  const mInOut = mParamObj?.checkMode === "IN_OUT";
  // The Manager can add data only AFTER the time is over: a finished shift, or a day that is over (not today)
  const nowMin = (() => { const d = new Date(nowMs + 5.5 * 3600 * 1000); return d.getUTCHours() * 60 + d.getUTCMinutes(); })();
  const shiftOver = (x: Shift) => {
    if (!nowMs) return false; // time not read yet (first render)
    const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
    const a = toMin(x.startTime); let b = toMin(x.endTime); if (b <= a) b += 1440;
    const daysAgo = Math.round((Date.parse(`${colomboToday()}T00:00:00Z`) - Date.parse(`${date}T00:00:00Z`)) / 86400000);
    return daysAgo >= 0 && nowMin + daysAgo * 1440 >= b;
  };
  const dayOver = !!date && date < colomboToday();
  const endedShifts = (daily?.shifts ?? []).filter(shiftOver);
  const mShiftNo = mDaily ? 0 : endedShifts.some((x) => x.shiftNo === mShift) ? mShift : (endedShifts[0]?.shiftNo ?? mShift);
  const mCanAdd = !!mParamObj && (mDaily ? dayOver : endedShifts.length > 0);
  const mTankOptions: DropdownOption[] = (daily?.tanks ?? []).map((t) => ({ id: t.id, label: t.name, sub: `${t.parameters.length} parameter${t.parameters.length === 1 ? "" : "s"}` }));
  const mParamOptions: DropdownOption[] = (mTankObj?.parameters ?? []).map((p) => ({ id: p.id, label: p.unit ? `${p.name} (${p.unit})` : p.name, sub: `${modeLabel(p.checkMode)} - ${freqLabel(p.frequency)}` }));
  const mShiftOptions: DropdownOption[] = !mParamObj ? [] : mDaily
    ? [{ id: "0", label: "Once a day", sub: "Any time of the day (no shift)" }]
    : endedShifts.map((s) => ({ id: String(s.shiftNo), label: s.label, sub: `${s.startTime} - ${s.endTime} (finished)` }));
  const mExisting = daily?.readings.find((r) => r.tankId === tankSel && r.shiftNo === mShiftNo);
  const exVal = paramSel ? mExisting?.values?.[paramSel] : undefined;
  const exOut = paramSel ? mExisting?.valuesOut?.[paramSel] : undefined;

  // pre-fill the boxes with the saved value when the tank / parameter / shift / day changes
  useEffect(() => {
    setMVal(exVal === undefined || exVal === null ? "" : String(exVal));
    setMValOut(exOut === undefined || exOut === null ? "" : String(exOut));
  }, [date, tankSel, paramSel, mShiftNo, exVal, exOut]);

  const isNum = (v: string) => v.trim() !== "" && Number.isFinite(Number(v));
  const mReady = mCanAdd && isNum(mVal) && (!mInOut || isNum(mValOut));

  const saveManual = async () => {
    if (!mTankObj || !mParamObj) return;
    setMSaving(true); setNotice(null);
    try {
      await send("/api/manager/plant/tank/daily", "POST", {
        tankId: tankSel, parameterId: paramSel, date, shiftNo: mShiftNo, value: mVal, valueOut: mInOut ? mValOut : undefined,
      });
      ok(`${mParamObj.name} saved for ${mTankObj.name} on ${date}.`);
      await loadDaily(date);
    } catch (err) { fail(err); } finally { setMSaving(false); }
  };

  // one cell of the Daily Data table (In / Out on two lines for In & Out parameters)
  const cell = (p: TParam, r?: Reading) => {
    if (!r) return "-";
    const show = (v: number | null | undefined) =>
      v === undefined || v === null ? "-" : <span className={outOfRange(p, v) ? "text-red-700 font-bold" : ""}>{v}</span>;
    if (p.checkMode === "IN_OUT") {
      return (
        <div className="space-y-0.5">
          <div><span className="text-[10px] text-slate-500 mr-1">In</span>{show(r.values?.[p.id])}</div>
          <div><span className="text-[10px] text-slate-500 mr-1">Out</span>{show(r.valuesOut?.[p.id])}</div>
        </div>
      );
    }
    return show(r.values?.[p.id]);
  };

  return (
    <div className="w-full min-w-0 space-y-4 sm:space-y-6">
      <Link href="/dashboard/manager/plant-operator" className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:underline"><ArrowLeft size={14} /> Plant Operator</Link>
      <PageTitle icon={<Droplets size={20} />} title="Tank Operator" sub="Tanks, parameters (each with its own reading type and frequency), the 3 daily shifts, daily data and the monthly report." tile="from-sky-400 to-blue-600 shadow-blue-500/30" />
      <Tabs<Tab> value={tab} onChange={(t) => { setTab(t); setNotice(null); }} tabs={[
        { id: "tanks", label: "Tanks & Parameters" }, { id: "shifts", label: "Shifts" },
        { id: "daily", label: "Daily Data" }, { id: "report", label: "Monthly Report" },
      ]} />
      <Toast notice={notice} onClose={() => setNotice(null)} />

      {tab === "tanks" && (
        <>
          <section className={`${glass} rounded-2xl sm:rounded-3xl p-4 sm:p-6`}>
            <form onSubmit={addTank} className="flex flex-col sm:flex-row gap-3 sm:items-end">
              <div className="sm:w-72"><label className="block text-xs font-semibold text-slate-700 mb-1.5">Tank name</label>
                <input className={inputClass} value={tankName} onChange={(e) => setTankName(e.target.value)} placeholder="e.g. Balancing Tank" maxLength={60} /></div>
              <button type="submit" disabled={!tankName.trim()} className={btnPrimary}><PlusCircle size={16} /> Add tank</button>
            </form>
          </section>
          {tanks.length === 0 && <p className="text-sm text-slate-500">No tanks yet.</p>}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {tanks.map((t) => {
              const f = pf[t.id] ?? emptyForm;
              const set = (k: keyof ParamForm, v: string) => setPf({ ...pf, [t.id]: { ...f, [k]: v } });
              return (
                <section key={t.id} className={`${glass} rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-3`}>
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-base font-semibold text-slate-800 min-w-0 truncate">{t.name}</h2>
                    <button type="button" onClick={() => delTank(t)} className={`${btnDanger} shrink-0`}><Trash2 size={14} /> Delete tank</button>
                  </div>
                  <p className="text-xs font-semibold text-slate-700">Parameters to check ({t.parameters.length})</p>
                  {t.parameters.length === 0 ? <p className="text-xs text-slate-500">No parameters yet.</p> : (
                    <div className="flex flex-wrap gap-2">
                      {t.parameters.map((p) => (
                        <span key={p.id} className="inline-flex flex-col gap-1 pl-3 pr-2 py-1.5 rounded-2xl text-xs bg-white/70 border border-white/70 text-slate-700">
                          <span className="inline-flex items-center gap-2">
                            <b>{p.name}</b>{p.unit ? ` (${p.unit})` : ""} <span className="text-slate-500">{rangeText(p)}</span>
                            <button type="button" onClick={() => delParam(p)} className="p-1 rounded-full hover:bg-red-500/10 text-red-600 cursor-pointer"><X size={12} /></button>
                          </span>
                          <span className="inline-flex flex-wrap gap-1.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 border border-blue-400/40 text-blue-700"><ArrowLeftRight size={10} />{modeLabel(p.checkMode)}</span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 border border-blue-400/40 text-blue-700"><Layers size={10} />{freqLabel(p.frequency)}</span>
                          </span>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Add a parameter: name + range, then HOW it is checked (Reading type + Check frequency) */}
                  <div className="rounded-2xl bg-white/40 border border-white/60 p-3 sm:p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 shrink-0 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/30"><SlidersHorizontal size={16} /></div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">Add a parameter</p>
                        <p className="text-[11px] text-slate-500">Each parameter has its own reading type and check frequency.</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-[1fr_90px_80px_80px] gap-2">
                      <input className={`${inputClass} col-span-2 sm:col-span-1`} placeholder="Parameter" value={f.name} onChange={(e) => set("name", e.target.value)} maxLength={40} />
                      <input className={inputClass} placeholder="Unit" value={f.unit} onChange={(e) => set("unit", e.target.value)} />
                      <input className={inputClass} type="number" step="any" placeholder="Min" value={f.min} onChange={(e) => set("min", e.target.value)} />
                      <input className={inputClass} type="number" step="any" placeholder="Max" value={f.max} onChange={(e) => set("max", e.target.value)} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Reading type</label>
                        <GlassDropdown icon={ArrowLeftRight} options={MODE_OPTIONS} value={f.checkMode} onChange={(v) => set("checkMode", v)} />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Check frequency</label>
                        <GlassDropdown icon={CalendarClock} options={FREQ_OPTIONS} value={f.frequency} onChange={(v) => set("frequency", v)} />
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-600 rounded-xl bg-white/50 border border-white/60 px-3 py-2">
                      {f.checkMode === "IN_OUT" ? "The operator enters an In value and an Out value" : "The operator enters one value"}
                      {f.frequency === "DAILY" ? ", once a day at any time (no shift)." : ", in every shift."}
                    </p>
                    <button type="button" disabled={!f.name.trim()} onClick={() => addParam(t)} className={btnPrimary}><PlusCircle size={16} /> Add parameter</button>
                  </div>
                </section>
              );
            })}
          </div>
        </>
      )}

      {tab === "shifts" && (
        <>
          <section className={`${glass} rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4`}>
            <h2 className="text-base font-semibold text-slate-800">Shift times (3 shifts per day)</h2>
            <p className="text-xs text-slate-600">Each shift opens and closes automatically by these times. Any tank operator can enter data while a shift is running. Parameters set to &quot;Once a day&quot; do not use shifts.</p>
            <div className="space-y-3">
              {shifts.map((s, i) => (
                <div key={s.shiftNo} className="grid grid-cols-1 sm:grid-cols-[1fr_140px_140px] gap-3">
                  <input className={inputClass} value={s.label} onChange={(e) => setShifts(shifts.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
                  <input className={inputClass} type="time" value={s.startTime} onChange={(e) => setShifts(shifts.map((x, j) => (j === i ? { ...x, startTime: e.target.value } : x)))} />
                  <input className={inputClass} type="time" value={s.endTime} onChange={(e) => setShifts(shifts.map((x, j) => (j === i ? { ...x, endTime: e.target.value } : x)))} />
                </div>
              ))}
            </div>
            <button type="button" onClick={saveShifts} className={btnPrimary}><Save size={16} /> Save shifts</button>
          </section>
        </>
      )}

      {tab === "daily" && (
        <>
          {!daily ? <div className="h-24 rounded-2xl bg-white/50 animate-pulse" /> : daily.tanks.length === 0 ? <p className="text-sm text-slate-500">No tanks configured.</p> : daily.tanks.map((t) => {
            // one table for the "every shift" parameters (a column per shift), one for the "once a day" parameters
            const groups = [
              { key: "shift", title: "Every shift", params: t.parameters.filter((p) => p.frequency !== "DAILY"), cols: daily.shifts.map((x) => ({ no: x.shiftNo, label: x.label })) },
              { key: "daily", title: "Once a day", params: t.parameters.filter((p) => p.frequency === "DAILY"), cols: [{ no: 0, label: "Once a day" }] },
            ].filter((g) => g.params.length > 0);
            return (
              <section key={t.id} className={`${glass} rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4`}>
                <h2 className="text-base font-semibold text-slate-800">{t.name}</h2>
                {groups.length === 0 && <p className="text-sm text-slate-500">This tank has no parameters yet.</p>}
                {groups.map((g) => {
                  const rs = daily.readings.filter((r) => r.tankId === t.id && g.cols.some((c) => c.no === r.shiftNo));
                  return (
                    <div key={g.key} className="space-y-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/70 border border-white/70 text-slate-600"><Layers size={11} />{g.title}</span>
                      {rs.length === 0 ? <p className="text-sm text-slate-500">No readings on this day.</p> : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm min-w-[420px]">
                            <thead><tr className="text-left text-xs text-slate-600 border-b border-white/60">
                              <th className="py-2 pr-3">Parameter</th>{g.cols.map((c) => <th key={c.no} className="py-2 pr-3">{c.label}</th>)}</tr></thead>
                            <tbody>
                              {g.params.map((p) => (
                                <tr key={p.id} className="border-b border-white/40 text-slate-700 align-top">
                                  <td className="py-2 pr-3 font-semibold">
                                    {p.name}{p.unit ? <span className="font-normal text-slate-500"> ({p.unit})</span> : null} <span className="text-[10px] font-normal text-slate-500">{rangeText(p)}</span>
                                    {p.checkMode === "IN_OUT" && <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 border border-blue-400/40 text-blue-700">In &amp; Out</span>}
                                  </td>
                                  {g.cols.map((c) => <td key={c.no} className="py-2 pr-3">{cell(p, rs.find((r) => r.shiftNo === c.no))}</td>)}
                                </tr>
                              ))}
                              <tr className="text-xs text-slate-500">
                                <td className="py-2 pr-3">Recorded by</td>{g.cols.map((c) => <td key={c.no} className="py-2 pr-3">{rs.find((r) => r.shiftNo === c.no)?.recordedBy ?? "-"}</td>)}
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </section>
            );
          })}
        </>
      )}

      {tab === "daily" && daily && daily.tanks.length > 0 && (
        <section className={`${glass} rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4`}>
          <h2 className="text-base font-semibold text-slate-800">Add / correct data</h2>
          <p className="text-xs text-slate-600">The date below also decides which day is shown in the tables above. Use this when an operator could not enter the data in time. Data can be added only after the time is over: a shift after it has finished, a &quot;once a day&quot; parameter after that day is over. The entry is marked &quot;(Manager)&quot;.</p>
          <div className="sm:w-60"><label className="block text-xs font-semibold text-slate-700 mb-1.5">Date</label>
            <input type="date" className={inputClass} value={date} max={colomboToday()} onChange={(e) => { if (e.target.value) { setDate(e.target.value); loadDaily(e.target.value); } }} /></div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div><label className="block text-xs font-semibold text-slate-700 mb-1.5">Tank</label>
              <GlassDropdown icon={Droplets} options={mTankOptions} value={tankSel} onChange={(v) => { setMTank(v); setMParam(""); }} placeholder="Select a tank" /></div>
            <div><label className="block text-xs font-semibold text-slate-700 mb-1.5">Parameter</label>
              <GlassDropdown icon={SlidersHorizontal} options={mParamOptions} value={paramSel} onChange={setMParam} placeholder="Select a parameter" disabled={!mTankObj || mParamOptions.length === 0} /></div>
            <div><label className="block text-xs font-semibold text-slate-700 mb-1.5">Shift</label>
              <GlassDropdown icon={Clock} options={mShiftOptions} value={String(mShiftNo)} onChange={(v) => setMShift(Number(v))} placeholder="Select a shift" disabled={!mParamObj} /></div>
          </div>
          {mTankObj && mTankObj.parameters.length === 0 && <p className="text-sm text-slate-500">This tank has no parameters yet.</p>}
          {mParamObj && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-500/10 border border-blue-400/40 text-blue-700"><ArrowLeftRight size={12} />{modeLabel(mParamObj.checkMode)}</span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-500/10 border border-blue-400/40 text-blue-700"><Layers size={12} />{freqLabel(mParamObj.frequency)}</span>
                <span className="text-[11px] text-slate-500">{mInOut ? "Enter an In value and an Out value." : "Enter one value."}</span>
              </div>
              {!mCanAdd && (
                <p className="text-xs text-amber-800 bg-amber-500/10 border border-amber-400/40 rounded-xl px-3 py-2">
                  {mDaily
                    ? "This parameter is checked once a day. You can add its data only after the day is over, so choose an earlier date. Today's data is entered by the operator."
                    : "No shift of this day has finished yet. You can add shift data only after that shift ends. Choose an earlier date, or wait until the shift is over."}
                </p>
              )}
              {mCanAdd && exVal !== undefined && mExisting && <p className="text-xs text-emerald-700 bg-emerald-500/10 border border-emerald-400/40 rounded-xl px-3 py-2">Already recorded by {mExisting.recordedBy}. Saving will replace it.</p>}
              {mCanAdd && <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">{mInOut ? "In value" : "Value"}{mParamObj.unit ? ` (${mParamObj.unit})` : ""} <span className="font-normal text-slate-500">{rangeText(mParamObj)}</span></label>
                  <input type="number" inputMode="decimal" step="any" className={inputClass} value={mVal} onChange={(e) => setMVal(e.target.value)} />
                </div>
                {mInOut && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Out value{mParamObj.unit ? ` (${mParamObj.unit})` : ""} <span className="font-normal text-slate-500">{rangeText(mParamObj)}</span></label>
                    <input type="number" inputMode="decimal" step="any" className={inputClass} value={mValOut} onChange={(e) => setMValOut(e.target.value)} />
                  </div>
                )}
              </div>}
            </>
          )}
          <button type="button" onClick={saveManual} disabled={!mReady || mSaving} className={btnPrimary}>{mSaving ? <Spinner /> : <Save size={16} />} Save reading</button>
        </section>
      )}

      {tab === "report" && (
        <section className={`${glass} rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4`}>
          <p className="text-xs text-slate-600">Download all readings of a month as an Excel file (one sheet per tank). In &amp; Out parameters get an In and an Out column. Out-of-range values are shown in red.</p>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="sm:w-52"><label className="block text-xs font-semibold text-slate-700 mb-1.5">Month</label>
              <input type="month" className={inputClass} value={month} max={colomboToday().slice(0, 7)} onChange={(e) => setMonth(e.target.value)} /></div>
            <div className="sm:w-64"><label className="block text-xs font-semibold text-slate-700 mb-1.5">Tank</label>
              <GlassDropdown icon={Droplets} options={[{ id: "", label: "All tanks" }, ...tanks.map((t) => ({ id: t.id, label: t.name }))]} value={reportTank} onChange={setReportTank} /></div>
            <button type="button" onClick={download} disabled={!month || downloading} className={btnPrimary}>{downloading ? <Spinner /> : <FileDown size={16} />} Download Excel</button>
          </div>
        </section>
      )}
    </div>
  );
}