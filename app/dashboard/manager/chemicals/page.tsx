"use client";

import React, { useEffect, useState, useRef } from "react";
import { Plus, Loader2, FlaskConical, Trash2, Search, CheckCircle2, AlertCircle, X, Edit3, ChevronDown, Check, PlusCircle, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LAB_UNITS, SI_BASE_UNITS } from "@/lib/units";
import { formatChem, formatUnit } from "@/lib/chemFormat";

const glass =
  "bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_32px_rgba(15,23,42,0.10)] ring-1 ring-inset ring-white/40";

const glassField =
  "w-full px-3.5 py-2.5 rounded-2xl border border-white/70 bg-white/60 backdrop-blur-xl text-sm font-medium text-slate-800 placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/60";

// Stock units for chemicals, taken from the shared unit catalogue (lib/units.ts)
const STOCK_UNIT_VALUES = ["kg", "g", "mg", "L", "mL", "Tablet", "pcs"];
const UNIT_OPTIONS: { value: string; label: string }[] = STOCK_UNIT_VALUES.map(
  (v) => [...SI_BASE_UNITS, ...LAB_UNITS].find((o) => o.value === v) ?? { value: v, label: v } // never drop a unit (e.g. Tablet)
);

// Quick-pick suggestions so users don't have to type common names/formulas
const COMMON_CHEMICALS = [
  "Aluminum Sulfate (Alum)",
  "Chlorine Cl2",
  "Sodium Hydroxide NaOH",
  "Calcium Hydroxide Ca(OH)2",
  "Sulfuric Acid H2SO4",
  "Hydrochloric Acid HCl",
  "Ferric Chloride FeCl3",
  "Ammonia NH3",
  "Poly Aluminium Chloride (PAC)",
  "Sodium Hypochlorite NaOCl",
];

const QUICK_ADD = [10, 50, 100, 500];
const PAGE_SIZE = 12;

