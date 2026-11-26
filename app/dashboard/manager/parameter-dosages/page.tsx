"use client";

import React, { useEffect, useState, useRef } from "react";
import { Plus, Loader2, FlaskConical, TestTube2, Trash2, Search, Folder, ChevronDown, Check, CheckCircle2, AlertCircle, X, Sliders, Eye, Edit3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UnitSelect } from "@/components/UnitSelect";
import { formatChem, formatUnit } from "@/lib/chemFormat";

const glass =
  "bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_32px_rgba(15,23,42,0.10)] ring-1 ring-inset ring-white/40";

const glassField =
  "w-full px-3.5 py-2.5 rounded-2xl border border-white/70 bg-white/60 backdrop-blur-xl text-sm font-medium text-slate-800 placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/60";

// ---------- Types & helpers ----------
interface ChemicalRow {
  chemicalId: string;
  amount: string;
  unit: string;
  description: string;
}
interface ParamRow {
  paramName: string;
  chemicals: ChemicalRow[];
}
type Issue = { level: "error" | "hint"; text: string };

const DEFAULT_CHEM_UNIT = ""; // no default: unit is auto-filled from the chemical, or picked by the user
const emptyChem = (): ChemicalRow => ({ chemicalId: "", amount: "", unit: DEFAULT_CHEM_UNIT, description: "" });
const emptyParam = (): ParamRow => ({ paramName: "", chemicals: [emptyChem()] });

const norm = (s: string) => (s || "").trim().toLowerCase();
const hasValue = (v: any) => v !== null && v !== undefined && String(v).trim() !== "";
const isChemFilled = (c: ChemicalRow) => !!c.chemicalId || hasValue(c.amount) || c.description.trim() !== "";
const isRowFilled = (r: ParamRow) => r.paramName.trim() !== "" || r.chemicals.some(isChemFilled);

// Each parameter row gets its own colour so rows are easy to tell apart
const ROW_COLORS = [
  { badge: "bg-blue-600", border: "border-blue-400", stripe: "border-l-blue-400" },
  { badge: "bg-violet-600", border: "border-violet-400", stripe: "border-l-violet-400" },
  { badge: "bg-emerald-600", border: "border-emerald-400", stripe: "border-l-emerald-400" },
  { badge: "bg-fuchsia-600", border: "border-fuchsia-400", stripe: "border-l-fuchsia-400" },
  { badge: "bg-cyan-600", border: "border-cyan-400", stripe: "border-l-cyan-400" },
  { badge: "bg-orange-500", border: "border-orange-400", stripe: "border-l-orange-400" },
];

interface ParamGroup {
  name: string;
  items: any[];
}
interface UnitGroup {
  typeId: string;
  typeName: string;
  categoryId: string;
  categoryName: string;
  records: any[];
  params: ParamGroup[];
}
interface CategoryGroup {
  categoryId: string;
  categoryName: string;
  units: UnitGroup[];
}

