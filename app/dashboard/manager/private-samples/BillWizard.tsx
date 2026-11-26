"use client";

/**
 * Bill / Quotation wizard
 *
 *  1. Customer   name, address, phone
 *  2. Samples    number of samples
 *  3. Tests      pick the parameters the customer asked for (from the private-sample price list)
 *  4. SSCL       type the SSCL rate – amount is calculated from the parameters' subtotal
 *  5. VAT        type the VAT rate – VAT is calculated on (subtotal + SSCL)
 *  6. Preview    the A4 quotation
 *  7. PDF        generated PDF with Download / Print
 *
 * The total builds up at the bottom while you go through the steps.
 */

import { formatChem } from "@/lib/chemFormat";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { X, Check, ChevronLeft, ChevronRight, Loader2, Download, Printer, FileText, Search, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uniqueByParameter, calcQuotation } from "@/lib/privateBilling";
import QuotationDoc, { A4_W, A4_H, type QuotationData } from "./QuotationDoc";

type Category = { id: string; name: string };
type SubCategory = { id: string; categoryId: string; name: string };
type PriceRow = {
  id: string;
  categoryId: string;
  subCategoryId: string | null;
  parameterId: string;
  parameterName: string;
  unit: string | null;
  price: number;
};

const STEPS = ["Customer", "Samples", "Tests", "SSCL", "VAT", "Preview", "PDF"];

const field =
  "w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-white text-sm font-medium text-slate-800 placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/60";
