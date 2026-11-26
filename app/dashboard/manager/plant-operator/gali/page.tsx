// >>> SAVE AS: app/dashboard/manager/plant-operator/gali/page.tsx   (UPDATED - replace the whole file) - delete this line after saving <<<
"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, FileDown, PlusCircle, Save, Trash2, Truck } from "lucide-react";
import {
  api, btnDanger, btnGhost, btnPrimary, colomboToday, downloadFile, glass, inputClass,
  NoticeBox, PageTitle, send, Spinner, Tabs, type Notice,
} from "@/components/manager/plant/ui";

type Param = { id: string; name: string; unit: string | null; min: number; max: number };
type Check = { id: string; esValue: number; phValue: number; decision: string; checkedBy: string; createdAt: string; vehicle: { vehicleNumber: string } };
type Tab = "parameters" | "daily" | "report";

export default function ManagerGali() {
  const [tab, setTab] = useState<Tab>("parameters");
  const [notice, setNotice] = useState<Notice>(null);
  const fail = (e: any) => setNotice({ type: "error", text: e.message });
  const ok = (text: string) => setNotice({ type: "success", text });

  // ---- parameters ----
  const [params, setParams] = useState<Param[]>([]);
  const [form, setForm] = useState({ name: "", unit: "", min: "", max: "" });
  const [editId, setEditId] = useState<string | null>(null);
  const loadParams = useCallback(async () => { try { setParams(await api("/api/manager/plant/gali/parameters")); } catch (e) { fail(e); } }, []);

  // ---- daily ----
  const [date, setDate] = useState("");
  const [daily, setDaily] = useState<Check[] | null>(null);
  const loadDaily = useCallback(async (d: string) => {
    try { setDaily((await api<{ rows: Check[] }>(`/api/manager/plant/gali/daily?date=${d}`)).rows); } catch (e) { fail(e); }
  }, []);

  // ---- report ----
  const [month, setMonth] = useState("");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const today = colomboToday();
    setDate(today); setMonth(today.slice(0, 7));
    loadParams(); loadDaily(today);
  }, [loadParams, loadDaily]);

  const saveParam = async (e: React.FormEvent) => {
    e.preventDefault(); setNotice(null);
    try {
      await send("/api/manager/plant/gali/parameters", editId ? "PUT" : "POST", { ...form, id: editId });
      setForm({ name: "", unit: "", min: "", max: "" }); setEditId(null);
      ok(editId ? "Parameter updated." : "Parameter added."); loadParams();
    } catch (err) { fail(err); }
  };
  const delParam = async (p: Param) => {
    if (!confirm(`Delete parameter ${p.name}?`)) return;
    try { await send(`/api/manager/plant/gali/parameters?id=${p.id}`, "DELETE"); loadParams(); } catch (err) { fail(err); }
  };

  const download = async () => {
    setDownloading(true); setNotice(null);
    try { await downloadFile(`/api/manager/plant/gali/report?month=${month}`, `Gali-Report-${month}.pdf`); } catch (err) { fail(err); }
    finally { setDownloading(false); }
  };

  const approved = daily?.filter((c) => c.decision === "APPROVED").length ?? 0;

  return (
    <div className="w-full min-w-0 space-y-4 sm:space-y-6">
      <Link href="/dashboard/manager/plant-operator" className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:underline"><ArrowLeft size={14} /> Plant Operator</Link>
      <PageTitle icon={<Truck size={20} />} title="Gali Operator" sub="ES / PH ranges, daily data and the monthly report." tile="from-emerald-400 to-teal-500 shadow-emerald-500/30" />
      <Tabs<Tab> value={tab} onChange={(t) => { setTab(t); setNotice(null); }} tabs={[
        { id: "parameters", label: "Parameters & Ranges" },
        { id: "daily", label: "Daily Data" }, { id: "report", label: "Monthly Report" },
      ]} />
      <NoticeBox notice={notice} />

      {tab === "parameters" && (
        <section className={`${glass} rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4`}>
          <p className="text-xs text-slate-600">The Gali operator&apos;s Approval / Reject uses the <b>ES</b> and <b>PH</b> ranges below. Other parameters are listed for reference.</p>
          <form onSubmit={saveParam} className="grid grid-cols-2 lg:grid-cols-[1fr_120px_120px_120px_auto] gap-3 items-end">
            <div className="col-span-2 lg:col-span-1"><label className="block text-xs font-semibold text-slate-700 mb-1.5">Parameter</label>
              <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. ES" maxLength={40} /></div>
            <div><label className="block text-xs font-semibold text-slate-700 mb-1.5">Unit</label>
              <input className={inputClass} value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="optional" /></div>
            <div><label className="block text-xs font-semibold text-slate-700 mb-1.5">Min</label>
              <input className={inputClass} type="number" step="any" value={form.min} onChange={(e) => setForm({ ...form, min: e.target.value })} /></div>
            <div><label className="block text-xs font-semibold text-slate-700 mb-1.5">Max</label>
              <input className={inputClass} type="number" step="any" value={form.max} onChange={(e) => setForm({ ...form, max: e.target.value })} /></div>
            <div className="col-span-2 lg:col-span-1 flex gap-2">
              <button type="submit" disabled={!form.name.trim() || form.min === "" || form.max === ""} className={btnPrimary}>{editId ? <Save size={16} /> : <PlusCircle size={16} />} {editId ? "Save" : "Add"}</button>
              {editId && <button type="button" className={btnGhost} onClick={() => { setEditId(null); setForm({ name: "", unit: "", min: "", max: "" }); }}>Cancel</button>}
            </div>
          </form>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[480px]">
              <thead><tr className="text-left text-xs text-slate-600 border-b border-white/60">
                <th className="py-2 pr-3">Parameter</th><th className="py-2 pr-3">Unit</th><th className="py-2 pr-3">Min</th><th className="py-2 pr-3">Max</th><th className="py-2" /></tr></thead>
              <tbody>
                {params.map((p) => (
                  <tr key={p.id} className="border-b border-white/40 last:border-0 text-slate-700">
                    <td className="py-2 pr-3 font-semibold">{p.name}</td><td className="py-2 pr-3">{p.unit || "-"}</td>
                    <td className="py-2 pr-3">{p.min}</td><td className="py-2 pr-3">{p.max}</td>
                    <td className="py-2 flex gap-2 justify-end">
                      <button type="button" className={btnGhost} onClick={() => { setEditId(p.id); setForm({ name: p.name, unit: p.unit || "", min: String(p.min), max: String(p.max) }); }}>Edit</button>
                      <button type="button" className={btnDanger} onClick={() => delParam(p)}><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === "daily" && (
        <section className={`${glass} rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4`}>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="sm:w-60"><label className="block text-xs font-semibold text-slate-700 mb-1.5">Date</label>
              <input type="date" className={inputClass} value={date} max={colomboToday()} onChange={(e) => { setDate(e.target.value); setDaily(null); if (e.target.value) loadDaily(e.target.value); }} /></div>
            {daily && <p className="text-sm text-slate-700 pb-2.5">{daily.length} checks - <span className="text-emerald-700 font-semibold">{approved} approved</span>, <span className="text-red-700 font-semibold">{daily.length - approved} rejected</span></p>}
          </div>
          {!daily ? <div className="h-16 rounded bg-white/50 animate-pulse" /> : daily.length === 0 ? <p className="text-sm text-slate-500">No checks on this day.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[560px]">
                <thead><tr className="text-left text-xs text-slate-600 border-b border-white/60">
                  <th className="py-2 pr-3">Time</th><th className="py-2 pr-3">Vehicle</th><th className="py-2 pr-3">ES</th><th className="py-2 pr-3">PH</th><th className="py-2 pr-3">Decision</th><th className="py-2">By</th></tr></thead>
                <tbody>
                  {daily.map((c) => (
                    <tr key={c.id} className="border-b border-white/40 last:border-0 text-slate-700">
                      <td className="py-2 pr-3 whitespace-nowrap">{new Date(c.createdAt).toLocaleTimeString("en-GB", { timeZone: "Asia/Colombo", hour: "2-digit", minute: "2-digit" })}</td>
                      <td className="py-2 pr-3 font-semibold">{c.vehicle.vehicleNumber}</td><td className="py-2 pr-3">{c.esValue}</td><td className="py-2 pr-3">{c.phValue}</td>
                      <td className="py-2 pr-3"><span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border ${c.decision === "APPROVED" ? "bg-emerald-400/20 text-emerald-700 border-emerald-400/40" : "bg-red-400/20 text-red-700 border-red-400/40"}`}>{c.decision === "APPROVED" ? "Approved" : "Rejected"}</span></td>
                      <td className="py-2">{c.checkedBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {tab === "report" && (
        <section className={`${glass} rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4`}>
          <p className="text-xs text-slate-600">Select a month and download all Gali checks of that month as a PDF.</p>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="sm:w-60"><label className="block text-xs font-semibold text-slate-700 mb-1.5">Month</label>
              <input type="month" className={inputClass} value={month} max={colomboToday().slice(0, 7)} onChange={(e) => setMonth(e.target.value)} /></div>
            <button type="button" onClick={download} disabled={!month || downloading} className={btnPrimary}>{downloading ? <Spinner /> : <FileDown size={16} />} Download PDF</button>
          </div>
        </section>
      )}
    </div>
  );
}