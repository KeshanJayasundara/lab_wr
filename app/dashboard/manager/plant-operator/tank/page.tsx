// >>> SAVE AS: app/dashboard/manager/plant-operator/tank/page.tsx   (REPLACE the whole file) - delete this line after saving <<<
"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Droplets, FileDown, PlusCircle, Save, Trash2, X } from "lucide-react";
import {
  api, btnDanger, btnGhost, btnPrimary, colomboToday, downloadFile, glass, inputClass,
  NoticeBox, PageTitle, send, Spinner, Tabs, type Notice,
} from "@/components/manager/plant/ui";

type TParam = { id: string; name: string; unit: string | null; min: number | null; max: number | null };
type Tank = { id: string; name: string; parameters: TParam[] };
type Shift = { shiftNo: number; label: string; startTime: string; endTime: string };
type Reading = { id: string; tankId: string; shiftNo: number; values: Record<string, number>; recordedBy: string };
type Tab = "tanks" | "shifts" | "daily" | "report";

const rangeText = (p: TParam) => (p.min === null && p.max === null ? "no range" : `${p.min ?? "-"} to ${p.max ?? "-"}`);
const outOfRange = (p: TParam, v: number) => (p.min !== null && v < p.min) || (p.max !== null && v > p.max);

export default function ManagerTank() {
  const [tab, setTab] = useState<Tab>("tanks");
  const [notice, setNotice] = useState<Notice>(null);
  const fail = (e: any) => setNotice({ type: "error", text: e.message });
  const ok = (text: string) => setNotice({ type: "success", text });

  // ---- tanks & parameters ----
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [tankName, setTankName] = useState("");
  const [pf, setPf] = useState<Record<string, { name: string; unit: string; min: string; max: string }>>({});
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
  const [mShift, setMShift] = useState(1);
  const [mVals, setMVals] = useState<Record<string, string>>({});
  const [mSaving, setMSaving] = useState(false);

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
    try { await send(`/api/manager/plant/tanks?id=${t.id}`, "DELETE"); loadTanks(); } catch (err) { fail(err); }
  };
  const addParam = async (t: Tank) => {
    const f = pf[t.id]; if (!f?.name.trim()) return; setNotice(null);
    try {
      await send("/api/manager/plant/tank-parameters", "POST", { tankId: t.id, ...f });
      setPf({ ...pf, [t.id]: { name: "", unit: "", min: "", max: "" } }); loadTanks();
    } catch (err) { fail(err); }
  };
  const delParam = async (p: TParam) => {
    if (!confirm(`Delete parameter ${p.name}? Recorded values for it are no longer shown.`)) return;
    try { await send(`/api/manager/plant/tank-parameters?id=${p.id}`, "DELETE"); loadTanks(); } catch (err) { fail(err); }
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

  const mTankObj = daily?.tanks.find((t) => t.id === mTank);
  const mExisting = daily?.readings.find((r) => r.tankId === mTank && r.shiftNo === mShift);
  const mKey = `${date}|${mTank}|${mShift}|${mExisting ? JSON.stringify(mExisting.values) : ""}`;
  useEffect(() => {
    if (!daily) return;
    if (!mTank && daily.tanks[0]) { setMTank(daily.tanks[0].id); return; }
    const t = daily.tanks.find((x) => x.id === mTank);
    const next: Record<string, string> = {};
    t?.parameters.forEach((p) => { const v = mExisting?.values?.[p.id]; next[p.id] = v === undefined ? "" : String(v); });
    setMVals(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mKey, daily]);

  const saveManual = async () => {
    if (!mTankObj) return;
    setMSaving(true); setNotice(null);
    try {
      await send("/api/manager/plant/tank/daily", "POST", { tankId: mTank, date, shiftNo: mShift, values: mVals });
      ok(`Reading saved for ${mTankObj.name} on ${date}.`);
      await loadDaily(date);
    } catch (err) { fail(err); } finally { setMSaving(false); }
  };
  const mReady = !!mTankObj && mTankObj.parameters.length > 0 && mTankObj.parameters.every((p) => mVals[p.id]?.trim() !== "" && Number.isFinite(Number(mVals[p.id])));

  return (
    <div className="w-full min-w-0 space-y-4 sm:space-y-6">
      <Link href="/dashboard/manager/plant-operator" className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:underline"><ArrowLeft size={14} /> Plant Operator</Link>
      <PageTitle icon={<Droplets size={20} />} title="Tank Operator" sub="Tanks, check parameters, the 3 daily shifts, daily data and the monthly report." tile="from-sky-400 to-blue-600 shadow-blue-500/30" />
      <Tabs<Tab> value={tab} onChange={(t) => { setTab(t); setNotice(null); }} tabs={[
        { id: "tanks", label: "Tanks & Parameters" }, { id: "shifts", label: "Shifts" },
        { id: "daily", label: "Daily Data" }, { id: "report", label: "Monthly Report" },
      ]} />
      <NoticeBox notice={notice} />

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
              const f = pf[t.id] ?? { name: "", unit: "", min: "", max: "" };
              const set = (k: keyof typeof f, v: string) => setPf({ ...pf, [t.id]: { ...f, [k]: v } });
              return (
                <section key={t.id} className={`${glass} rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-3`}>
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-base font-semibold text-slate-800">{t.name}</h2>
                    <button type="button" onClick={() => delTank(t)} className={btnDanger}><Trash2 size={14} /> Delete tank</button>
                  </div>
                  <p className="text-xs font-semibold text-slate-700">Parameters to check ({t.parameters.length})</p>
                  {t.parameters.length === 0 ? <p className="text-xs text-slate-500">No parameters yet.</p> : (
                    <div className="flex flex-wrap gap-2">
                      {t.parameters.map((p) => (
                        <span key={p.id} className="inline-flex items-center gap-2 pl-3 pr-1.5 py-1 rounded-full text-xs bg-white/70 border border-white/70 text-slate-700">
                          <b>{p.name}</b>{p.unit ? ` (${p.unit})` : ""} <span className="text-slate-500">{rangeText(p)}</span>
                          <button type="button" onClick={() => delParam(p)} className="p-1 rounded-full hover:bg-red-500/10 text-red-600 cursor-pointer"><X size={12} /></button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="grid grid-cols-2 sm:grid-cols-[1fr_90px_80px_80px_auto] gap-2 items-end pt-1">
                    <input className={`${inputClass} col-span-2 sm:col-span-1`} placeholder="Parameter" value={f.name} onChange={(e) => set("name", e.target.value)} maxLength={40} />
                    <input className={inputClass} placeholder="Unit" value={f.unit} onChange={(e) => set("unit", e.target.value)} />
                    <input className={inputClass} type="number" step="any" placeholder="Min" value={f.min} onChange={(e) => set("min", e.target.value)} />
                    <input className={inputClass} type="number" step="any" placeholder="Max" value={f.max} onChange={(e) => set("max", e.target.value)} />
                    <button type="button" disabled={!f.name.trim()} onClick={() => addParam(t)} className={`${btnPrimary} col-span-2 sm:col-span-1`}><PlusCircle size={16} /> Add</button>
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
            <p className="text-xs text-slate-600">Each shift opens and closes automatically by these times. Any tank operator can enter data while a shift is running.</p>
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
          <section className={`${glass} rounded-2xl sm:rounded-3xl p-4 sm:p-6`}>
            <div className="sm:w-60"><label className="block text-xs font-semibold text-slate-700 mb-1.5">Date</label>
              <input type="date" className={inputClass} value={date} max={colomboToday()} onChange={(e) => { setDate(e.target.value); setDaily(null); if (e.target.value) loadDaily(e.target.value); }} /></div>
          </section>
          {!daily ? <div className="h-24 rounded-2xl bg-white/50 animate-pulse" /> : daily.tanks.length === 0 ? <p className="text-sm text-slate-500">No tanks configured.</p> : daily.tanks.map((t) => {
            const rs = daily.readings.filter((r) => r.tankId === t.id);
            return (
              <section key={t.id} className={`${glass} rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-3`}>
                <h2 className="text-base font-semibold text-slate-800">{t.name}</h2>
                {rs.length === 0 ? <p className="text-sm text-slate-500">No readings on this day.</p> : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[520px]">
                      <thead><tr className="text-left text-xs text-slate-600 border-b border-white/60">
                        <th className="py-2 pr-3">Parameter</th>{daily.shifts.map((s) => <th key={s.shiftNo} className="py-2 pr-3">{s.label}</th>)}</tr></thead>
                      <tbody>
                        {t.parameters.map((p) => (
                          <tr key={p.id} className="border-b border-white/40 text-slate-700">
                            <td className="py-2 pr-3 font-semibold">{p.name}{p.unit ? <span className="font-normal text-slate-500"> ({p.unit})</span> : null} <span className="text-[10px] font-normal text-slate-500">{rangeText(p)}</span></td>
                            {daily.shifts.map((s) => {
                              const v = rs.find((r) => r.shiftNo === s.shiftNo)?.values?.[p.id];
                              return <td key={s.shiftNo} className={`py-2 pr-3 ${typeof v === "number" && outOfRange(p, v) ? "text-red-700 font-bold" : ""}`}>{v ?? "-"}</td>;
                            })}
                          </tr>
                        ))}
                        <tr className="text-xs text-slate-500">
                          <td className="py-2 pr-3">Recorded by</td>{daily.shifts.map((s) => <td key={s.shiftNo} className="py-2 pr-3">{rs.find((r) => r.shiftNo === s.shiftNo)?.recordedBy ?? "-"}</td>)}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            );
          })}
        </>
      )}

      {tab === "daily" && daily && daily.tanks.length > 0 && (
        <section className={`${glass} rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4`}>
          <h2 className="text-base font-semibold text-slate-800">Add / correct data for {date}</h2>
          <p className="text-xs text-slate-600">Use this when an operator could not enter the data in the shift time. The entry is marked &quot;(Manager)&quot;.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="block text-xs font-semibold text-slate-700 mb-1.5">Tank</label>
              <select className={inputClass} value={mTank} onChange={(e) => setMTank(e.target.value)}>{daily.tanks.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
            <div><label className="block text-xs font-semibold text-slate-700 mb-1.5">Shift</label>
              <select className={inputClass} value={mShift} onChange={(e) => setMShift(Number(e.target.value))}>{daily.shifts.map((s) => <option key={s.shiftNo} value={s.shiftNo}>{s.label} ({s.startTime}-{s.endTime})</option>)}</select></div>
          </div>
          {mExisting && <p className="text-xs text-emerald-700 bg-emerald-500/10 border border-emerald-400/40 rounded-xl px-3 py-2">Already recorded by {mExisting.recordedBy}. Saving will replace it.</p>}
          {mTankObj && mTankObj.parameters.length === 0 ? <p className="text-sm text-slate-500">This tank has no parameters yet.</p> : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {mTankObj?.parameters.map((p) => (
                <div key={p.id}><label className="block text-xs font-semibold text-slate-700 mb-1.5">{p.name}{p.unit ? ` (${p.unit})` : ""} <span className="font-normal text-slate-500">{rangeText(p)}</span></label>
                  <input type="number" step="any" className={inputClass} value={mVals[p.id] ?? ""} onChange={(e) => setMVals({ ...mVals, [p.id]: e.target.value })} /></div>
              ))}
            </div>
          )}
          <button type="button" onClick={saveManual} disabled={!mReady || mSaving} className={btnPrimary}>{mSaving ? <Spinner /> : <Save size={16} />} Save reading</button>
        </section>
      )}

      {tab === "report" && (
        <section className={`${glass} rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4`}>
          <p className="text-xs text-slate-600">Download all shift readings of a month as an Excel file (one sheet per tank). Out-of-range values are shown in red.</p>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="sm:w-52"><label className="block text-xs font-semibold text-slate-700 mb-1.5">Month</label>
              <input type="month" className={inputClass} value={month} max={colomboToday().slice(0, 7)} onChange={(e) => setMonth(e.target.value)} /></div>
            <div className="sm:w-64"><label className="block text-xs font-semibold text-slate-700 mb-1.5">Tank</label>
              <select className={inputClass} value={reportTank} onChange={(e) => setReportTank(e.target.value)}>
                <option value="">All tanks</option>{tanks.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select></div>
            <button type="button" onClick={download} disabled={!month || downloading} className={btnPrimary}>{downloading ? <Spinner /> : <FileDown size={16} />} Download Excel</button>
          </div>
        </section>
      )}
    </div>
  );
}