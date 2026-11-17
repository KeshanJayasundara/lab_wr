"use client";

import React, { useEffect, useRef, useState } from "react";
import { FileText, Plus, Search, CheckCircle, AlertTriangle, FlaskConical, X, ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

// Shared "frosted glass" look (same as the other pages)
const glass =
  "bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_32px_rgba(15,23,42,0.10)] ring-1 ring-inset ring-white/40";

// Glass form controls
// Phones: 16px text (stops iOS zoom-on-focus) + 44px tap height. sm and up: compact.
const glassField =
  "w-full px-3.5 py-2.5 min-h-[44px] sm:min-h-0 rounded-2xl border border-white/70 bg-white/60 backdrop-blur-xl text-base sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 shadow-sm " +
  "transition-all duration-300 ease-out hover:bg-white/85 hover:border-blue-300 " +
  "focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:bg-white/90";

type Option = { value: string; label: string };

// Custom glass dropdown: every option has a hover animation
function GlassSelect({
  value,
  options,
  onChange,
}: {
  value: string;
  options: Option[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  // Keep the whole list visible when it opens near the bottom of the screen / modal
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(
      () => listRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }),
      30
    );
    return () => clearTimeout(t);
  }, [open]);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`${glassField} cursor-pointer flex items-center justify-between gap-2 text-left hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(59,130,246,0.25)]`}
      >
        <span className="truncate">{selected?.label ?? value}</span>
        <ChevronDown
          size={16}
          className={`flex-shrink-0 text-blue-600 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <ul
          ref={listRef}
          role="listbox"
          className="absolute z-50 mt-2 w-full origin-top rounded-2xl p-1.5 space-y-0.5 bg-white/90 backdrop-blur-2xl border border-white/70 ring-1 ring-inset ring-white/50 shadow-[0_16px_40px_rgba(15,23,42,0.18)] animate-in fade-in zoom-in-95 slide-in-from-top-1 duration-150"
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <li
                key={opt.value}
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`flex items-center justify-between gap-3 px-3 py-3 sm:py-2 rounded-xl text-sm sm:text-xs cursor-pointer transition-all duration-200 ease-out hover:bg-blue-500/15 hover:text-blue-700 hover:translate-x-1 ${
                  isSelected ? "bg-blue-500/10 font-semibold text-blue-700" : "text-slate-700"
                }`}
              >
                <span className="min-w-0 break-words">{opt.label}</span>
                {isSelected && <Check size={14} className="flex-shrink-0 text-blue-600" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return status === "Passed" ? (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-xl bg-emerald-400/20 text-emerald-700 border border-emerald-400/40 whitespace-nowrap">
      <CheckCircle size={12} /> Passed
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-xl bg-amber-400/20 text-amber-700 border border-amber-400/40 whitespace-nowrap">
      <AlertTriangle size={12} /> Warning
    </span>
  );
}

const testTypeOptions: Option[] = [
  { value: "BOD Analysis", label: "BOD Analysis (Links to NaOH)" },
  { value: "COD Test", label: "COD Test (Links to HCl)" },
  { value: "pH Level Test", label: "pH Level Test (Links to Buffer Solution)" },
  { value: "Turbidity Test", label: "Turbidity Test (Links to Alum Solution)" },
];

const statusOptions: Option[] = [
  { value: "Passed", label: "Passed (Within permissible water discharge limits)" },
  { value: "Warning", label: "Warning (Approaching threshold limits)" },
];

export default function AdminTestRecordsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states for new test entry
  const [testType, setTestType] = useState("BOD Analysis");
  const [sampleId, setSampleId] = useState("SMP-2026-089");
  const [testedBy, setTestedBy] = useState("Chaminda Perera");
  const [resultValue, setResultValue] = useState("");
  const [status, setStatus] = useState("Passed");

  // Mock Test Records Data
  const [testRecords, setTestRecords] = useState([
    { id: 1, testNo: "TR-1042", sample: "SMP-2026-084", type: "BOD Analysis", result: "12.4 mg/L", chemicalUsed: "Sodium Hydroxide (15ml)", technician: "Chaminda Perera", date: "2026-10-24", status: "Passed" },
    { id: 2, testNo: "TR-1043", sample: "SMP-2026-085", type: "COD Test", result: "45.0 mg/L", chemicalUsed: "Hydrochloric Acid (10ml)", technician: "Anusha Silva", date: "2026-10-24", status: "Passed" },
    { id: 3, testNo: "TR-1044", sample: "SMP-2026-086", type: "pH Level Test", result: "8.2 pH", chemicalUsed: "Buffer Solution (5ml)", technician: "Chaminda Perera", date: "2026-10-25", status: "Warning" },
    { id: 4, testNo: "TR-1045", sample: "SMP-2026-087", type: "Turbidity Test", result: "4.1 NTU", chemicalUsed: "Alum Solution (20g)", technician: "Anusha Silva", date: "2026-10-25", status: "Passed" },
  ]);

  const filteredRecords = testRecords.filter(rec =>
    rec.testNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rec.sample.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rec.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rec.technician.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Lock page scroll behind the modal + close on Escape
  useEffect(() => {
    if (!isModalOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsModalOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [isModalOpen]);

  // Submit New Test Record & Trigger Chemical Deduction
  const handleTestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resultValue) return;

    // Determine chemical deduction string based on test type
    let linkedChemical = "Sodium Hydroxide (10ml)";
    if (testType === "COD Test") linkedChemical = "Hydrochloric Acid (15ml)";
    if (testType === "Turbidity Test") linkedChemical = "Alum Solution (20g)";

    const newRecord = {
      id: testRecords.length + 1,
      testNo: `TR-10${42 + testRecords.length}`,
      sample: sampleId,
      type: testType,
      result: resultValue,
      chemicalUsed: linkedChemical,
      technician: testedBy,
      date: new Date().toISOString().split('T')[0],
      status: status
    };

    setTestRecords([newRecord, ...testRecords]);
    setResultValue("");
    setIsModalOpen(false);
  };

  return (
    <div className="w-full min-w-0 space-y-4 sm:space-y-6 relative">
      {/* Page Header */}
      <div className={`${glass} flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 p-4 sm:p-6 rounded-2xl sm:rounded-3xl`}>
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl font-semibold tracking-tight text-slate-900 flex items-start sm:items-center gap-3 leading-tight">
            <span className="p-2 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow-lg shadow-blue-500/30 ring-1 ring-inset ring-white/40 shrink-0">
              <FileText size={22} />
            </span>
            <span className="mt-1 sm:mt-0">Test Records & Chemical Consumption</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
            Log water reclamation test outcomes and trigger automated chemical inventory deductions.
          </p>
        </div>
        <Button
          onClick={() => setIsModalOpen(true)}
          variant="default"
          className="w-full md:w-auto min-h-[44px] bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold px-5 rounded-full shadow-lg shadow-blue-500/30 ring-1 ring-inset ring-white/30 flex items-center justify-center gap-2 cursor-pointer transition-all hover:-translate-y-0.5 active:translate-y-0 flex-shrink-0"
        >
          <Plus size={18} />
          Record New Test
        </Button>
      </div>

      {/* Info Banner */}
      <div className="bg-emerald-400/15 backdrop-blur-2xl border border-emerald-400/40 ring-1 ring-inset ring-white/30 rounded-2xl p-3 sm:p-4 text-xs text-emerald-900 shadow-sm leading-relaxed">
        <span className="font-bold">Automated Inventory Synchronization: </span>
        Submitting a test record automatically deducts the required reactive chemicals from the Chemical Inventory table.
      </div>

      {/* Search Bar */}
      <div className={`${glass} p-3 sm:p-4 rounded-2xl sm:rounded-3xl flex flex-col sm:flex-row gap-3 sm:gap-4 justify-between items-stretch sm:items-center`}>
        <div className="w-full sm:w-80 relative group">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-500 transition-colors group-focus-within:text-blue-600">
            <Search size={18} />
          </span>
          <input
            type="text"
            placeholder="Search test ID, sample, or test type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 min-h-[44px] sm:min-h-0 rounded-full border border-white/70 bg-white/60 hover:bg-white/80 backdrop-blur-xl text-base sm:text-sm text-slate-800 font-medium placeholder:text-slate-400 shadow-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:bg-white/90"
          />
        </div>
        <div className="text-xs text-slate-600 font-medium">
          Total recorded tests: <span className="font-bold text-slate-800">{filteredRecords.length}</span>
        </div>
      </div>

      {/* Test Records */}
      {/* Phones: every record is its own separate card with a gap between them */}
      <div className="md:hidden space-y-3">
          {filteredRecords.map((record) => (
            <div
              key={record.id}
              className={`${glass} p-4 space-y-3 rounded-2xl border-l-4 ${
                record.status === "Passed" ? "border-l-emerald-400" : "border-l-amber-400"
              } active:bg-white/55 transition-colors`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-blue-600">{record.testNo}</p>
                  <p className="text-sm font-semibold text-slate-900 break-words">{record.sample}</p>
                </div>
                <StatusBadge status={record.status} />
              </div>

              <div className="rounded-2xl bg-white/50 border border-white/60 px-3 py-2.5">
                <p className="text-[11px] font-medium text-slate-500 break-words">{record.type}</p>
                <p className="text-lg font-bold text-slate-900 break-words">{record.result}</p>
              </div>

              <div className="grid grid-cols-2 gap-x-3 gap-y-3 text-xs">
                <div className="col-span-2 min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Auto-Deducted Chemical</p>
                  <div className="flex items-start gap-1.5 mt-0.5 text-slate-700">
                    <FlaskConical size={14} className="text-blue-500 mt-0.5 shrink-0" />
                    <span className="break-words">{record.chemicalUsed}</span>
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Technician</p>
                  <p className="mt-0.5 text-slate-700 break-words">{record.technician}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Date</p>
                  <p className="mt-0.5 text-slate-700">{record.date}</p>
                </div>
              </div>
            </div>
          ))}
          {filteredRecords.length === 0 && (
            <div className={`${glass} text-center py-8 px-4 rounded-2xl text-slate-500 text-sm`}>
              No test records found matching your query.
            </div>
          )}
      </div>

      {/* Tablet / desktop: full table */}
      <div className={`hidden md:block ${glass} rounded-3xl overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/40 border-b border-white/60 text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                <th className="py-3.5 px-4 lg:px-6">Test ID</th>
                <th className="py-3.5 px-4 lg:px-6">Sample ID</th>
                <th className="py-3.5 px-4 lg:px-6">Test Type</th>
                <th className="py-3.5 px-4 lg:px-6">Result Outcome</th>
                <th className="py-3.5 px-4 lg:px-6">Auto-Deducted Chemical</th>
                <th className="py-3.5 px-4 lg:px-6">Technician</th>
                <th className="py-3.5 px-4 lg:px-6">Date</th>
                <th className="py-3.5 px-4 lg:px-6 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/50 text-sm whitespace-nowrap">
              {filteredRecords.map((record) => (
                <tr key={record.id} className="hover:bg-white/55 transition-all duration-200">
                  <td className="py-4 px-4 lg:px-6 font-bold text-blue-600">{record.testNo}</td>
                  <td className="py-4 px-4 lg:px-6 font-semibold text-slate-900">{record.sample}</td>
                  <td className="py-4 px-4 lg:px-6 text-slate-700 font-medium">{record.type}</td>
                  <td className="py-4 px-4 lg:px-6 font-bold text-slate-900">{record.result}</td>
                  <td className="py-4 px-4 lg:px-6 text-xs text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <FlaskConical size={14} className="text-blue-500" />
                      {record.chemicalUsed}
                    </div>
                  </td>
                  <td className="py-4 px-4 lg:px-6 text-slate-600 text-xs">{record.technician}</td>
                  <td className="py-4 px-4 lg:px-6 text-slate-600 text-xs">{record.date}</td>
                  <td className="py-4 px-4 lg:px-6 text-right">
                    <StatusBadge status={record.status} />
                  </td>
                </tr>
              ))}
              {filteredRecords.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-500 text-sm whitespace-normal">
                    No test records found matching your query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record New Test Modal (glass): bottom sheet on phones, centred dialog from sm up */}
      {isModalOpen && (
        <div
          className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
        >
          <div className="bg-white/80 sm:bg-white/70 backdrop-blur-2xl border border-white/70 ring-1 ring-inset ring-white/50 shadow-[0_24px_60px_rgba(15,23,42,0.25)] rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md max-h-[92dvh] sm:max-h-[90vh] overflow-y-auto overscroll-contain p-4 sm:p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center gap-3 mb-4 border-b border-white/60 pb-3">
              <div className="flex items-center gap-2 text-slate-900 min-w-0">
                <FileText className="text-blue-600 shrink-0" size={22} />
                <h3 className="text-base font-semibold tracking-tight text-slate-900">Record Water Test Result</h3>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setIsModalOpen(false)}
                className="shrink-0 text-slate-500 hover:text-slate-800 hover:bg-white/70 p-2 rounded-full cursor-pointer transition-all hover:rotate-90"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleTestSubmit} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700">Test Category</label>
                <GlassSelect value={testType} onChange={setTestType} options={testTypeOptions} />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700">Sample Reference ID</label>
                <input
                  type="text"
                  value={sampleId}
                  onChange={(e) => setSampleId(e.target.value)}
                  className={glassField}
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700">Test Outcome Value (e.g. 14.2 mg/L or 7.8 pH)</label>
                <input
                  type="text"
                  placeholder="Enter numerical result..."
                  value={resultValue}
                  onChange={(e) => setResultValue(e.target.value)}
                  className={glassField}
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700">Assigned Technician</label>
                <input
                  type="text"
                  value={testedBy}
                  onChange={(e) => setTestedBy(e.target.value)}
                  className={glassField}
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700">Test Quality Status</label>
                <GlassSelect value={status} onChange={setStatus} options={statusOptions} />
              </div>

              <div className="pt-4 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 sm:gap-3 border-t border-white/60 pb-[env(safe-area-inset-bottom)]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-full sm:w-auto min-h-[44px] sm:min-h-0 px-4 py-2 rounded-full text-sm font-semibold text-slate-700 border border-white/70 bg-white/60 hover:bg-white/90 backdrop-blur-xl shadow-sm cursor-pointer transition-all hover:-translate-y-0.5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto min-h-[44px] sm:min-h-0 px-4 py-2 rounded-full text-sm font-semibold bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-md shadow-blue-500/30 ring-1 ring-inset ring-white/30 cursor-pointer transition-all hover:-translate-y-0.5 active:translate-y-0"
                >
                  Submit & Deduct Chemical
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}