const money = (n: number) => `Rs. ${n.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const key = (s: string) => s.trim().toLowerCase();
const today = () => new Date().toISOString().slice(0, 10);
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export default function BillWizard({
  categories, subs, prices, onClose,
}: {
  categories: Category[];
  subs: SubCategory[];
  prices: PriceRow[];
  onClose: () => void;
}) {
  const [step, setStep] = useState(1);
  const [err, setErr] = useState("");

  // 1
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [date, setDate] = useState(today());
  // 2
  const [samples, setSamples] = useState("1");
  // 3
  const [catId, setCatId] = useState(categories[0]?.id ?? "");
  const [selected, setSelected] = useState<Record<string, boolean>>({}); // by parameterId
  const [search, setSearch] = useState("");
  // 4 + 5
  const [ssclRate, setSsclRate] = useState("2.5");
  const [vatRate, setVatRate] = useState("18");
  // 7
  const [pdfUrl, setPdfUrl] = useState("");
  const [generating, setGenerating] = useState(false);

  const captureRef = useRef<HTMLDivElement>(null);
  const previewWrap = useRef<HTMLDivElement>(null);
  const pdfFrame = useRef<HTMLIFrameElement>(null);
  const [scale, setScale] = useState(0.7);

  /* ── derived numbers ── */

  const samplesNum = Math.floor(Number(samples));
  const samplesOk = Number.isFinite(samplesNum) && samplesNum >= 1;
  const n = samplesOk ? samplesNum : 1;
  const ssclNum = Number(ssclRate);
  const vatNum = Number(vatRate);
  const ssclOk = ssclRate.trim() !== "" && Number.isFinite(ssclNum) && ssclNum >= 0 && ssclNum < 100;
  const vatOk = vatRate.trim() !== "" && Number.isFinite(vatNum) && vatNum >= 0 && vatNum <= 100;

  const catRows = useMemo(() => prices.filter((p) => p.categoryId === catId), [prices, catId]);
  // a parameter that sits in several sub-categories is charged only once
  const chosen = useMemo(() => uniqueByParameter(catRows.filter((r) => selected[r.parameterId])), [catRows, selected]);
  const lines = chosen.map((r) => ({ name: r.parameterName, cost: round2(r.price * n) }));
  const subtotal = round2(lines.reduce((a, l) => a + l.cost, 0));
  const calc = calcQuotation(subtotal, ssclOk ? ssclNum : 0, vatOk ? vatNum : 0);
  const categoryName = categories.find((c) => c.id === catId)?.name ?? "";

  const groups = useMemo(() => {
    const list: { id: string; name: string; rows: PriceRow[] }[] = subs
      .filter((s) => s.categoryId === catId)
      .map((s) => ({ id: s.id, name: s.name, rows: catRows.filter((r) => r.subCategoryId === s.id) }));
    const loose = catRows.filter((r) => !r.subCategoryId);
    if (loose.length) list.push({ id: "none", name: "No sub-category", rows: loose });
    return list.filter((g) => g.rows.length > 0);
  }, [subs, catRows, catId]);

  const alsoIn = (r: PriceRow) =>
    catRows
      .filter((x) => x.parameterId === r.parameterId && x.id !== r.id)
      .map((x) => subs.find((s) => s.id === x.subCategoryId)?.name ?? "No sub-category");

  const docData: QuotationData = {
    customer: { name: name.trim(), address: address.trim(), phone: phone.trim() },
    date,
    categoryName,
    samples: n,
    lines,
    sscl: calc.sscl,
    vat: calc.vat,
    vatRate: vatOk ? vatNum : 0,
    subtotal: calc.subtotal,
    total: calc.total,
  };

  /* ── effects ── */

  // fit the A4 preview into the available width
  useEffect(() => {
    if (step !== 6 || !previewWrap.current) return;
    const el = previewWrap.current;
    const fit = () => setScale(Math.min(1, (el.clientWidth - 2) / A4_W));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [step]);

  // free the generated PDF when the wizard closes
  const urlRef = useRef("");
  urlRef.current = pdfUrl;
  useEffect(() => () => { if (urlRef.current) URL.revokeObjectURL(urlRef.current); }, []);

  /* ── navigation ── */

  const validate = (s: number): string => {
    if (s === 1) {
      if (!name.trim()) return "Enter the customer name";
      if (!address.trim()) return "Enter the address";
    }
    if (s === 2 && !samplesOk) return "Number of samples must be 1 or more";
    if (s === 3) {
      if (!catId) return "Select a category";
      if (chosen.length === 0) return "Select at least one test";
    }
    if (s === 4 && !ssclOk) return "Enter a valid SSCL rate (0 – 99.9)";
    if (s === 5 && !vatOk) return "Enter a valid VAT rate (0 – 100)";
    return "";
  };

  const next = () => {
    const e = validate(step);
    if (e) return setErr(e);
    setErr("");
    if (step === 6) return void makePdf();
    setStep((s) => s + 1);
  };
  const back = () => { setErr(""); setStep((s) => Math.max(1, s - 1)); };

  const toggleParam = (id: string) => { setSelected((cur) => ({ ...cur, [id]: !cur[id] })); setErr(""); };
  const toggleGroup = (rows: PriceRow[]) => {
    const all = rows.every((r) => selected[r.parameterId]);
    setSelected((cur) => {
      const nx = { ...cur };
      rows.forEach((r) => { nx[r.parameterId] = !all; });
      return nx;
    });
    setErr("");
  };

  /* ── PDF ── */

  const makePdf = async () => {
    if (!captureRef.current) return;
    setGenerating(true);
    setErr("");
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas-pro"), import("jspdf")]);
      const canvas = await html2canvas(captureRef.current, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
      const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
      const pageW = 210;
      const pageH = 297;
      const pxPerPage = Math.floor((canvas.width * pageH) / pageW);

      // a long list of tests simply continues on the next A4 page
      let y = 0;
      let first = true;
      while (y < canvas.height) {
        const h = Math.min(pxPerPage, canvas.height - y);
        const part = document.createElement("canvas");
        part.width = canvas.width;
        part.height = h;
        const ctx = part.getContext("2d")!;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, part.width, h);
        ctx.drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h);
        if (!first) pdf.addPage();
        pdf.addImage(part.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, pageW, (h * pageW) / canvas.width);
        y += h;
        first = false;
      }

      const url = URL.createObjectURL(pdf.output("blob"));
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      setPdfUrl(url);
      setStep(7);
    } catch {
      setErr("Couldn't create the PDF. Try again.");
    } finally {
      setGenerating(false);
    }
  };

  const fileName = `Quotation-${name.trim().replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "customer"}-${date}.pdf`;

  const download = () => {
    const a = document.createElement("a");
    a.href = pdfUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const print = () => {
    try {
      pdfFrame.current?.contentWindow?.focus();
      pdfFrame.current?.contentWindow?.print();
    } catch {
      window.open(pdfUrl, "_blank");
    }
  };

  /* ── running summary (the total builds up as the steps are completed) ── */

  const runningTotal = calc.subtotal + (step >= 4 ? calc.sscl : 0) + (step >= 5 ? calc.vat : 0);

  /* ───────────────────────── render ───────────────────────── */

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white shadow-2xl rounded-3xl w-full max-w-4xl max-h-[94vh] flex flex-col overflow-hidden">
        {/* header + stepper */}
        <div className="px-5 pt-4 pb-3 border-b border-slate-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
              <FileText size={20} className="text-blue-600" /> New bill
            </h3>
            <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer" title="Close">
              <X size={18} />
            </button>
          </div>
          <div className="flex items-center gap-1 mt-3 overflow-x-auto">
            {STEPS.map((label, i) => {
              const s = i + 1;
              const done = s < step;
              const cur = s === step;
              return (
                <React.Fragment key={label}>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span
                      className={`w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center ${
                        cur ? "bg-blue-600 text-white" : done ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500"
                      }`}
                    >
                      {done ? <Check size={13} /> : s}
                    </span>
                    <span className={`text-xs font-semibold hidden sm:inline ${cur ? "text-slate-900" : "text-slate-500"}`}>{label}</span>
                  </div>
                  {s < STEPS.length && <span className="h-px flex-1 min-w-[10px] bg-slate-200" />}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* body */}
        <div className="p-5 overflow-y-auto flex-1">
          {/* 1 – customer */}
          {step === 1 && (
            <div className="max-w-xl space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Customer name <span className="text-red-500">*</span></label>
                <input autoFocus value={name} onChange={(e) => { setName(e.target.value); setErr(""); }} placeholder="e.g. UK Engineering Services (PVT) Ltd," className={field} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Address <span className="text-red-500">*</span></label>
                <textarea rows={3} value={address} onChange={(e) => { setAddress(e.target.value); setErr(""); }} placeholder={"Maharagama Road,\nHokandara-North, Hokandara"} className={field} />
                <p className="text-[11px] text-slate-500">Each line is printed on its own line.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Phone number</label>
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="077 123 4567" className={field} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Date</label>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={field} />
                </div>
              </div>
            </div>
          )}

          {/* 2 – samples */}
          {step === 2 && (
            <div className="max-w-xs space-y-3">
              <label className="text-xs font-semibold text-slate-700">Number of samples <span className="text-red-500">*</span></label>
              <div className="flex items-center gap-2">
                <Button type="button" onClick={() => setSamples(String(Math.max(1, n - 1)))} className="h-11 w-11 rounded-2xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-lg font-bold cursor-pointer">−</Button>
                <input
                  autoFocus
                  type="number"
                  min={1}
                  step={1}
                  value={samples}
                  onChange={(e) => { setSamples(e.target.value); setErr(""); }}
                  className={`${field} text-center text-lg font-bold`}
                />
                <Button type="button" onClick={() => setSamples(String(n + 1))} className="h-11 w-11 rounded-2xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-lg font-bold cursor-pointer">+</Button>
              </div>
              <p className="text-[11px] text-slate-500">Every test price is multiplied by the number of samples.</p>
            </div>
          )}

          {/* 3 – tests */}
          {step === 3 && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-[220px_1fr] gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Category</label>
                  <select
                    value={catId}
                    onChange={(e) => { setCatId(e.target.value); setSelected({}); setErr(""); }}
                    className={field}
                  >
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Search tests</label>
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-3.5 text-slate-400" />
                    <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className={`${field} pl-8`} />
                  </div>
                </div>
              </div>

              {groups.length === 0 && (
                <p className="text-sm text-slate-500 py-6 text-center">No prices in this category yet. Add them in the price list first.</p>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {groups.map((g, gi) => {
                  const rows = g.rows.filter((r) => key(r.parameterName).includes(key(search)));
                  if (rows.length === 0) return null;
                  const all = rows.every((r) => selected[r.parameterId]);
                  return (
                    <div key={g.id} className="rounded-2xl border border-slate-200 overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-200">
                        <span className="text-sm font-bold text-slate-800">{g.id === "none" ? g.name : `${gi + 1}.0 ${g.name}`}</span>
                        <button type="button" onClick={() => toggleGroup(rows)} className="text-[11px] font-semibold text-blue-600 hover:underline cursor-pointer">
                          {all ? "Clear" : "Select all"}
                        </button>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {rows.map((r) => {
                          const also = alsoIn(r);
                          return (
                            <label key={r.id} className="flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-blue-50/50">
                              <input type="checkbox" checked={!!selected[r.parameterId]} onChange={() => toggleParam(r.parameterId)} className="w-4 h-4 accent-blue-600" />
                              <span className="flex-1 min-w-0">
                                <span className="block text-sm font-semibold text-slate-800 truncate">{formatChem(r.parameterName)}</span>
                                {also.length > 0 && <span className="block text-[10px] text-amber-600 truncate">Also in {also.join(", ")} · charged once</span>}
                              </span>
                              <span className="text-xs font-bold text-slate-600 tabular-nums">{money(r.price)}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4 – SSCL */}
          {step === 4 && (
            <div className="max-w-md space-y-4">
              <div className="rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3 flex justify-between text-sm">
                <span className="text-slate-600">Subtotal ({chosen.length} test{chosen.length === 1 ? "" : "s"} × {n} sample{n === 1 ? "" : "s"})</span>
                <b className="tabular-nums">{money(calc.subtotal)}</b>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">SSCL rate (%)</label>
                <input autoFocus type="number" step="0.01" min={0} value={ssclRate} onChange={(e) => { setSsclRate(e.target.value); setErr(""); }} className={field} />
                <p className="text-[11px] text-slate-500">SSCL = subtotal × rate ÷ (100 − rate), same as the NWSDB quotation.</p>
              </div>
              <div className="rounded-2xl bg-blue-50 border border-blue-100 px-4 py-3 flex justify-between text-sm">
                <span className="text-blue-800">SSCL amount</span>
                <b className="text-blue-900 tabular-nums">{money(calc.sscl)}</b>
              </div>
            </div>
          )}

          {/* 5 – VAT */}
          {step === 5 && (
            <div className="max-w-md space-y-4">
              <div className="rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3 text-sm space-y-1">
                <div className="flex justify-between"><span className="text-slate-600">Subtotal</span><b className="tabular-nums">{money(calc.subtotal)}</b></div>
                <div className="flex justify-between"><span className="text-slate-600">SSCL</span><b className="tabular-nums">{money(calc.sscl)}</b></div>
                <div className="flex justify-between border-t border-slate-200 pt-1"><span className="text-slate-600">Subtotal + SSCL</span><b className="tabular-nums">{money(calc.vatBase)}</b></div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">VAT rate (%)</label>
                <input autoFocus type="number" step="0.01" min={0} value={vatRate} onChange={(e) => { setVatRate(e.target.value); setErr(""); }} className={field} />
                <p className="text-[11px] text-slate-500">VAT is calculated on subtotal + SSCL.</p>
              </div>
              <div className="rounded-2xl bg-blue-50 border border-blue-100 px-4 py-3 text-sm space-y-1">
                <div className="flex justify-between"><span className="text-blue-800">VAT amount</span><b className="text-blue-900 tabular-nums">{money(calc.vat)}</b></div>
                <div className="flex justify-between text-base"><span className="font-bold text-blue-900">Total</span><b className="text-blue-900 tabular-nums">{money(calc.total)}</b></div>
              </div>
            </div>
          )}

          {/* 6 – preview */}
          {step === 6 && (
            <div ref={previewWrap} className="w-full">
              <div className="mx-auto border border-slate-200 shadow-md bg-white overflow-hidden" style={{ width: A4_W * scale, height: A4_H * scale }}>
                <div style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: A4_W }}>
                  <QuotationDoc data={docData} />
                </div>
              </div>
            </div>
          )}

          {/* 7 – generated PDF */}
          {step === 7 && pdfUrl && (
            <iframe ref={pdfFrame} src={pdfUrl} title="Quotation PDF" className="w-full rounded-2xl border border-slate-200" style={{ height: "68vh" }} />
          )}
        </div>

        {/* running total */}
        {step >= 3 && (
          <div className="px-5 py-2 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs flex-shrink-0">
            <span className="text-slate-500">Subtotal <b className="text-slate-800 tabular-nums">{money(calc.subtotal)}</b></span>
            {step >= 4 && <span className="text-slate-500">SSCL <b className="text-slate-800 tabular-nums">{money(calc.sscl)}</b></span>}
            {step >= 5 && <span className="text-slate-500">VAT {vatOk ? vatNum : 0}% <b className="text-slate-800 tabular-nums">{money(calc.vat)}</b></span>}
            <span className="ml-auto text-sm text-slate-600">{step >= 5 ? "Total" : "Total so far"} <b className="text-base text-slate-900 tabular-nums">{money(round2(runningTotal))}</b></span>
          </div>
        )}

        {/* footer buttons */}
        <div className="px-5 py-3 border-t border-slate-200 flex items-center gap-3 flex-shrink-0">
          {err && (
            <p className="flex items-center gap-1.5 text-xs font-semibold text-red-600">
              <AlertCircle size={14} /> {err}
            </p>
          )}
          <div className="ml-auto flex items-center gap-2">
            {step === 1 && (
              <Button type="button" onClick={onClose} className="bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-full h-10 px-5 font-semibold cursor-pointer">Cancel</Button>
            )}
            {step > 1 && (
              <Button type="button" onClick={back} disabled={generating} className="bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-full h-10 px-4 font-semibold cursor-pointer flex items-center gap-1 disabled:opacity-50">
                <ChevronLeft size={16} /> Back
              </Button>
            )}
            {step < 6 && (
              <Button type="button" onClick={next} className="bg-blue-600 hover:bg-blue-700 text-white rounded-full h-10 px-5 font-semibold cursor-pointer flex items-center gap-1">
                Next <ChevronRight size={16} />
              </Button>
            )}
            {step === 6 && (
              <Button type="button" onClick={next} disabled={generating} className="bg-blue-600 hover:bg-blue-700 text-white rounded-full h-10 px-5 font-semibold cursor-pointer flex items-center gap-2 disabled:opacity-60">
                {generating ? <Loader2 className="animate-spin h-4 w-4" /> : <FileText size={16} />} Create PDF
              </Button>
            )}
            {step === 7 && (
              <>
                <Button type="button" onClick={print} className="bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-full h-10 px-5 font-semibold cursor-pointer flex items-center gap-2">
                  <Printer size={16} /> Print
                </Button>
                <Button type="button" onClick={download} className="bg-blue-600 hover:bg-blue-700 text-white rounded-full h-10 px-5 font-semibold cursor-pointer flex items-center gap-2">
                  <Download size={16} /> Download PDF
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* full-size copy of the document used to make the PDF (kept off-screen) */}
      {step >= 6 && (
        <div style={{ position: "fixed", left: -10000, top: 0, pointerEvents: "none" }} aria-hidden="true">
          <QuotationDoc ref={captureRef} data={docData} />
        </div>
      )}
    </div>
  );
}