function GlassSelect({
  value,
  options,
  onChange,
  disabled = false,
  placeholder = "Select unit...",
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        onClick={() => !disabled && setOpen((o) => !o)}
        className={`${glassField} cursor-pointer flex items-center justify-between gap-2 text-left ${
          disabled ? "opacity-50 cursor-not-allowed bg-slate-100/50" : ""
        }`}
      >
        <span className={`truncate ${!selected && !value ? "text-slate-400" : "text-slate-800 font-semibold"}`}>
          {selected ? formatUnit(selected.label) : (value ? formatUnit(value) : placeholder)}
        </span>
        <ChevronDown size={16} className={`flex-shrink-0 text-slate-500 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && !disabled && (
        <ul className="absolute z-50 mt-2 w-full origin-top rounded-2xl p-1.5 space-y-0.5 bg-white/95 backdrop-blur-2xl border border-white/80 shadow-2xl max-h-48 overflow-y-auto">
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <li
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-xs cursor-pointer transition-colors ${
                  isSelected ? "bg-blue-500 text-white font-semibold" : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                <span>{formatUnit(opt.label)}</span>
                {isSelected && <Check size={14} className="flex-shrink-0" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function ManagerChemicalsPage() {
  const [chemicals, setChemicals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Restock / Add Stock Modal state
  const [isRestockOpen, setIsRestockOpen] = useState(false);
  const [restockChem, setRestockChem] = useState<any>(null);
  const [restockQty, setRestockQty] = useState("");

  // Details (eye) modal + pagination
  const [viewChem, setViewChem] = useState<any>(null);
  const [page, setPage] = useState(1);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [threshold, setThreshold] = useState("10");
  const [description, setDescription] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const fetchChemicals = async () => {
    try {
      const res = await fetch("/api/manager/chemicals");
      const data = await res.json();
      if (res.ok) setChemicals(data.data || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChemicals();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || quantity === "" || !unit) {
      setToast({ message: "Please fill all required fields including unit", type: "error" });
      return;
    }

    setSubmitting(true);
    try {
      const url = "/api/manager/chemicals";
      const method = editingId ? "PUT" : "POST";
      const body = editingId
        ? { id: editingId, name, quantity, unit, threshold, description }
        : { name, quantity, unit, threshold, description };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save chemical");

      setToast({ message: editingId ? "Chemical updated successfully!" : "Chemical added successfully!", type: "success" });
      cancelEdit();
      setIsModalOpen(false);
      fetchChemicals();
    } catch (err: any) {
      setToast({ message: err.message || "Failed to save", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRestockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockChem || !restockQty || isNaN(Number(restockQty))) {
      setToast({ message: "Please enter a valid stock amount to add", type: "error" });
      return;
    }

    setSubmitting(true);
    try {
      const addedAmount = parseFloat(restockQty);
      const newTotal = Number(restockChem.quantity) + addedAmount;

      const res = await fetch("/api/manager/chemicals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: restockChem.id,
          name: restockChem.name,
          quantity: newTotal,
          unit: restockChem.unit,
          threshold: restockChem.threshold,
          description: restockChem.description,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add stock");

      setToast({ message: `Successfully added ${addedAmount} ${formatUnit(restockChem.unit)} to ${formatChem(restockChem.name)}!`, type: "success" });
      setIsRestockOpen(false);
      setRestockChem(null);
      setRestockQty("");
      fetchChemicals();
    } catch (err: any) {
      setToast({ message: err.message || "Failed to add stock", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (c: any) => {
    setEditingId(c.id);
    setName(c.name);
    setQuantity(c.quantity.toString());
    setUnit(c.unit || "");
    setThreshold(c.threshold ? c.threshold.toString() : "10");
    setDescription(c.description || "");
    setIsModalOpen(true);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setName("");
    setQuantity("");
    setUnit("");
    setThreshold("10");
    setDescription("");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this chemical?")) return;
    try {
      const res = await fetch(`/api/manager/chemicals?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete chemical");
      setToast({ message: "Chemical deleted successfully!", type: "success" });
      fetchChemicals();
    } catch (err: any) {
      setToast({ message: err.message, type: "error" });
    }
  };

  const filteredChemicals = chemicals.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.unit && c.unit.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalPages = Math.max(1, Math.ceil(filteredChemicals.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * PAGE_SIZE;
  const pagedChemicals = filteredChemicals.slice(startIdx, startIdx + PAGE_SIZE);

  return (
    <div className="w-full space-y-6 p-4 sm:p-6 relative">
      {/* Header */}
      <div className={`${glass} flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 p-6 rounded-3xl`}>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg">
              <FlaskConical size={22} />
            </span>
            Chemical Catalog & Stock Inventory
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Manage treatment chemicals, stock levels, units, and low-stock threshold alerts.
          </p>
        </div>

        <Button
          onClick={() => { cancelEdit(); setIsModalOpen(true); }}
          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl h-11 px-5 font-semibold shadow-lg cursor-pointer flex items-center gap-2 flex-shrink-0"
        >
          <Plus size={18} /> Add Chemical
        </Button>
      </div>

      {/* CHEMICALS LIST (Full Width) */}
      <div className={`${glass} p-6 rounded-3xl space-y-4 w-full`}>
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-white/60 pb-3">
            <h3 className="font-semibold text-base text-slate-900 flex items-center gap-2">
              <span>Configured Chemical Catalog</span>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-500/10 px-3 py-1 rounded-full">
                {filteredChemicals.length} total
              </span>
            </h3>
          </div>

          <div className="relative">
            <Search size={14} className="absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search chemicals by name or unit..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              className="w-full pl-8 pr-3 py-2 rounded-xl border border-white/70 bg-white/50 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin h-8 w-8 text-emerald-600" />
          </div>
        ) : filteredChemicals.length === 0 ? (
          <div className="text-center py-20 text-slate-500 text-sm">
            {chemicals.length === 0
              ? "No chemicals added yet. Click 'Add Chemical' above to add one!"
              : "No matching chemicals found for your search."}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {pagedChemicals.map((c) => {
                const isLowStock = Number(c.quantity) <= Number(c.threshold ?? 10);
                return (
                  <div
                    key={c.id}
                    className="px-4 py-3.5 rounded-2xl bg-white/70 border border-white/80 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FlaskConical size={16} className="text-emerald-700 flex-shrink-0" />
                      <span className="font-bold text-sm text-emerald-900 truncate" title={c.name}>
                        {formatChem(c.name)}
                      </span>
                      <span
                        className={`flex-shrink-0 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          isLowStock ? "bg-red-500/10 text-red-600" : "bg-emerald-500/10 text-emerald-700"
                        }`}
                        title={isLowStock ? "Low stock" : "In stock"}
                      >
                        {c.quantity} {formatUnit(c.unit)}
                      </span>
                    </div>

                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      <button onClick={() => setViewChem(c)} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-500/10 transition-all cursor-pointer" title="View details">
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => { setRestockChem(c); setRestockQty(""); setIsRestockOpen(true); }}
                        className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-500/10 transition-all cursor-pointer"
                        title="Add incoming stock"
                      >
                        <PlusCircle size={16} />
                      </button>
                      <button onClick={() => startEdit(c)} className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-500/10 transition-all cursor-pointer" title="Edit chemical">
                        <Edit3 size={16} />
                      </button>
                      <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 transition-all cursor-pointer" title="Delete chemical">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between border-t border-white/60 pt-4">
              <p className="text-xs text-slate-500">
                Showing {startIdx + 1}–{Math.min(startIdx + PAGE_SIZE, filteredChemicals.length)} of {filteredChemicals.length}
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setPage(Math.max(1, safePage - 1))}
                  disabled={safePage === 1}
                  className="p-2.5 rounded-xl bg-white/60 text-slate-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
                  aria-label="Previous page"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-xs font-bold text-slate-700">Page {safePage} / {totalPages}</span>
                <button
                  onClick={() => setPage(Math.min(totalPages, safePage + 1))}
                  disabled={safePage === totalPages}
                  className="p-2.5 rounded-xl bg-white/60 text-slate-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
                  aria-label="Next page"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* DETAILS MODAL (EYE) */}
      {viewChem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setViewChem(null)}>
          <div className="bg-white/95 backdrop-blur-2xl border border-white/80 shadow-2xl rounded-3xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2 min-w-0">
                <FlaskConical size={18} className="text-emerald-600 flex-shrink-0" />
                <span className="truncate">{formatChem(viewChem.name)}</span>
              </h3>
              <button onClick={() => setViewChem(null)} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Current stock</span>
                <span className="font-bold text-slate-900">{viewChem.quantity} {formatUnit(viewChem.unit)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Low stock alert level</span>
                <span className="font-bold text-slate-900">{viewChem.threshold ?? 10} {formatUnit(viewChem.unit)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Status</span>
                {Number(viewChem.quantity) <= Number(viewChem.threshold ?? 10) ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-500/10 text-red-600 border border-red-500/30">Low Stock</span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-700 border border-emerald-500/30">In Stock</span>
                )}
              </div>
              {viewChem.description && (
                <div className="pt-2 border-t border-slate-200">
                  <p className="text-xs text-slate-500 mb-1">Notes</p>
                  <p className="text-slate-700">{viewChem.description}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* POPUP MODAL FOR ADDING NEW CHEMICAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white/95 backdrop-blur-2xl border border-white/80 shadow-2xl rounded-3xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-shrink-0">
              <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                <FlaskConical size={20} className="text-emerald-600" /> {editingId ? "Edit Chemical" : "Add New Chemical"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <form onSubmit={handleSave} id="chem-form" className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Chemical Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    placeholder="e.g. Aluminum Sulfate (Alum)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={glassField}
                    required
                  />
                  {name.trim() ? (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs">
                      <span className="text-slate-500">Preview:</span>
                      <span className="font-bold text-emerald-900 text-sm">{formatChem(name)}</span>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500">
                      Tip: type <b>NH3</b> → NH₃, <b>H2SO4</b> → H₂SO₄. For charges use ^ (e.g. <b>NH4^+</b> → NH₄⁺).
                    </p>
                  )}
                  {!editingId && !name.trim() && (
                    <div className="pt-1 space-y-1.5">
                      <p className="text-[11px] font-semibold text-slate-600">Quick pick:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {COMMON_CHEMICALS.map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setName(n)}
                            className="px-2.5 py-1 rounded-full text-[11px] font-semibold text-emerald-800 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all cursor-pointer"
                          >
                            {formatChem(n)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">
                      {editingId ? "Current Quantity" : "Initial Quantity"} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 500"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className={glassField}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Unit <span className="text-red-500">*</span></label>
                    <GlassSelect
                      value={unit}
                      options={UNIT_OPTIONS}
                      onChange={setUnit}
                      placeholder="Select unit"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Low Stock Alert Level{unit ? ` (${formatUnit(unit)})` : ""}
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 50"
                    value={threshold}
                    onChange={(e) => setThreshold(e.target.value)}
                    className={glassField}
                  />
                  <p className="text-[11px] text-slate-500">
                    You'll see a "Low Stock" warning when stock drops to this level or below.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Description / Notes (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Primary coagulant"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className={glassField}
                  />
                </div>
              </form>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50/80 flex-shrink-0">
              <Button type="button" onClick={() => setIsModalOpen(false)} className="bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-full h-10 px-5 font-semibold cursor-pointer">
                Cancel
              </Button>
              <Button type="submit" form="chem-form" disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full h-10 px-6 font-semibold cursor-pointer shadow-md">
                {submitting ? <Loader2 className="animate-spin h-5 w-5" /> : (editingId ? "Update Chemical" : "Save Chemical")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP MODAL FOR ADDING STOCK (RESTOCK) */}
      {isRestockOpen && restockChem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white/95 backdrop-blur-2xl border border-white/80 shadow-2xl rounded-3xl w-full max-w-sm flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-shrink-0">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <PlusCircle size={18} className="text-emerald-600" /> Add Incoming Stock
              </h3>
              <button onClick={() => setIsRestockOpen(false)} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <form onSubmit={handleRestockSubmit} id="restock-form" className="space-y-4">
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
                  <p className="text-xs font-bold text-emerald-900">{formatChem(restockChem.name)}</p>
                  <p className="text-xs text-slate-600">
                    Current Stock: <span className="font-bold text-slate-900">{restockChem.quantity} {formatUnit(restockChem.unit)}</span>
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Quantity to Add ({formatUnit(restockChem.unit)})</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 50"
                    value={restockQty}
                    onChange={(e) => setRestockQty(e.target.value)}
                    className={glassField}
                    autoFocus
                    required
                  />
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {QUICK_ADD.map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setRestockQty(String((parseFloat(restockQty) || 0) + n))}
                        className="px-2.5 py-1 rounded-full text-[11px] font-semibold text-emerald-800 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all cursor-pointer"
                      >
                        +{n}
                      </button>
                    ))}
                  </div>
                  {restockQty !== "" && !isNaN(Number(restockQty)) && (
                    <p className="text-xs text-slate-700 pt-1">
                      New total:{" "}
                      <span className="font-bold text-emerald-800">
                        {Number(restockChem.quantity) + Number(restockQty)} {formatUnit(restockChem.unit)}
                      </span>
                    </p>
                  )}
                </div>
              </form>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50/80 flex-shrink-0">
              <Button type="button" onClick={() => setIsRestockOpen(false)} className="bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-full h-9 px-4 text-xs font-semibold cursor-pointer">
                Cancel
              </Button>
              <Button type="submit" form="restock-form" disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full h-9 px-5 text-xs font-semibold cursor-pointer shadow-md">
                {submitting ? <Loader2 className="animate-spin h-4 w-4" /> : "Confirm & Add"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/90 backdrop-blur-2xl border border-white shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
          {toast.type === "success" ? <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" /> : <AlertCircle size={18} className="text-red-600 flex-shrink-0" />}
          <span className="text-xs font-semibold text-slate-800">{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 text-slate-400 hover:text-slate-600 cursor-pointer"><X size={14} /></button>
        </div>
      )}
    </div>
  );
}