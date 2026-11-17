"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Plus, Loader2, TestTube2, Trash2, Search, CheckCircle2, AlertCircle, X, Edit3, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UnitSelect } from "@/components/UnitSelect";
import { UNIT_GROUPS } from "@/lib/units";
import { formatChem, formatUnit } from "@/lib/chemFormat";

const glass =
  "bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_32px_rgba(15,23,42,0.10)] ring-1 ring-inset ring-white/40";

const glassField =
  "w-full px-3.5 py-2.5 rounded-2xl border border-white/70 bg-white/60 backdrop-blur-xl text-sm font-medium text-slate-800 placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/60";

const PAGE_SIZE = 12;

// Full description of a unit symbol, e.g. "mV" -> "mV (millivolts – ORP / redox potential)"
const unitDescription = (u?: string | null) => {
  if (!u) return "No unit";
  for (const g of UNIT_GROUPS) {
    const hit = g.options.find((o) => o.value === u);
    if (hit) return hit.label;
  }
  return `${formatUnit(u)} (custom unit)`;
};
const NO_UNIT = "__none__"; // filter value for tests that have no unit

export default function ManagerTestsPage() {
  const [parameters, setParameters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [unitFilter, setUnitFilter] = useState("");
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewItem, setViewItem] = useState<any | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [originalName, setOriginalName] = useState("");
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("");
  const [noUnit, setNoUnit] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Esc closes the popup
  useEffect(() => {
    if (!isModalOpen && !viewItem) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (isModalOpen) setIsModalOpen(false); // top-most popup first
      else setViewItem(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isModalOpen, viewItem]);

  const fetchParameters = async () => {
    try {
      const res = await fetch("/api/manager/parameters");
      const data = await res.json();
      if (res.ok) setParameters(data.data || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParameters();
  }, []);

  // ---------- Open / reset ----------
  const resetForm = () => {
    setEditingId(null);
    setOriginalName("");
    setName("");
    setUnit("");
    setNoUnit(false);
  };

  const openAdd = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEdit = (p: any) => {
    setEditingId(p.id);
    setOriginalName(p.name);
    setName(p.name);
    setUnit(p.unit || "");
    setNoUnit(!p.unit);
    setIsModalOpen(true);
  };

  // ---------- Save (add or edit) ----------
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const finalUnit = noUnit ? "" : unit.trim();
    if (!noUnit && !finalUnit) {
      setToast({ message: "Please specify the standard unit", type: "error" });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/manager/parameters", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingId ? { id: editingId, name: name.trim(), unit: finalUnit } : { name: name.trim(), unit: finalUnit }),
      });

      if (editingId && (res.status === 404 || res.status === 405)) {
        throw new Error("Update is not supported by the server yet (the parameters API needs a PUT handler).");
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Failed to ${editingId ? "update" : "add"} test`);

      setToast({
        message: `"${formatChem(name)}" ${editingId ? "updated" : "added"} successfully!`,
        type: "success",
      });
      resetForm();
      setIsModalOpen(false);
      setViewItem(null);
      fetchParameters();
    } catch (err: any) {
      setToast({ message: err.message || "Failed to save test", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTest = async (p: any) => {
    if (!confirm(`Delete "${p.name}"?`)) return;
    try {
      const res = await fetch(`/api/manager/parameters?id=${p.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete test");
      setToast({ message: "Test deleted successfully!", type: "success" });
      setViewItem(null);
      fetchParameters();
    } catch (err: any) {
      setToast({ message: err.message || "Failed to delete test", type: "error" });
    }
  };

  // ---------- Search / filter / pages ----------
  const usedUnits = useMemo(
    () => Array.from(new Set(parameters.map((p) => p.unit).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b)),
    [parameters]
  );
  const hasNoUnitItems = parameters.some((p) => !p.unit);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return parameters
      .filter((p) => {
        if (unitFilter === NO_UNIT && p.unit) return false;
        if (unitFilter && unitFilter !== NO_UNIT && p.unit !== unitFilter) return false;
        if (!q) return true;
        return (
          p.name.toLowerCase().includes(q) ||
          formatChem(p.name).toLowerCase().includes(q) ||
          (p.unit && (p.unit.toLowerCase().includes(q) || formatUnit(p.unit).toLowerCase().includes(q)))
        );
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [parameters, searchQuery, unitFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const hasFilters = !!(searchQuery.trim() || unitFilter);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, unitFilter]);

  return (
    <div className="w-full space-y-6 p-4 sm:p-6 relative">
      {/* Header */}
      <div className={`${glass} flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 p-6 rounded-3xl`}>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg">
              <TestTube2 size={22} />
            </span>
            Parameter Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Manage laboratory test catalog and standard units with instant search and full view.
          </p>
        </div>

        <Button
          onClick={openAdd}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl h-11 px-5 font-semibold shadow-lg cursor-pointer flex items-center gap-2 flex-shrink-0"
        >
          <Plus size={18} /> Add New Test
        </Button>
      </div>

      {/* TESTS LIST */}
      <div className={`${glass} p-6 rounded-3xl space-y-4 w-full`}>
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 border-b border-white/60 pb-3 flex-wrap">
            <h3 className="font-semibold text-base text-slate-900 flex items-center gap-2">
              <span>Configured Laboratory Parameters</span>
              <span className="text-xs font-bold text-blue-700 bg-blue-500/10 px-3 py-1 rounded-full">
                {hasFilters ? `${filtered.length} of ${parameters.length}` : `${parameters.length} total`}
              </span>
            </h3>
            {hasFilters && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setUnitFilter("");
                }}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white/60 hover:bg-white/90 border border-white/80 px-3 py-1.5 rounded-full flex items-center gap-1 cursor-pointer transition-colors"
              >
                <X size={12} /> Clear filters
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative sm:col-span-2">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search tests by name or unit..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`${glassField} pl-10`}
              />
            </div>
            <select value={unitFilter} onChange={(e) => setUnitFilter(e.target.value)} className={glassField}>
              <option value="">All units</option>
              {hasNoUnitItems && <option value={NO_UNIT}>No unit</option>}
              {usedUnits.map((u) => (
                <option key={u} value={u}>
                  {formatUnit(u)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
          </div>
        ) : (
          <>
            {/* Compact cards: 1 / 2 / 3 per row, so many tests fit without long scrolling */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {pageItems.map((p) => (
                <div
                  key={p.id}
                  className="group px-3.5 py-3 rounded-2xl bg-white/60 border border-white/80 flex items-center justify-between gap-2 shadow-sm hover:bg-white/80 transition-colors"
                >
                  <div className="min-w-0 flex items-center gap-2">
                    <TestTube2 size={15} className="text-indigo-700 flex-shrink-0" />
                    <span className="font-bold text-sm text-indigo-700 truncate" title={formatChem(p.name)}>
                      {formatChem(p.name)}
                    </span>
                    {p.unit ? (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-700 flex-shrink-0">
                        {formatUnit(p.unit)}
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-200/70 text-slate-500 flex-shrink-0">
                        no unit
                      </span>
                    )}
                  </div>
                  <div className="flex items-center flex-shrink-0">
                    <button
                      onClick={() => setViewItem(p)}
                      className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-500/10 transition-all cursor-pointer"
                      title="View test"
                    >
                      <Eye size={15} />
                    </button>
                    <button
                      onClick={() => openEdit(p)}
                      className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-500/10 transition-all cursor-pointer"
                      title="Edit test"
                    >
                      <Edit3 size={15} />
                    </button>
                    <button
                      onClick={() => handleDeleteTest(p)}
                      className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 transition-all cursor-pointer"
                      title="Delete test"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {filtered.length === 0 && (
              <div className="text-center py-16 text-slate-500 text-sm">
                {parameters.length === 0
                  ? "No tests added yet. Click 'Add New Test' above to add one!"
                  : "No matching tests found for your search."}
              </div>
            )}

            {/* Pagination */}
            {filtered.length > PAGE_SIZE && (
              <div className="flex items-center justify-between gap-3 pt-2 border-t border-white/60 flex-wrap">
                <p className="text-xs text-slate-500">
                  Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(safePage - 1)}
                    disabled={safePage <= 1}
                    className="p-2 rounded-xl bg-white/60 border border-white/80 text-slate-700 hover:bg-white/90 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    title="Previous page"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-xs font-semibold text-slate-700 px-2">
                    Page {safePage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(safePage + 1)}
                    disabled={safePage >= totalPages}
                    className="p-2 rounded-xl bg-white/60 border border-white/80 text-slate-700 hover:bg-white/90 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    title="Next page"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* VIEW POPUP */}
      {viewItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setViewItem(null);
          }}
        >
          <div className="bg-white/95 backdrop-blur-2xl border border-white/80 shadow-2xl rounded-3xl w-full max-w-md flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2 min-w-0">
                <TestTube2 size={20} className="text-blue-600 flex-shrink-0" />
                <span className="truncate">{formatChem(viewItem.name)}</span>
              </h3>
              <button onClick={() => setViewItem(null)} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Test name</p>
                <p className="text-sm font-semibold text-slate-900">{formatChem(viewItem.name)}</p>
                {formatChem(viewItem.name) !== viewItem.name && (
                  <p className="text-[11px] text-slate-500">Stored as: {viewItem.name}</p>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Standard unit</p>
                <p className="text-sm font-semibold text-slate-900">{unitDescription(viewItem.unit)}</p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50/80">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  onClick={() => {
                    const p = viewItem;
                    setViewItem(null);
                    openEdit(p);
                  }}
                  className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-full h-10 px-4 text-xs font-semibold shadow-none cursor-pointer flex items-center gap-1.5"
                >
                  <Edit3 size={14} /> Edit
                </Button>
                <Button
                  type="button"
                  onClick={() => handleDeleteTest(viewItem)}
                  className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-full h-10 px-4 text-xs font-semibold shadow-none cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 size={14} /> Delete
                </Button>
              </div>
              <Button type="button" onClick={() => setViewItem(null)} className="bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-full h-10 px-5 font-semibold cursor-pointer shadow-sm">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP MODAL FOR ADD / EDIT TEST */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !name.trim()) setIsModalOpen(false);
          }}
        >
          <div className="bg-white/95 backdrop-blur-2xl border border-white/80 shadow-2xl rounded-3xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-shrink-0">
              <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                <TestTube2 size={20} className="text-blue-600" /> {editingId ? "Edit Test" : "Add New Test"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <form onSubmit={handleSave} id="test-form" className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Test Name</label>
                  <input
                    type="text"
                    placeholder="e.g. pH, COD, Ammonia"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={glassField}
                    autoFocus
                    required
                  />
                  {formatChem(name) !== name && (
                    <p className="text-[11px] text-slate-500">
                      Shows as: <span className="font-bold text-blue-700">{formatChem(name)}</span>
                    </p>
                  )}
                  {editingId && name.trim() !== originalName.trim() && (
                    <p className="text-[11px] text-amber-600 font-medium flex items-start gap-1.5">
                      <AlertCircle size={13} className="flex-shrink-0 mt-px" />
                      Limits and dosages already saved under the old name "{originalName}" are not renamed automatically.
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Standard Unit</label>
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={noUnit}
                      onChange={(e) => setNoUnit(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 accent-blue-600"
                    />
                    No unit (parameter has no unit)
                  </label>
                  {!noUnit && <UnitSelect value={unit} onChange={setUnit} className={glassField} required />}
                </div>
              </form>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50/80 flex-shrink-0">
              <Button type="button" onClick={() => setIsModalOpen(false)} className="bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-full h-10 px-5 font-semibold cursor-pointer shadow-sm">
                Cancel
              </Button>
              <Button type="submit" form="test-form" disabled={submitting} className="bg-blue-600 hover:bg-blue-700 text-white rounded-full h-10 px-6 font-semibold cursor-pointer shadow-md">
                {submitting ? <Loader2 className="animate-spin h-5 w-5" /> : editingId ? "Update Test" : "Add Test"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-[70] flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/90 backdrop-blur-2xl border border-white shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
          {toast.type === "success" ? <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" /> : <AlertCircle size={18} className="text-red-600 flex-shrink-0" />}
          <span className="text-xs font-semibold text-slate-800">{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 text-slate-400 hover:text-slate-600 cursor-pointer"><X size={14} /></button>
        </div>
      )}
    </div>
  );
}