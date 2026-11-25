"use client";

import { formatChem, formatUnit } from "@/lib/chemFormat";
import React, { useEffect, useRef, useState } from "react";
import { FlaskConical, Send, RefreshCw, ChevronDown, Check, Sliders, CheckCircle2, AlertCircle, X, TestTube2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { evaluateStatus, resolveLimits } from "@/lib/status";

// Shared frosted glass look
const glass =
  "bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_32px_rgba(15,23,42,0.10)] ring-1 ring-inset ring-white/40";

const glassField =
  "w-full px-3.5 py-2.5 min-h-[44px] sm:min-h-0 rounded-2xl border border-white/70 bg-white/60 backdrop-blur-xl text-base sm:text-xs font-medium text-slate-800 placeholder:text-slate-400 shadow-sm " +
  "transition-all duration-300 ease-out hover:bg-white/85 hover:border-blue-300 " +
  "focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:bg-white/90";

const glassInputReadOnly =
  "w-full px-3.5 py-2.5 min-h-[44px] sm:min-h-0 rounded-xl border border-slate-300/80 bg-slate-100/70 backdrop-blur-xl text-base sm:text-xs font-bold text-slate-700 shadow-inner cursor-not-allowed";

const glassInputSm =
  "w-full px-3.5 py-2.5 min-h-[44px] sm:min-h-0 rounded-xl border border-white/70 bg-white/70 backdrop-blur-xl text-base sm:text-xs font-semibold text-slate-900 shadow-sm " +
  "transition-all duration-300 ease-out hover:bg-white/90 hover:border-blue-300 " +
  "focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:bg-white";

type Option = { value: string; label: string };

function GlassSelect({
  value,
  options,
  onChange,
  disabled = false,
  placeholder = "Select option...",
}: {
  value: string;
  options: Option[];
  onChange: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

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

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={`${glassField} cursor-pointer flex items-center justify-between gap-2 text-left hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(59,130,246,0.25)] ${
          disabled ? "opacity-50 cursor-not-allowed bg-slate-100/50" : ""
        }`}
      >
        <span className="truncate">{selected?.label ?? (value || placeholder)}</span>
        <ChevronDown
          size={16}
          className={`flex-shrink-0 text-blue-600 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && !disabled && (
        <ul
          ref={listRef}
          role="listbox"
          className="absolute z-50 mt-2 w-full origin-top rounded-2xl p-1.5 space-y-0.5 bg-white/90 backdrop-blur-2xl border border-white/70 ring-1 ring-inset ring-white/50 shadow-[0_16px_40px_rgba(15,23,42,0.18)] max-h-48 overflow-y-auto"
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
          {options.length === 0 && (
            <li className="px-3 py-2 text-xs text-slate-400 text-center">No options available</li>
          )}
        </ul>
      )}
    </div>
  );
}

export default function WaterQualityTestingPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [tankRanges, setTankRanges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form States
  const [sampleId, setSampleId] = useState("");
  const [selectedCatId, setSelectedCatId] = useState("");
  const [selectedTypeId, setSelectedTypeId] = useState("");
  const [testingTime, setTestingTime] = useState("");
  
  // Mapping of parameterName -> entered value
  const [parameterValues, setParameterValues] = useState<{ [key: string]: string }>({});

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    setTestingTime(new Date().toLocaleString());
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Fetch Master Data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [catRes, typeRes, rangeRes] = await Promise.all([
          fetch("/api/manager/categories"),
          fetch("/api/manager/types"),
          fetch("/api/manager/ranges"),
        ]);

        const catData = await catRes.json();
        const typeData = await typeRes.json();
        const rangeData = await rangeRes.json();

        if (catRes.ok) setCategories(catData.data || []);
        if (typeRes.ok) setTypes(typeData.data || []);
        if (rangeRes.ok) setTankRanges(rangeData.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Filtered Tanks/Units based on selected Category
  const availableTypes = types.filter((t) => t.categoryId === selectedCatId);

  // Filtered Parameters configured for the selected Tank/Unit
  const availableParameters = tankRanges.filter((r) => r.typeId === selectedTypeId);

  // Auto-generate Unique Combined Sample ID using actual database codes (`cat.code` and `unit.code`)
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    if (selectedCatId && selectedTypeId) {
      const cat = categories.find((c) => c.id === selectedCatId);
      const unit = types.find((t) => t.id === selectedTypeId);
      
      const catCode = cat?.code || "CAT";
      const unitCode = unit?.code || "UNT";
      const randomNum = Math.floor(100 + Math.random() * 900); // 3-digit random sequence
      
      setSampleId(`SMP-${catCode}-${unitCode}-${today}-${randomNum}`);
    } else {
      setSampleId(`Awaiting Category & Unit Selection...`);
    }
  }, [selectedCatId, selectedTypeId, categories, types]);

  const handleValueChange = (parameterName: string, val: string) => {
    setParameterValues((prev) => ({ ...prev, [parameterName]: val }));
  };

  // Live evaluation of entered value against configured standards
  const evaluateLiveStatus = (valStr: string, config: any) => {
    const val = parseFloat(valStr);
    if (isNaN(val) || !config) return { text: "Pending value", color: "text-slate-500 bg-slate-400/10 border-slate-300" };

    if (!resolveLimits(config)) {
      return { text: "Rule Active", color: "text-blue-700 bg-blue-400/20 border-blue-400/40" };
    }
    const result = evaluateStatus(val, config);
    if (result === "Normal") return { text: "Normal (Pass)", color: "text-emerald-700 bg-emerald-400/20 border-emerald-400/40" };
    if (result === "Critical") return { text: "Critical", color: "text-red-700 bg-red-400/20 border-red-400/40" };
    return { text: "Warning", color: "text-amber-700 bg-amber-400/20 border-amber-400/40" };
  };

  const handleSubmitTests = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sampleId.trim() || sampleId.includes("Awaiting") || !selectedTypeId || availableParameters.length === 0) {
      setToast({ message: "Please select Category and Tank/Unit first", type: "error" });
      return;
    }

    const filledParams = availableParameters.filter((p) => parameterValues[p.parameterName] !== undefined && parameterValues[p.parameterName] !== "");
    if (filledParams.length === 0) {
      setToast({ message: "Please enter at least one parameter test value", type: "error" });
      return;
    }

    setSubmitting(true);
    try {
      for (const param of filledParams) {
        const val = parameterValues[param.parameterName];
        const res = await fetch("/api/technician/tests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sampleId,
            typeId: selectedTypeId,
            parameter: param.parameterName,
            value: val,
            unit: param.unit || "mg/L",
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `Failed to submit ${param.parameterName}`);
      }

      setToast({ message: "All test results submitted successfully and synced!", type: "success" });
      
      // Reset selections
      setSelectedCatId("");
      setSelectedTypeId("");
      setParameterValues({});
    } catch (err: any) {
      setToast({ message: err.message || "Failed to submit tests", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full min-w-0 space-y-4 sm:space-y-6 max-w-5xl mx-auto relative">
      {/* Page Header */}
      <div className={`${glass} p-4 sm:p-6 rounded-2xl sm:rounded-3xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4`}>
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl font-semibold tracking-tight text-slate-900 flex items-start sm:items-center gap-3 leading-tight">
            <span className="p-2 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow-lg shadow-blue-500/30 ring-1 ring-inset ring-white/40 shrink-0">
              <FlaskConical size={22} />
            </span>
            <span className="mt-1 sm:mt-0">Water Quality Testing & Batch Data Entry</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
            Select Test Category and Tank/Unit to auto-generate a secure, uneditable unique Batch ID using smart category and unit codes.
          </p>
        </div>
      </div>

      {/* Dynamic Test Form */}
      <form onSubmit={handleSubmitTests} className={`${glass} p-4 sm:p-8 rounded-2xl sm:rounded-3xl space-y-5 sm:space-y-6`}>
        
        {/* Step 1 & Step 2 Selection Flow */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Step 1: Test Category</label>
            <GlassSelect
              value={selectedCatId}
              onChange={(id) => {
                setSelectedCatId(id);
                setSelectedTypeId("");
                setParameterValues({});
              }}
              placeholder="-- Choose Category --"
              options={categories.map((c) => ({ value: c.id, label: `${c.name} (${c.code || "---"})` }))}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Step 2: Tank / Unit</label>
            <GlassSelect
              value={selectedTypeId}
              onChange={(id) => {
                setSelectedTypeId(id);
                setParameterValues({});
              }}
              placeholder="-- Choose Tank / Unit --"
              disabled={!selectedCatId}
              options={availableTypes.map((t) => ({ value: t.id, label: `${t.name} (${t.code || "---"})` }))}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 pt-1">
          <div className="space-y-1.5 min-w-0">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              Auto-Generated Combined Unique Sample ID 
            </label>
            <input
              type="text"
              value={sampleId}
              readOnly
              className={glassInputReadOnly}
              title="System generated automatically from Category Code + Unit Code + Date"
            />
          </div>

          <div className="space-y-1.5 min-w-0">
            <label className="text-xs font-bold text-slate-700">Testing Date & Time</label>
            <input
              type="text"
              disabled
              value={testingTime}
              className="w-full px-3.5 py-2.5 min-h-[44px] sm:min-h-0 rounded-2xl border border-white/50 bg-white/30 backdrop-blur-xl text-base sm:text-xs text-slate-500"
            />
          </div>
        </div>

        <hr className="border-white/50" />

        {/* Step 3: Automatically Rendered Parameters Form */}
        {selectedTypeId && (
          <div className="space-y-4 pt-2">
            <div className="border-b border-white/60 pb-2 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <TestTube2 size={16} className="text-blue-600" /> Parameters Form for this Unit ({availableParameters.length})
              </h3>
            </div>

            {availableParameters.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {availableParameters.map((param) => {
                  const val = parameterValues[param.parameterName] || "";
                  const status = evaluateLiveStatus(val, param);
                  return (
                    <div key={param.id} className="p-4 rounded-2xl border border-white/60 bg-white/50 backdrop-blur-xl space-y-2.5 shadow-sm">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                            <Sliders size={14} className="text-indigo-600" /> {formatChem(param.parameterName)}
                          </h4>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Standard: {param.rangeText ? param.rangeText : `${param.standardMin ?? "?"} - ${param.standardMax ?? "?"} ${formatUnit(param.unit)}`}
                          </p>
                        </div>
                        <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border backdrop-blur-xl whitespace-nowrap ${status.color}`}>
                          {status.text}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          inputMode="decimal"
                          step="any"
                          placeholder="Enter value..."
                          value={val}
                          onChange={(e) => handleValueChange(param.parameterName, e.target.value)}
                          className={glassInputSm}
                        />
                        <span className="text-xs font-bold text-slate-600 shrink-0 px-2">{formatUnit(param.unit || "mg/L")}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-10 bg-white/30 rounded-2xl border border-white/55 text-slate-500 text-xs">
                No parameters configured for this unit yet in the Manager Portal. Please configure limits in Manager Ranges first.
              </div>
            )}
          </div>
        )}

        {/* Submit Button */}
        {availableParameters.length > 0 && (
          <div className="pt-4 flex sm:justify-end">
            <Button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto h-auto min-h-[48px] sm:min-h-0 justify-center text-center whitespace-normal bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-sm font-semibold px-6 py-3 sm:py-2.5 rounded-full shadow-lg shadow-blue-500/30 ring-1 ring-inset ring-white/30 flex items-center gap-2 cursor-pointer transition-all hover:-translate-y-0.5 active:translate-y-0"
            >
              {submitting ? (
                <>
                  <RefreshCw className="animate-spin shrink-0" size={16} /> Submitting Batch Results...
                </>
              ) : (
                <>
                  <Send className="shrink-0" size={16} /> Submit All Test Results & Sync
                </>
              )}
            </Button>
          </div>
        )}
      </form>

      {/* Floating Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/90 backdrop-blur-2xl border border-white shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
          {toast.type === "success" ? (
            <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle size={18} className="text-red-600 flex-shrink-0" />
          )}
          <span className="text-xs font-semibold text-slate-800">{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 text-slate-400 hover:text-slate-600 cursor-pointer">
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}