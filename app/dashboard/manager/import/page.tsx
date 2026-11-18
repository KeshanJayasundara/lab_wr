"use client";

import React, { useEffect, useRef, useState } from "react";
import { Upload, Download, FileSpreadsheet, CheckCircle2, AlertTriangle, XCircle, Loader2, Copy } from "lucide-react";

const glass =
  "bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_32px_rgba(15,23,42,0.10)] ring-1 ring-inset ring-white/40";

type Row = {
  line: number;
  ref?: string;
  sheet?: string;
  state: "ok" | "duplicate" | "error";
  message?: string;
  dateKey?: string;
  categoryName?: string;
  unitName?: string;
  parameter?: string;
  value?: number;
  status?: string;
};
type Summary = { total: number; ok: number; duplicate: number; error: number; months: { month: string; count: number }[] };

type SheetSummary = { name: string; days: number; ok: number; duplicate: number; error: number };
type Category = { id: string; name: string };

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const monthLabel = (ym: string) => `${MONTH_NAMES[+ym.slice(5, 7) - 1]} ${ym.slice(0, 4)}`;

const TEMPLATE_CSV =
  "Date,Category,Unit,Parameter,Value,Measure Unit,Tested By\r\n" +
  "2026-03-01,Daily Testing,Balance Tank,pH,7.2,pH,\r\n" +
  "2026-03-01,Daily Testing,Balance Tank,COD,85,mg/L,\r\n" +
  "15/03/2026,Daily Testing,Disinfection Tank,pH,7.4,pH,\r\n";