// Category -> Tank/Unit -> Parameter -> chemicals
function buildCategoryGroups(list: any[]): CategoryGroup[] {
  const units = new Map<string, UnitGroup>();
  for (const r of list) {
    let u = units.get(r.typeId);
    if (!u) {
      u = {
        typeId: r.typeId,
        typeName: r.type?.name || "Unit",
        categoryId: r.type?.categoryId || "",
        categoryName: r.type?.category?.name || "Category",
        records: [],
        params: [],
      };
      units.set(r.typeId, u);
    }
    u.records.push(r);
  }

  Array.from(units.values()).forEach((u) => {
    const byParam = new Map<string, any[]>();
    u.records.forEach((r) => {
      const arr = byParam.get(r.parameterName) || [];
      arr.push(r);
      byParam.set(r.parameterName, arr);
    });
    u.params = Array.from(byParam.entries())
      .map(([name, items]) => ({
        name,
        items: items.sort((a, b) => (a.chemical?.name || "").localeCompare(b.chemical?.name || "")),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  });

  const cats = new Map<string, CategoryGroup>();
  Array.from(units.values()).forEach((u) => {
    const key = u.categoryId || u.categoryName;
    let c = cats.get(key);
    if (!c) {
      c = { categoryId: u.categoryId, categoryName: u.categoryName, units: [] };
      cats.set(key, c);
    }
    c.units.push(u);
  });

  const result = Array.from(cats.values());
  result.forEach((c) => c.units.sort((a, b) => a.typeName.localeCompare(b.typeName)));
  result.sort((a, b) => a.categoryName.localeCompare(b.categoryName));
  return result;
}

// Reusable Custom Searchable Dropdown Component
function SearchableDropdown({ options, value, onChange, placeholder, disabled = false, icon: Icon, clearable = false }: {
  options: { id: string; label: string; subLabel?: string; searchText?: string }[];
  value: string;
  onChange: (id: string) => void;
  placeholder: string;
  disabled?: boolean;
  icon?: any;
  clearable?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.id === value);

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(search.toLowerCase()) ||
    (opt.searchText && opt.searchText.toLowerCase().includes(search.toLowerCase())) ||
    (opt.subLabel && opt.subLabel.toLowerCase().includes(search.toLowerCase()))
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`${glassField} flex items-center justify-between gap-2 cursor-pointer ${disabled ? "opacity-50 cursor-not-allowed bg-slate-100/50" : ""}`}
      >
        <div className="flex items-center gap-2 truncate">
          {Icon && <Icon size={16} className="text-slate-500 flex-shrink-0" />}
          <span className={`truncate ${selectedOption ? "text-slate-800 font-semibold" : "text-slate-400"}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {clearable && selectedOption && !disabled && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange(""); }}
              className="p-0.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 cursor-pointer"
              title="Clear"
            >
              <X size={14} />
            </button>
          )}
          <ChevronDown size={16} className={`text-slate-500 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
        </div>
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-50 mt-2 w-full rounded-2xl bg-white/95 backdrop-blur-2xl border border-white/80 shadow-2xl p-2.5 space-y-2 animate-in fade-in zoom-in-95 duration-150">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50/80 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              autoFocus
            />
          </div>

          <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
            {filteredOptions.map((opt) => (
              <div
                key={opt.id}
                onClick={() => {
                  onChange(opt.id);
                  setIsOpen(false);
                  setSearch("");
                }}
                className={`px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-between cursor-pointer transition-colors ${
                  value === opt.id ? "bg-blue-500 text-white font-semibold" : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                <div>
                  <p>{opt.label}</p>
                  {opt.subLabel && <p className={`text-[10px] ${value === opt.id ? "text-blue-100" : "text-slate-400"}`}>{opt.subLabel}</p>}
                </div>
                {value === opt.id && <Check size={14} />}
              </div>
            ))}
            {filteredOptions.length === 0 && (
              <div className="text-center py-4 text-xs text-slate-400">No results found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ParameterDosagesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [globalParameters, setGlobalParameters] = useState<any[]>([]);
  // Parameters assigned to each tank / unit (set in "Parameter Assign & Add Ranges")
  const [assignedConfigs, setAssignedConfigs] = useState<any[]>([]);
  const [chemicals, setChemicals] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Add / edit popup
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false); // true = editing one existing parameter of a unit
  const [selectedCatId, setSelectedCatId] = useState("");
  const [selectedTypeId, setSelectedTypeId] = useState("");

  // Multiple parameters, each with multiple chemicals
  const [paramRows, setParamRows] = useState<ParamRow[]>([emptyParam()]);
  const [activeRow, setActiveRow] = useState(0); // the one parameter row that is expanded
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);

  // View popup + list filters
  const [viewTypeId, setViewTypeId] = useState<string | null>(null);
  const [filterCatId, setFilterCatId] = useState("");
  const [filterTypeId, setFilterTypeId] = useState("");
  const [searchText, setSearchText] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Esc closes the top-most popup
  useEffect(() => {
    if (!isModalOpen && !viewTypeId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (isModalOpen) setIsModalOpen(false);
      else setViewTypeId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isModalOpen, viewTypeId]);

  // Scroll the opened parameter row into view
  useEffect(() => {
    if (!isModalOpen) return;
    const t = setTimeout(() => {
      rowRefs.current[activeRow]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }, 60);
    return () => clearTimeout(t);
  }, [activeRow, isModalOpen]);

  const fetchData = async () => {
    try {
      const [catRes, typeRes, paramRes, chemRes, recRes, cfgRes] = await Promise.all([
        fetch("/api/manager/categories"),
        fetch("/api/manager/types"),
        fetch("/api/manager/parameters"),
        fetch("/api/manager/chemicals"),
        fetch("/api/manager/parameter-dosages"),
        fetch("/api/manager/ranges"),
      ]);

      const catData = await catRes.json();
      const typeData = await typeRes.json();
      const paramData = await paramRes.json();
      const chemData = await chemRes.json();
      const recData = await recRes.json();
      const cfgData = await cfgRes.json();

      if (catRes.ok) setCategories(catData.data || []);
      if (typeRes.ok) setTypes(typeData.data || []);
      if (paramRes.ok) setGlobalParameters(paramData.data || []);
      if (chemRes.ok) setChemicals(chemData.data || []);
      if (recRes.ok) setRecords(recData.data || []);
      if (cfgRes.ok) setAssignedConfigs(cfgData.data || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Re-read the assigned parameters each time the popup opens (so parameters just assigned show up)
  useEffect(() => {
    if (!isModalOpen) return;
    fetch("/api/manager/ranges")
      .then((r) => r.json())
      .then((d) => { if (d?.data) setAssignedConfigs(d.data); })
      .catch(() => {});
  }, [isModalOpen]);

  const refreshRecords = async () => {
    try {
      const res = await fetch("/api/manager/parameter-dosages");
      const data = await res.json();
      if (res.ok) setRecords(data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  // ---------- Derived data ----------
  const selectedType = types.find((t) => t.id === selectedTypeId);
  const formFilteredTypes = types.filter((t) => t.categoryId === selectedCatId);
  const filterFilteredTypes = types.filter((t) => !filterCatId || t.categoryId === filterCatId);
  const chemName = (id: string) => formatChem(chemicals.find((c) => c.id === id)?.name || "");

  const hasActiveFilters = !!(filterCatId || filterTypeId || searchText.trim());

  const filteredRecords = records.filter((r) => {
    const matchesCat = !filterCatId || r.type?.categoryId === filterCatId;
    const matchesType = !filterTypeId || r.typeId === filterTypeId;
    const q = norm(searchText);
    const matchesSearch = !q || norm(r.parameterName).includes(q) || norm(r.chemical?.name || "").includes(q);
    return matchesCat && matchesType && matchesSearch;
  });

  const categoryGroups = buildCategoryGroups(filteredRecords);
  const unitCount = categoryGroups.reduce((n, c) => n + c.units.length, 0);
  const totalUnitCount = new Set(records.map((r) => r.typeId)).size;
  const viewGroup = viewTypeId
    ? buildCategoryGroups(records.filter((r) => r.typeId === viewTypeId))[0]?.units[0]
    : undefined;

  // If the viewed unit has nothing left (last dosage deleted), close its popup
  useEffect(() => {
    if (viewTypeId && !records.some((r) => r.typeId === viewTypeId)) setViewTypeId(null);
  }, [viewTypeId, records]);

  // Already-saved dosage for (selected unit, parameter, chemical)? Saving again will update it.
  const findExisting = (paramName: string, chemicalId: string) =>
    records.find((r) => r.typeId === selectedTypeId && norm(r.parameterName) === norm(paramName) && r.chemicalId === chemicalId);

  // Parameters assigned to the chosen tank / unit (only these can be picked)
  const assignedParams = assignedConfigs
    .filter((c) => c.typeId === selectedTypeId)
    .map((c) => ({ id: c.id, name: c.parameterName as string, unit: c.unit as string | null }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Assigned parameters not yet used in the form (quick-add chips)
  const catalogSuggestions = assignedParams.filter((p) => !paramRows.some((r) => norm(r.paramName) === norm(p.name)));

  // ---------- Validation ----------
  // level "error" = something is wrong, "hint" = something is still missing. Both block saving.
  const getChemIssue = (chem: ChemicalRow, ci: number, row: ParamRow): Issue | null => {
    if (!isChemFilled(chem)) return null; // empty chemical rows are ignored
    if (!chem.chemicalId) return { level: "error", text: "Choose a chemical." };
    if (row.chemicals.some((c, i) => i < ci && c.chemicalId === chem.chemicalId)) {
      return { level: "error", text: `${chemName(chem.chemicalId)} is added twice for this parameter.` };
    }
    if (!hasValue(chem.amount) || Number(chem.amount) <= 0) return { level: "hint", text: "Enter the required amount." };
    if (!chem.unit.trim()) return { level: "hint", text: "Enter a unit." };
    return null;
  };

  const getParamIssue = (row: ParamRow, index: number): Issue | null => {
    if (!isRowFilled(row)) return null; // empty rows are ignored
    if (!row.paramName.trim()) return { level: "hint", text: "Choose a parameter." };
    if (paramRows.some((r, i) => i < index && norm(r.paramName) === norm(row.paramName))) {
      return { level: "error", text: `"${row.paramName}" is added twice in this list.` };
    }
    const filled = row.chemicals.map((c, ci) => ({ c, ci })).filter(({ c }) => isChemFilled(c));
    if (filled.length === 0) return { level: "hint", text: "Add at least one chemical." };
    for (const { c, ci } of filled) {
      const issue = getChemIssue(c, ci, row);
      if (issue) return { level: issue.level, text: `Chemical ${ci + 1}: ${issue.text}` };
    }
    return null;
  };

  const readyRows = paramRows.filter((r, i) => isRowFilled(r) && !getParamIssue(r, i));
  const readyCount = readyRows.length;
  const readyChemCount = readyRows.reduce((n, r) => n + r.chemicals.filter(isChemFilled).length, 0);
  const isDirty = paramRows.some(isRowFilled);

  // ---------- Parameter row handlers ----------
  const handleAddParamRow = () => {
    setParamRows((prev) => [...prev, emptyParam()]);
    setActiveRow(paramRows.length); // open the new one, collapse the others
  };

  const handleRemoveParamRow = (index: number) => {
    const newLen = paramRows.length === 1 ? 1 : paramRows.length - 1;
    setParamRows((prev) => (prev.length === 1 ? [emptyParam()] : prev.filter((_, i) => i !== index)));
    setActiveRow((a) => Math.min(Math.max(0, a > index ? a - 1 : a), newLen - 1));
  };

  const handleParamNameChange = (index: number, name: string) => {
    setParamRows((prev) => prev.map((r, i) => (i === index ? { ...r, paramName: name } : r)));
  };

  const handleQuickAddParam = (p: any) => {
    const emptyIndex = paramRows.findIndex((r) => !isRowFilled(r));
    const targetIndex = emptyIndex === -1 ? paramRows.length : emptyIndex;
    setParamRows((prev) => {
      if (emptyIndex === -1) return [...prev, { paramName: p.name, chemicals: [emptyChem()] }];
      return prev.map((r, i) => (i === emptyIndex ? { ...r, paramName: p.name } : r));
    });
    setActiveRow(targetIndex);
  };

  // ---------- Chemical row handlers (inside one parameter) ----------
  const handleAddChemical = (pi: number) => {
    setParamRows((prev) => prev.map((r, i) => (i === pi ? { ...r, chemicals: [...r.chemicals, emptyChem()] } : r)));
  };

  const handleRemoveChemical = (pi: number, ci: number) => {
    setParamRows((prev) =>
      prev.map((r, i) => {
        if (i !== pi) return r;
        const next = r.chemicals.length === 1 ? [emptyChem()] : r.chemicals.filter((_, k) => k !== ci);
        return { ...r, chemicals: next };
      })
    );
  };

  const handleChemicalChange = (pi: number, ci: number, field: keyof ChemicalRow, value: string) => {
    setParamRows((prev) =>
      prev.map((r, i) => {
        if (i !== pi) return r;
        const chems = r.chemicals.map((c, k) => {
          if (k !== ci) return c;
          const updated = { ...c, [field]: value };
          if (field === "chemicalId") {
            const found = chemicals.find((x) => x.id === value);
            if (found?.unit) updated.unit = found.unit; // auto-fill the chemical's stock unit
          }
          return updated;
        });
        return { ...r, chemicals: chems };
      })
    );
  };

  // ---------- Open / reset ----------
  const resetForm = () => {
    setEditMode(false);
    setSelectedCatId("");
    setSelectedTypeId("");
    setParamRows([emptyParam()]);
    setActiveRow(0);
  };

  // "Configure Dosage" pre-fills category / unit from the filters you already picked
  const openAddModal = () => {
    resetForm();
    const t = types.find((x) => x.id === filterTypeId);
    setSelectedCatId(filterCatId || t?.categoryId || "");
    setSelectedTypeId(filterTypeId || "");
    setIsModalOpen(true);
  };

  // "Add parameter" from the View popup: the unit is already chosen
  const openAddForUnit = (g: UnitGroup) => {
    resetForm();
    setSelectedCatId(g.categoryId);
    setSelectedTypeId(g.typeId);
    setIsModalOpen(true);
  };

  // "Edit" on one parameter in the View popup: its chemicals are pre-filled (saving updates them)
  const openEditParam = (g: UnitGroup, p: ParamGroup) => {
    resetForm();
    setEditMode(true);
    setSelectedCatId(g.categoryId);
    setSelectedTypeId(g.typeId);
    setParamRows([
      {
        paramName: p.name,
        chemicals: p.items.map((r) => ({
          chemicalId: r.chemicalId,
          amount: String(r.amount),
          unit: r.unit || DEFAULT_CHEM_UNIT,
          description: r.description || "",
        })),
      },
    ]);
    setIsModalOpen(true);
  };

  // ---------- Save ----------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedTypeId) {
      setToast({ message: "Please select a Category and a Unit / Tank first.", type: "error" });
      return;
    }
    const filled = paramRows.map((r, i) => ({ r, i })).filter(({ r }) => isRowFilled(r));
    if (filled.length === 0) {
      setToast({ message: "Please add at least one parameter with a chemical.", type: "error" });
      return;
    }
    const bad = filled.find(({ r, i }) => getParamIssue(r, i));
    if (bad) {
      setActiveRow(bad.i); // open the row that needs fixing
      setToast({ message: `Parameter #${bad.i + 1}: ${getParamIssue(bad.r, bad.i)!.text}`, type: "error" });
      return;
    }

    setSubmitting(true);
    const saved = new Set<number>();
    try {
      // The API saves one parameter (with all its chemicals) per request
      for (const { r, i } of filled) {
        const res = await fetch("/api/manager/parameter-dosages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            typeId: selectedTypeId,
            parameterName: r.paramName.trim(),
            items: r.chemicals
              .filter((c) => c.chemicalId)
              .map((c) => ({ chemicalId: c.chemicalId, amount: c.amount, unit: c.unit, description: c.description })),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(`"${r.paramName}": ${data.error || "Failed to save"}`);
        saved.add(i);
      }

      setToast({
        message: editMode
          ? "Dosages updated successfully!"
          : `${filled.length} parameter${filled.length > 1 ? "s" : ""} configured for ${selectedType?.name || "the unit"}!`,
        type: "success",
      });
      resetForm();
      setIsModalOpen(false);
      refreshRecords();
    } catch (err: any) {
      if (saved.size > 0) {
        // keep only the rows that were NOT saved, so nothing is entered twice
        setParamRows((prev) => prev.filter((_, i) => !saved.has(i)));
        setActiveRow(0);
        refreshRecords();
        setToast({ message: `${saved.size} saved, but ${err.message}`, type: "error" });
      } else {
        setToast({ message: err.message || "Failed to save", type: "error" });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (r: any) => {
    if (!confirm(`Remove ${formatChem(r.chemical?.name) || "this chemical"} from ${r.parameterName} (${r.type?.name || "unit"})?`)) return;
    try {
      const res = await fetch(`/api/manager/parameter-dosages?id=${r.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setToast({ message: "Deleted successfully!", type: "success" });
      refreshRecords();
    } catch (err: any) {
      setToast({ message: err.message, type: "error" });
    }
  };

  const clearFilters = () => {
    setFilterCatId("");
    setFilterTypeId("");
    setSearchText("");
  };

  return (
    <div className="w-full space-y-6 p-4 sm:p-6 relative">
      {/* Header */}
      <div className={`${glass} flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 p-6 rounded-3xl`}>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg">
              <FlaskConical size={22} />
            </span>
            Parameter Chemical Dosages Hub
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Set which chemicals, and how much of each, are needed for every parameter of a tank / unit.
          </p>
        </div>

        <Button
          onClick={openAddModal}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl h-11 px-5 font-semibold shadow-lg cursor-pointer flex items-center gap-2 flex-shrink-0"
        >
          <Plus size={18} /> Configure Dosage
        </Button>
      </div>

      {/* MASTER LIST (Full Width) */}
      <div className={`${glass} p-6 rounded-3xl space-y-4 w-full`}>
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 border-b border-white/60 pb-4 flex-wrap">
            <h3 className="font-semibold text-base text-slate-900 flex items-center gap-2">
              <span>Configured Chemical Dosages</span>
              <span className="text-xs font-bold text-blue-700 bg-blue-500/10 px-3 py-1 rounded-full">
                {hasActiveFilters ? `${unitCount} of ${totalUnitCount} units` : `${totalUnitCount} units`}
              </span>
            </h3>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white/60 hover:bg-white/90 border border-white/80 px-3 py-1.5 rounded-full flex items-center gap-1 cursor-pointer transition-colors"
              >
                <X size={12} /> Clear filters
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search parameter or chemical..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className={`${glassField} pl-10`}
              />
            </div>

            <SearchableDropdown
              options={categories.map((c) => ({ id: c.id, label: c.name }))}
              value={filterCatId}
              onChange={(id) => {
                setFilterCatId(id);
                setFilterTypeId("");
              }}
              placeholder="All Categories"
              icon={Folder}
              clearable
            />

            <SearchableDropdown
              options={filterFilteredTypes.map((t) => ({ id: t.id, label: t.name }))}
              value={filterTypeId}
              onChange={setFilterTypeId}
              placeholder="All Units / Tanks"
              icon={TestTube2}
              clearable
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
          </div>
        ) : (
          <div className="overflow-y-auto space-y-3 pr-1 my-3 max-h-[550px]">
            {categoryGroups.map((cat) => (
              <div key={cat.categoryId || cat.categoryName} className="space-y-2">
                <div className="flex items-center gap-2 px-1 pt-1">
                  <Folder size={14} className="text-indigo-600" />
                  <h4 className="text-sm font-bold text-slate-800">{cat.categoryName}</h4>
                  <span className="text-[11px] font-semibold text-slate-500">
                    {cat.units.length} tank{cat.units.length > 1 ? "s" : ""} / unit{cat.units.length > 1 ? "s" : ""}
                  </span>
                </div>

                {cat.units.map((u) => (
                  <div key={u.typeId} className="p-4 rounded-2xl bg-white/60 border border-white/80 flex items-center justify-between gap-3 shadow-sm">
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <TestTube2 size={15} className="text-blue-600 flex-shrink-0" />
                        <h5 className="font-bold text-slate-900 text-sm truncate">{u.typeName}</h5>
                        <span className="text-[11px] font-bold text-blue-700 bg-blue-500/10 px-2.5 py-0.5 rounded-full">
                          {u.params.length} parameter{u.params.length > 1 ? "s" : ""}
                        </span>
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
                          {u.records.length} chemical{u.records.length > 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {u.params.slice(0, 4).map((p) => (
                          <span key={p.name} className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                            {formatChem(p.name)}
                          </span>
                        ))}
                        {u.params.length > 4 && (
                          <span className="text-[11px] font-semibold text-slate-400 px-1 py-0.5">+{u.params.length - 4} more</span>
                        )}
                      </div>
                    </div>

                    <Button
                      onClick={() => setViewTypeId(u.typeId)}
                      className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-9 px-3.5 text-xs font-semibold shadow-md cursor-pointer flex items-center gap-1.5 flex-shrink-0"
                    >
                      <Eye size={15} /> View
                    </Button>
                  </div>
                ))}
              </div>
            ))}

            {categoryGroups.length === 0 && (
              <div className="text-center py-16 text-slate-500 text-sm space-y-3">
                {records.length === 0 ? (
                  <>
                    <p>No chemical dosages configured yet.</p>
                    <Button
                      onClick={openAddModal}
                      className="bg-blue-600 hover:bg-blue-700 text-white rounded-full h-9 px-4 text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <Plus size={14} /> Configure your first dosage
                    </Button>
                  </>
                ) : (
                  <>
                    <p>No dosages match your filters.</p>
                    <button onClick={clearFilters} className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer">
                      Clear filters
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* VIEW POPUP: all parameters + chemicals of one tank / unit */}
      {viewGroup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setViewTypeId(null);
          }}
        >
          <div className="bg-white/95 backdrop-blur-2xl border border-white/80 shadow-2xl rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between gap-3 px-6 py-4 border-b border-slate-200 flex-shrink-0">
              <div className="space-y-1.5 min-w-0">
                <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                  <TestTube2 size={20} className="text-blue-600 flex-shrink-0" />
                  <span className="truncate">{viewGroup.typeName}</span>
                </h3>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-bold text-indigo-700 bg-indigo-500/10 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <Folder size={11} /> {viewGroup.categoryName}
                  </span>
                  <span className="text-[11px] font-bold text-blue-700 bg-blue-500/10 px-2.5 py-0.5 rounded-full">
                    {viewGroup.params.length} parameter{viewGroup.params.length > 1 ? "s" : ""}
                  </span>
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
                    {viewGroup.records.length} chemical{viewGroup.records.length > 1 ? "s" : ""}
                  </span>
                </div>
              </div>
              <button onClick={() => setViewTypeId(null)} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors flex-shrink-0">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {viewGroup.params.map((p) => (
                <div key={p.name} className="rounded-2xl border border-slate-200/80 bg-white/80 shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-slate-50/90 border-b border-slate-200/70">
                    <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2 min-w-0">
                      <Sliders size={14} className="text-indigo-700 flex-shrink-0" />
                      <span className="truncate">{formatChem(p.name)}</span>
                      <span className="text-[11px] font-semibold text-slate-500">
                        {p.items.length} chemical{p.items.length > 1 ? "s" : ""}
                      </span>
                    </h4>
                    <button
                      onClick={() => openEditParam(viewGroup, p)}
                      className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-500/10 cursor-pointer flex items-center gap-1 text-xs font-semibold"
                      title="Edit this parameter's dosages"
                    >
                      <Edit3 size={14} /> Edit
                    </button>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {p.items.map((r) => (
                      <div key={r.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                        <div className="min-w-0 space-y-0.5">
                          <p className="text-sm text-slate-800 flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-emerald-700">{r.chemical?.name ? formatChem(r.chemical.name) : "Chemical"}</span>
                            <span className="text-xs font-semibold text-blue-700 bg-blue-500/10 px-2 py-0.5 rounded-md">
                              {r.amount} {formatUnit(r.unit)}
                            </span>
                          </p>
                          {r.description && <p className="text-[11px] text-slate-500 italic truncate">Note: {r.description}</p>}
                        </div>
                        <button
                          onClick={() => handleDelete(r)}
                          className="p-2 rounded-xl text-red-500 hover:bg-red-500/10 transition-all cursor-pointer flex-shrink-0"
                          title="Remove this chemical"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50/80 flex-shrink-0">
              <Button
                type="button"
                onClick={() => openAddForUnit(viewGroup)}
                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-full h-10 px-4 text-xs font-semibold shadow-none cursor-pointer flex items-center gap-1.5"
              >
                <Plus size={14} /> Add parameter
              </Button>
              <Button type="button" onClick={() => setViewTypeId(null)} className="bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-full h-10 px-5 font-semibold cursor-pointer shadow-sm">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP MODAL FOR CONFIGURE DOSAGE (add several parameters, each with several chemicals) */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200"
          onMouseDown={(e) => {
            // clicking the dark backdrop closes the popup, unless you have typed something (avoids losing work)
            if (e.target === e.currentTarget && !isDirty) setIsModalOpen(false);
          }}
        >
          <div className="bg-white/95 backdrop-blur-2xl border border-white/80 shadow-2xl rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-shrink-0">
              <div>
                <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                  <FlaskConical size={20} className="text-blue-600" /> {editMode ? "Edit Parameter Dosages" : "Configure Chemical Dosages"}
                </h3>
                {!editMode && (
                  <p className="text-xs text-slate-500 mt-0.5">Pick a tank / unit, then add each parameter with the chemicals it needs.</p>
                )}
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body (Scrollable Form) */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              <form onSubmit={handleSubmit} id="dosage-form" className="space-y-5">
                {/* Step 1: Unit */}
                {editMode ? (
                  <div className="flex items-center gap-2 flex-wrap p-3 rounded-2xl bg-slate-50/80 border border-slate-200/80">
                    <span className="text-[11px] font-bold text-indigo-700 bg-indigo-500/10 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <Folder size={11} /> {categories.find((c) => c.id === selectedCatId)?.name || "Category"}
                    </span>
                    <span className="text-[11px] font-bold text-blue-700 bg-blue-500/10 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <TestTube2 size={11} /> {selectedType?.name || "Unit"}
                    </span>
                    <span className="text-[11px] text-slate-500">Saving updates the amounts of the chemicals below. Use the bin icon in the list to remove one.</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] flex items-center justify-center">1</span>
                      Choose the tank / unit
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-600">Category</label>
                        <SearchableDropdown
                          options={categories.map((c) => ({ id: c.id, label: c.name }))}
                          value={selectedCatId}
                          onChange={(id) => {
                            setSelectedCatId(id);
                            setSelectedTypeId("");
                          }}
                          placeholder="-- Choose Category --"
                          icon={Folder}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-600">Unit / Tank</label>
                        <SearchableDropdown
                          options={formFilteredTypes.map((t) => ({ id: t.id, label: t.name }))}
                          value={selectedTypeId}
                          onChange={setSelectedTypeId}
                          placeholder={selectedCatId ? "-- Choose Unit / Tank --" : "Pick a category first"}
                          disabled={!selectedCatId}
                          icon={TestTube2}
                        />
                        {selectedCatId && formFilteredTypes.length === 0 && (
                          <p className="text-[11px] text-amber-600 font-medium">
                            This category has no tanks / units yet. Add one in Test Categories & Units first.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Parameters (each with its chemicals) */}
                <div className="space-y-3">
                  {!editMode && (
                    <p className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] flex items-center justify-center">2</span>
                      Add parameters and their chemicals
                    </p>
                  )}

                  {/* Quick add chips */}
                  {!editMode && !selectedTypeId && (
                    <p className="text-[11px] font-medium text-slate-500">Choose a category and a unit / tank to see its assigned parameters.</p>
                  )}
                  {!editMode && selectedTypeId && assignedParams.length === 0 && (
                    <p className="text-[11px] font-medium text-amber-600">
                      No parameters are assigned to this unit / tank yet. Assign them first in Parameter Assign &amp; Add Ranges.
                    </p>
                  )}
                  {!editMode && selectedTypeId && assignedParams.length > 0 && catalogSuggestions.length === 0 && (
                    <p className="text-[11px] font-medium text-slate-500">All assigned parameters of this unit / tank are already added below.</p>
                  )}
                  {!editMode && catalogSuggestions.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[11px] font-semibold text-slate-500">Quick add parameter:</p>
                      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                        {catalogSuggestions.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => handleQuickAddParam(p)}
                            className="text-xs font-semibold text-blue-700 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-200 px-2.5 py-1 rounded-full flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Plus size={11} /> {formatChem(p.name)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2.5">
                    {paramRows.map((row, pi) => {
                      const issue = getParamIssue(row, pi);
                      const color = ROW_COLORS[pi % ROW_COLORS.length];
                      const isActive = activeRow === pi;
                      const named = row.paramName.trim();
                      const filledChems = row.chemicals.filter(isChemFilled);
                      const summary = filledChems
                        .map((c) => `${chemName(c.chemicalId) || "?"}${hasValue(c.amount) ? ` ${c.amount} ${formatUnit(c.unit)}` : ""}`)
                        .join(" · ");

                      const paramOptions: { id: string; label: string; subLabel?: string; searchText?: string }[] = assignedParams.map((p) => ({
                        id: p.name,
                        label: formatChem(p.name),
                        searchText: p.name,
                        subLabel: p.unit ? `Unit: ${formatUnit(p.unit)}` : undefined,
                      }));
                      if (named && !paramOptions.some((o) => o.id === row.paramName)) {
                        paramOptions.push({ id: row.paramName, label: formatChem(row.paramName), subLabel: undefined });
                      }

                      return (
                        <div
                          key={pi}
                          ref={(el) => { rowRefs.current[pi] = el; }}
                          className={`rounded-2xl border-2 bg-white/80 shadow-sm transition-colors ${
                            issue?.level === "error" ? "border-red-300" : isActive ? color.border : "border-slate-200/80"
                          }`}
                        >
                          {/* Parameter header: always visible. Click to open. */}
                          <div onClick={() => setActiveRow(pi)} className="flex items-center gap-3 p-3 cursor-pointer select-none">
                            <span className={`w-7 h-7 rounded-full ${color.badge} text-white text-xs font-bold flex items-center justify-center flex-shrink-0`}>
                              {pi + 1}
                            </span>

                            <div className="min-w-0 flex-1">
                              <p className={`text-sm font-bold truncate ${named ? "text-slate-900" : "text-slate-400 italic font-medium"}`}>
                                {named || "New parameter (choose below)"}
                              </p>
                              {!isActive && named && (
                                <p className={`text-xs truncate ${issue ? (issue.level === "error" ? "text-red-600" : "text-amber-600") : "text-slate-500"}`}>
                                  {issue ? issue.text : summary}
                                </p>
                              )}
                            </div>

                            {named && (
                              issue ? (
                                <AlertCircle size={18} className={`flex-shrink-0 ${issue.level === "error" ? "text-red-500" : "text-amber-500"}`} />
                              ) : (
                                <CheckCircle2 size={18} className="text-emerald-500 flex-shrink-0" />
                              )
                            )}

                            {!editMode && (paramRows.length > 1 || named) && (
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleRemoveParamRow(pi); }}
                                className="text-red-500 hover:text-red-700 p-1 rounded-lg hover:bg-red-50 cursor-pointer flex-shrink-0"
                                title="Remove this parameter"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                            <ChevronDown size={16} className={`text-slate-400 flex-shrink-0 transition-transform duration-200 ${isActive ? "rotate-180" : ""}`} />
                          </div>

                          {/* Open parameter: pick parameter + its chemicals */}
                          {isActive && (
                            <div className="px-4 pb-4 pt-3 space-y-3 border-t border-slate-100">
                              <div className="space-y-1">
                                <label className="text-[11px] font-semibold text-slate-600">Parameter</label>
                                <SearchableDropdown
                                  options={paramOptions}
                                  value={row.paramName}
                                  onChange={(name) => handleParamNameChange(pi, name)}
                                  placeholder="-- Choose Parameter --"
                                  icon={Sliders}
                                  disabled={editMode}
                                />
                              </div>

                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">
                                    Chemicals for {named || "this parameter"}
                                  </label>
                                </div>

                                {row.chemicals.map((chem, ci) => {
                                  const chemIssue = getChemIssue(chem, ci, row);
                                  const existing = chem.chemicalId && named && selectedTypeId ? findExisting(row.paramName, chem.chemicalId) : null;
                                  return (
                                    <div
                                      key={ci}
                                      className={`p-3 rounded-xl bg-slate-50 border border-slate-200 border-l-4 ${color.stripe} space-y-2.5 relative`}
                                    >
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="text-[11px] font-bold text-slate-500 uppercase">Chemical {ci + 1}</span>
                                        {(row.chemicals.length > 1 || isChemFilled(chem)) && (
                                          <button
                                            type="button"
                                            onClick={() => handleRemoveChemical(pi, ci)}
                                            className="text-red-500 hover:text-red-700 p-1 rounded-lg hover:bg-red-50 cursor-pointer"
                                            title="Remove this chemical"
                                          >
                                            <Trash2 size={14} />
                                          </button>
                                        )}
                                      </div>

                                      <SearchableDropdown
                                        options={chemicals.map((c) => ({ id: c.id, label: formatChem(c.name), searchText: c.name, subLabel: `Stock: ${c.quantity} ${formatUnit(c.unit)}` }))}
                                        value={chem.chemicalId}
                                        onChange={(id) => handleChemicalChange(pi, ci, "chemicalId", id)}
                                        placeholder="-- Choose Chemical --"
                                        icon={FlaskConical}
                                      />

                                      <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                          <label className="text-[10px] font-bold text-slate-500 uppercase">Amount</label>
                                          <input
                                            type="number"
                                            step="any"
                                            placeholder="e.g. 25"
                                            value={chem.amount}
                                            onChange={(e) => handleChemicalChange(pi, ci, "amount", e.target.value)}
                                            className={glassField}
                                          />
                                        </div>
                                        <div className="space-y-1">
                                          <label className="text-[10px] font-bold text-slate-500 uppercase">Unit</label>
                                          <UnitSelect
                                            value={chem.unit}
                                            onChange={(v) => handleChemicalChange(pi, ci, "unit", v)}
                                            className={glassField}
                                          />
                                        </div>
                                      </div>

                                      <input
                                        type="text"
                                        placeholder="Note (optional), e.g. Coagulation aid"
                                        value={chem.description}
                                        onChange={(e) => handleChemicalChange(pi, ci, "description", e.target.value)}
                                        className={glassField}
                                      />

                                      {chemIssue ? (
                                        <p className={`text-xs font-medium flex items-start gap-1.5 ${chemIssue.level === "error" ? "text-red-600" : "text-amber-600"}`}>
                                          <AlertCircle size={13} className="flex-shrink-0 mt-px" /> {chemIssue.text}
                                        </p>
                                      ) : (
                                        existing &&
                                        !editMode && (
                                          <p className="text-xs font-medium text-blue-600 flex items-start gap-1.5">
                                            <AlertCircle size={13} className="flex-shrink-0 mt-px" />
                                            Already configured ({existing.amount} {formatUnit(existing.unit)}). Saving will update it.
                                          </p>
                                        )
                                      )}
                                    </div>
                                  );
                                })}

                                <button
                                  type="button"
                                  onClick={() => handleAddChemical(pi)}
                                  className="w-full text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-500/10 hover:bg-blue-500/15 border border-dashed border-blue-300 rounded-xl py-2 flex items-center justify-center gap-1 cursor-pointer transition-colors"
                                >
                                  <Plus size={14} /> Add another chemical to {named || "this parameter"}
                                </button>
                              </div>

                              {issue && (
                                <p className={`text-xs font-medium flex items-start gap-1.5 ${issue.level === "error" ? "text-red-600" : "text-amber-600"}`}>
                                  <AlertCircle size={14} className="flex-shrink-0 mt-px" /> {issue.text}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {!editMode && (
                    <Button
                      type="button"
                      onClick={handleAddParamRow}
                      className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-dashed border-indigo-300 rounded-2xl h-10 text-xs font-semibold shadow-none cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Plus size={14} /> Add another parameter
                    </Button>
                  )}
                </div>
              </form>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50/80 flex-shrink-0">
              <p className="text-xs text-slate-500 hidden sm:block">
                {readyCount > 0
                  ? `${readyCount} parameter${readyCount > 1 ? "s" : ""} · ${readyChemCount} chemical${readyChemCount > 1 ? "s" : ""} ready to save${selectedType ? ` to ${selectedType.name}` : ""}`
                  : "Nothing to save yet."}
              </p>
              <div className="flex items-center gap-3 ml-auto">
                <Button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-full h-10 px-5 font-semibold cursor-pointer shadow-sm"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  form="dosage-form"
                  disabled={submitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-full h-10 px-6 font-semibold cursor-pointer shadow-md"
                >
                  {submitting ? (
                    <Loader2 className="animate-spin h-5 w-5" />
                  ) : editMode ? (
                    "Update Dosages"
                  ) : readyCount > 0 ? (
                    `Save ${readyCount} Parameter${readyCount > 1 ? "s" : ""}`
                  ) : (
                    "Save Dosages"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[70] flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/90 backdrop-blur-2xl border border-white shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
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