export default function ImportPastDataPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [markVerified, setMarkVerified] = useState(true);
  const [allowUnknown, setAllowUnknown] = useState(false);
  const [loading, setLoading] = useState<"" | "preview" | "commit">("");
  const [error, setError] = useState("");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [onlyProblems, setOnlyProblems] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [format, setFormat] = useState<"template" | "table" | "">("");
  const [sheets, setSheets] = useState<SheetSummary[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [notes, setNotes] = useState<string[]>([]);
  const [done, setDone] = useState<{ imported: number; months: { month: string; count: number }[] } | null>(null);

  useEffect(() => {
    fetch("/api/manager/categories")
      .then((r) => r.json())
      .then((j) => {
        if (!j.success) return;
        const list: Category[] = j.data.map((c: any) => ({ id: c.id, name: c.name }));
        setCategories(list);
        const daily = list.find((c) => /daily/i.test(c.name)) || list[0];
        if (daily) setCategoryId(daily.id);
      })
      .catch(() => {});
  }, []);

  const reset = () => { setSummary(null); setRows([]); setError(""); setDone(null); setSheets([]); setSelected([]); setNotes([]); setFormat(""); };

  async function send(mode: "preview" | "commit") {
    if (!file) return;
    setLoading(mode);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("mode", mode);
      fd.append("markVerified", String(markVerified));
      fd.append("allowUnknownParams", String(allowUnknown));
      fd.append("categoryId", categoryId);
      if (mode === "commit" && format === "template") fd.append("sheets", JSON.stringify(selected));
      const res = await fetch("/api/manager/import", { method: "POST", body: fd });
      const json = await res.json();
      if (!json.success) { setError(json.error || "Something went wrong"); return; }
      if (mode === "preview") {
        setSummary(json.summary);
        setRows(json.rows);
        setFormat(json.format);
        setSheets(json.sheets || []);
        setSelected((json.sheets || []).filter((x: SheetSummary) => x.ok + x.duplicate + x.error > 0).map((x: SheetSummary) => x.name));
        setNotes(json.notes || []);
        setDone(null);
      }
      else { setDone({ imported: json.imported, months: json.summary.months }); setSummary(null); setRows([]); setSheets([]); setSelected([]); setNotes([]); setFormat(""); setFile(null); if (fileRef.current) fileRef.current.value = ""; }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading("");
    }
  }

  function downloadTemplate() {
    const blob = new Blob([TEMPLATE_CSV], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "past_data_template.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  // only rows of the ticked sheets count (table-format files have no sheets)
  const active = format === "template" ? rows.filter((r) => !r.sheet || selected.includes(r.sheet)) : rows;
  const okCount = active.filter((r) => r.state === "ok").length;
  const dupCount = active.filter((r) => r.state === "duplicate").length;
  const errCount = active.filter((r) => r.state === "error").length;
  const monthCounts = Object.entries(
    active.filter((r) => r.state === "ok").reduce<Record<string, number>>((acc, r) => {
      const m = (r.dateKey as string).slice(0, 7);
      acc[m] = (acc[m] || 0) + 1;
      return acc;
    }, {})
  ).sort(([a], [b]) => a.localeCompare(b));
  const problemRows = active.filter((r) => r.state !== "ok");
  const shown = (onlyProblems ? problemRows : active).slice(0, 300);

  return (
    <div className="max-w-6xl mx-auto space-y-5 p-1">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Import Past Data</h1>
        <p className="text-xs text-slate-600 mt-1">
          Upload old test results (Excel or CSV). Each row is saved with its original date, so it shows up in the monthly Daily Testing report.
        </p>
      </div>

      {/* upload card */}
      <div className={`${glass} rounded-3xl p-5 space-y-4`}>
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/70 border border-white/80 text-xs font-semibold text-slate-700 cursor-pointer hover:bg-white/90 transition-all shadow-sm">
            <Upload size={14} /> {file ? "Change file" : "Choose .xlsx / .csv file"}
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.csv"
              className="hidden"
              onChange={(e) => { setFile(e.target.files?.[0] || null); reset(); }}
            />
          </label>
          {file && (
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-700">
              <FileSpreadsheet size={14} /> {file.name}
            </span>
          )}
          <button
            type="button"
            onClick={downloadTemplate}
            className="ml-auto inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:underline cursor-pointer"
          >
            <Download size={14} /> Download template
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-700">
          <span className="font-semibold">Test category</span>
          <select
            value={categoryId}
            onChange={(e) => { setCategoryId(e.target.value); setSummary(null); setRows([]); setSheets([]); setNotes([]); setFormat(""); }}
            className="px-3 py-2 rounded-2xl border border-white/70 bg-white/60 text-xs text-slate-800 cursor-pointer"
          >
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <span className="text-[11px] text-slate-500">(needed for the Daily Testing Excel format)</span>
        </div>

        <div className="text-[11px] text-slate-600 leading-relaxed">
          <b>Option 1:</b> upload the <b>Daily Testing Excel</b> (the monthly report layout: one sheet per month, one column per day). Every sheet with dates in row 3 is read; formula cells are ignored.<br />
          <b>Option 2:</b> a simple table file. Columns: <b>Date</b>, <b>Unit</b>, <b>Parameter</b>, <b>Value</b> (required) and <b>Category</b>, <b>Measure Unit</b>, <b>Tested By</b> (optional).
          One row per result. Date can be 2026-03-15 or 15/03/2026. Unit and Parameter names must match what is already set up in the system.
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-700">
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={markVerified} onChange={(e) => { setMarkVerified(e.target.checked); setSummary(null); setRows([]); }} />
            Mark imported records as verified
          </label>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={allowUnknown} onChange={(e) => { setAllowUnknown(e.target.checked); setSummary(null); setRows([]); }} />
            Allow parameters that have no range set up (status = Normal)
          </label>
        </div>

        <button
          type="button"
          disabled={!file || loading !== ""}
          onClick={() => send("preview")}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-blue-600 text-white text-xs font-semibold shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all"
        >
          {loading === "preview" ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Check file
        </button>

        {error && <div className="text-xs text-red-700 bg-red-400/20 border border-red-400/40 rounded-2xl px-4 py-2.5">{error}</div>}
      </div>

      {/* success */}
      {done && (
        <div className="rounded-3xl p-5 bg-emerald-400/20 border border-emerald-400/40 text-emerald-800 text-sm space-y-1">
          <div className="font-bold flex items-center gap-2"><CheckCircle2 size={16} /> {done.imported} records imported</div>
          <div className="text-xs">
            {done.months.map((m) => `${monthLabel(m.month)}: ${m.count}`).join("  •  ")}
          </div>
          <div className="text-xs">Open <b>Reports &amp; Exports</b> and pick those months to download the monthly reports.</div>
        </div>
      )}

      {/* preview */}
      {summary && (
        <div className={`${glass} rounded-3xl p-5 space-y-4`}>
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            <span className="px-3 py-1.5 rounded-full bg-white/60 border border-white/70 text-slate-700">{active.length} values</span>
            <span className="px-3 py-1.5 rounded-full bg-emerald-400/20 border border-emerald-400/40 text-emerald-700">{okCount} ready</span>
            <span className="px-3 py-1.5 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-700">{dupCount} duplicates (skipped)</span>
            <span className="px-3 py-1.5 rounded-full bg-red-400/20 border border-red-400/40 text-red-700">{errCount} errors (skipped)</span>
          </div>

          {format === "template" && sheets.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-xs font-semibold text-slate-700">Sheets to import</div>
              <div className="flex flex-wrap gap-2">
                {sheets.map((sh) => {
                  const total = sh.ok + sh.duplicate + sh.error;
                  const on = selected.includes(sh.name);
                  return (
                    <label
                      key={sh.name}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs ${total === 0 ? "opacity-50 cursor-not-allowed" : "cursor-pointer"} ${on ? "bg-blue-400/20 border-blue-400/50 text-blue-800" : "bg-white/60 border-white/70 text-slate-700"}`}
                    >
                      <input
                        type="checkbox"
                        disabled={total === 0}
                        checked={on}
                        onChange={() => setSelected((cur) => (cur.includes(sh.name) ? cur.filter((n) => n !== sh.name) : [...cur, sh.name]))}
                      />
                      {sh.name}
                      <span className="text-[11px] text-slate-500">{total === 0 ? "no values" : `${sh.ok} ready`}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {monthCounts.length > 0 && (
            <div className="text-xs text-slate-700">
              Will be added to: {monthCounts.map(([m, n]) => `${monthLabel(m)} (${n})`).join(", ")}
            </div>
          )}

          {notes.length > 0 && (
            <details className="text-xs text-amber-800 bg-amber-400/15 border border-amber-400/40 rounded-2xl px-4 py-2.5">
              <summary className="cursor-pointer font-semibold">{notes.length} row{notes.length > 1 ? "s" : ""} of the sheet could not be matched (skipped)</summary>
              <ul className="mt-2 list-disc pl-5 space-y-1">
                {notes.map((n, i) => <li key={i}>{n}</li>)}
              </ul>
            </details>
          )}

          <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
            <input type="checkbox" checked={onlyProblems} onChange={(e) => setOnlyProblems(e.target.checked)} /> Show only problem rows
          </label>

          <div className="overflow-x-auto rounded-2xl border border-white/60 bg-white/40">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-600 border-b border-white/60">
                  <th className="px-3 py-2">{format === "template" ? "Cell" : "Row"}</th>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Unit</th>
                  <th className="px-3 py-2">Parameter</th>
                  <th className="px-3 py-2">Value</th>
                  <th className="px-3 py-2">Result</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r, i) => (
                  <tr key={i} className="border-b border-white/40 last:border-0">
                    <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{r.ref || r.line}</td>
                    <td className="px-3 py-2">{r.dateKey || "-"}</td>
                    <td className="px-3 py-2">{r.unitName || "-"}</td>
                    <td className="px-3 py-2">{r.parameter || "-"}</td>
                    <td className="px-3 py-2">{r.value ?? "-"}</td>
                    <td className="px-3 py-2">
                      {r.state === "ok" && <span className="inline-flex items-center gap-1 text-emerald-700"><CheckCircle2 size={13} /> OK{r.status && r.status !== "Normal" ? ` (${r.status})` : ""}</span>}
                      {r.state === "duplicate" && <span className="inline-flex items-center gap-1 text-amber-700"><Copy size={13} /> {r.message}</span>}
                      {r.state === "error" && <span className="inline-flex items-center gap-1 text-red-700"><XCircle size={13} /> {r.message}</span>}
                    </td>
                  </tr>
                ))}
                {shown.length === 0 && (
                  <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">Nothing to show</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {(onlyProblems ? problemRows.length : active.length) > 300 && (
            <div className="text-[11px] text-slate-500">Showing the first 300 rows. All valid rows are imported.</div>
          )}

          {errCount > 0 && (
            <div className="flex items-start gap-2 text-xs text-amber-800">
              <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
              Rows with errors will NOT be imported. Fix them in your file and check again, or import the valid rows now and add the rest later.
            </div>
          )}

          <button
            type="button"
            disabled={okCount === 0 || loading !== ""}
            onClick={() => send("commit")}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-600 text-white text-xs font-semibold shadow-sm hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all"
          >
            {loading === "commit" ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} Import {okCount} records
          </button>
        </div>
      )}
    </div>
  );
}