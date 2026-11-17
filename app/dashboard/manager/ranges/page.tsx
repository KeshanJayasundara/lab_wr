"use client";

import React, { useEffect, useState, useRef } from "react";
import { Plus, Loader2, Sliders, TestTube2, Trash2, Search, Edit3, X, Folder, ChevronDown, Check, CheckCircle2, AlertCircle, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatChem } from "@/lib/chemFormat";

const glass =
  "bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_32px_rgba(15,23,42,0.10)] ring-1 ring-inset ring-white/40";

const glassField =
  "w-full px-3.5 py-2.5 rounded-2xl border border-white/70 bg-white/60 backdrop-blur-xl text-sm font-medium text-slate-800 placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/60";

const DEFAULT_UNIT = "mg/L";

// Min is either ">=" (value included) or ">" (value NOT included). Max is "<=" or "<".
type MinOp = ">=" | ">";
type MaxOp = "<=" | "<";

interface ParameterRow {
  parameterName: string;
  unit: string;
  standardMin: string;
  standardMax: string;
  minOp: MinOp;
  maxOp: MaxOp;
  rangeText: string;
}

const emptyRow = (): ParameterRow => ({
  parameterName: "",
  unit: DEFAULT_UNIT,
  standardMin: "",
  standardMax: "",
  minOp: ">",
  maxOp: "<",
  rangeText: "",
});

// Each parameter row gets its own colour so rows are easy to tell apart
const ROW_COLORS = [
  { badge: "bg-blue-600", border: "border-blue-400" },
  { badge: "bg-violet-600", border: "border-violet-400" },
  { badge: "bg-emerald-600", border: "border-emerald-400" },
  { badge: "bg-fuchsia-600", border: "border-fuchsia-400" },
  { badge: "bg-cyan-600", border: "border-cyan-400" },
  { badge: "bg-orange-500", border: "border-orange-400" },
];

const norm = (s: string) => (s || "").trim().toLowerCase();
const hasValue = (v: any) => v !== null && v !== undefined && String(v).trim() !== "";

// Friendly text for a range:  "6.5 – 8 pH",  "≥ 6.5 pH",  "≤ 8 pH",  or the special rule text
function formatRange(min: any, max: any, text: string | null | undefined, unit: string | null | undefined) {
  if (text && text.trim()) return text.trim();
  const u = unit ? ` ${formatChem(unit, "unit")}` : "";
  if (hasValue(min) && hasValue(max)) return `${min} – ${max}${u}`;
  if (hasValue(min)) return `≥ ${min}${u}`;
  if (hasValue(max)) return `≤ ${max}${u}`;
  return "Not set";
}

// ---------- Comparison operators (>=, >, <=, <) ----------
const OP_SYMBOL: Record<string, string> = { ">=": "≥", ">": ">", "<=": "≤", "<": "<" };

// true when at least one bound is "not included" (> or <)
const isStrict = (min: any, max: any, minOp: MinOp, maxOp: MaxOp) =>
  (hasValue(min) && minOp === ">") || (hasValue(max) && maxOp === "<");

// Shown the way lab sheets write it:
//   both bounds : "15 < NH₃-N < 70"   (or "15 ≤ NH₃-N ≤ 70")
//   only Min    : "NH₃-N > 15"        (or "NH₃-N ≥ 15")
//   only Max    : "NH₃-N < 70"        (or "NH₃-N ≤ 70")
function buildOpText(min: any, max: any, minOp: MinOp, maxOp: MaxOp, name?: string | null) {
  const n = formatChem(name) || "Value";
  const hasMin = hasValue(min);
  const hasMax = hasValue(max);
  if (hasMin && hasMax) {
    const left = minOp === ">=" ? "≤" : "<"; // Min is on the LEFT of the name, so the sign flips
    const right = maxOp === "<=" ? "≤" : "<";
    return `${Number(min)} ${left} ${n} ${right} ${Number(max)}`;
  }
  if (hasMin) return `${n} ${OP_SYMBOL[minOp]} ${Number(min)}`;
  if (hasMax) return `${n} ${OP_SYMBOL[maxOp]} ${Number(max)}`;
  return "";
}

// What the user will see for a limit (special text > operator style)
function formatLimit(min: any, max: any, minOp: MinOp, maxOp: MaxOp, text: string, name?: string | null) {
  if (text && text.trim()) return text.trim();
  return buildOpText(min, max, minOp, maxOp, name) || "Not set";
}

// What we save in rangeText. Only needed when a strict operator (> or <) is used,
// because min / max numbers alone can't say "not included".
function storedRangeText(min: any, max: any, minOp: MinOp, maxOp: MaxOp, text: string, name?: string | null) {
  if (text.trim()) return text.trim();
  return isStrict(min, max, minOp, maxOp) ? buildOpText(min, max, minOp, maxOp, name) : "";
}

// Work out the operators again from the saved text (nothing saved = old style, value included)
function parseStoredOps(min: any, max: any, text: string | null | undefined, name?: string | null): { minOp: MinOp; maxOp: MaxOp; text: string } {
  const t = (text || "").trim();
  if (!t) return { minOp: ">=", maxOp: "<=", text: "" };
  for (const mi of [">=", ">"] as MinOp[]) {
    for (const ma of ["<=", "<"] as MaxOp[]) {
      if (isStrict(min, max, mi, ma) && buildOpText(min, max, mi, ma, name) === t) return { minOp: mi, maxOp: ma, text: "" };
    }
  }
  return { minOp: ">=", maxOp: "<=", text: t }; // a real special rule, e.g. "Absent"
}

// Display text for a saved limit row (used in the list / view popup)
function displayRange(r: any) {
  const p = parseStoredOps(r.standardMin, r.standardMax, r.rangeText, r.parameterName);
  return formatLimit(r.standardMin, r.standardMax, p.minOp, p.maxOp, p.text, r.parameterName);
}

function limitIssue(min: any, max: any, minOp: MinOp, maxOp: MaxOp, hasText: boolean): string | null {
  if (hasValue(min) && hasValue(max)) {
    const a = Number(min);
    const b = Number(max);
    if (a > b) return "Min cannot be greater than Max.";
    if (a === b && !hasText && (minOp === ">" || maxOp === "<")) {
      return "Min and Max are the same value, so use ≥ and ≤ (or clear one of them).";
    }
  }
  return null;
}

const MIN_OPTS = [
  { value: ">=", label: "≥", title: "Greater than or equal to (value included)" },
  { value: ">", label: ">", title: "Greater than (value not included)" },
];
const MAX_OPTS = [
  { value: "<=", label: "≤", title: "Less than or equal to (value included)" },
  { value: "<", label: "<", title: "Less than (value not included)" },
];

function OpToggle({ value, options, onChange, disabled = false }: {
  value: string;
  options: { value: string; label: string; title: string }[];
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className={`inline-flex rounded-xl border border-slate-200 bg-slate-100/70 p-0.5 ${disabled ? "opacity-40 pointer-events-none" : ""}`}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          title={o.title}
          onClick={() => onChange(o.value)}
          className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
            value === o.value ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-white"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// "Min is [≥][>]   Max is [≤][<]"
function OpsRow({ min, max, minOp, maxOp, onMinOp, onMaxOp, hasText }: {
  min: string;
  max: string;
  minOp: MinOp;
  maxOp: MaxOp;
  onMinOp: (v: MinOp) => void;
  onMaxOp: (v: MaxOp) => void;
  hasText: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <span className="flex items-center gap-2 text-[11px] font-semibold text-slate-600">
          Min is
          <OpToggle value={minOp} options={MIN_OPTS} onChange={(v) => onMinOp(v as MinOp)} disabled={hasText || !hasValue(min)} />
        </span>
        <span className="flex items-center gap-2 text-[11px] font-semibold text-slate-600">
          Max is
          <OpToggle value={maxOp} options={MAX_OPTS} onChange={(v) => onMaxOp(v as MaxOp)} disabled={hasText || !hasValue(max)} />
        </span>
      </div>
      <p className="text-[11px] text-slate-500">
        {hasText
          ? "The special rule below is used, so these are ignored."
          : "< and > do not include the value itself. ≤ and ≥ do (e.g. “15 < NH₃-N < 70” means 15 and 70 are not allowed)."}
      </p>
    </div>
  );
}

interface UnitGroup {
  typeId: string;
  typeName: string;
  categoryId: string;
  categoryName: string;
  ranges: any[];
}
interface CategoryGroup {
  categoryId: string;
  categoryName: string;
  units: UnitGroup[];
}

// Category -> Tank/Unit -> all its parameter limits
function buildCategoryGroups(list: any[]): CategoryGroup[] {
  const units = new Map<string, UnitGroup>();
  for (const r of list) {
    let u = units.get(r.typeId);
    if (!u) {
      u = {
        typeId: r.typeId,
        typeName: r.type?.name || "Tank / Unit",
        categoryId: r.type?.categoryId || "",
        categoryName: r.type?.category?.name || "Category",
        ranges: [],
      };
      units.set(r.typeId, u);
    }
    u.ranges.push(r);
  }

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

function SearchableDropdown({ options, value, onChange, placeholder, disabled = false, icon: Icon, clearable = false }: {
  options: { id: string; label: string; subLabel?: string }[];
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

// Parameter-name box with a suggestion list that shows names the right way (F⁻, Fe³⁺, NH₃ ...).
// (The browser's built-in <datalist> can only show the raw typed text, so we draw our own list.)
function NameCombobox({ value, onChange, options, taken, inputRef, placeholder }: {
  value: string;
  onChange: (v: string) => void;
  options: { id: string; name: string; unit?: string | null }[];
  taken: Set<string>; // names that are already configured / already added (cannot be picked again)
  inputRef?: (el: HTMLInputElement | null) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const q = value.trim().toLowerCase();
  const matches = options.filter(
    (o) => !q || o.name.toLowerCase().includes(q) || formatChem(o.name).toLowerCase().includes(q)
  );

  const pick = (o: { name: string }) => {
    if (taken.has(norm(o.name))) return;
    onChange(o.name);
    setOpen(false);
    setHi(-1);
  };

  return (
    <div className="relative" ref={wrapRef}>
      <input
        type="text"
        ref={inputRef}
        placeholder={placeholder}
        value={value}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setHi(-1);
        }}
        onKeyDown={(e) => {
          if (!open || matches.length === 0) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setHi((h) => (h + 1) % matches.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHi((h) => (h <= 0 ? matches.length - 1 : h - 1));
          } else if (e.key === "Enter" && hi >= 0) {
            e.preventDefault(); // pick the highlighted name instead of submitting the form
            pick(matches[hi]);
          } else if (e.key === "Escape" && open) {
            e.stopPropagation();
            setOpen(false);
          }
        }}
        autoComplete="off"
        className={glassField}
      />

      {open && matches.length > 0 && (
        <ul className="absolute z-50 mt-1.5 w-full max-h-52 overflow-y-auto rounded-2xl p-1.5 space-y-0.5 bg-white/95 backdrop-blur-2xl border border-white/80 shadow-2xl">
          {matches.map((o, i) => {
            const isTaken = taken.has(norm(o.name));
            return (
              <li
                key={o.id}
                onMouseDown={(e) => {
                  e.preventDefault(); // keep focus in the input
                  pick(o);
                }}
                onMouseEnter={() => setHi(i)}
                className={`flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-xs ${
                  isTaken
                    ? "text-slate-400 cursor-not-allowed"
                    : hi === i
                      ? "bg-blue-500 text-white cursor-pointer"
                      : "text-slate-700 hover:bg-slate-100 cursor-pointer"
                }`}
              >
                <span className="font-semibold truncate">{formatChem(o.name)}</span>
                <span className={`flex-shrink-0 text-[10px] ${hi === i && !isTaken ? "text-blue-100" : "text-slate-400"}`}>
                  {isTaken ? "already added" : o.unit ? formatChem(o.unit, "unit") : ""}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function ManagerTankRangesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [globalParameters, setGlobalParameters] = useState<any[]>([]);
  const [allConfiguredRanges, setAllConfiguredRanges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCatId, setSelectedCatId] = useState("");
  const [selectedTypeId, setSelectedTypeId] = useState("");
  const [filterCatId, setFilterCatId] = useState("");
  const [filterTypeId, setFilterTypeId] = useState("");
  const [searchText, setSearchText] = useState("");
  const [viewTypeId, setViewTypeId] = useState<string | null>(null); // unit shown in the "View" popup

  const [editingId, setEditingId] = useState<string | null>(null);

  // Batch parameter rows state for multi-add
  const [rows, setRows] = useState<ParameterRow[]>([emptyRow()]);
  const [activeRow, setActiveRow] = useState(0); // the one row that is expanded
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const nameRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Single edit states
  const [editParamName, setEditParamName] = useState("");
  const [editUnit, setEditUnit] = useState(DEFAULT_UNIT);
  const [editMin, setEditMin] = useState("");
  const [editMax, setEditMax] = useState("");
  const [editRangeText, setEditRangeText] = useState("");
  const [editMinOp, setEditMinOp] = useState<MinOp>(">");
  const [editMaxOp, setEditMaxOp] = useState<MaxOp>("<");

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
    if (!isModalOpen && !viewTypeId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (isModalOpen) setIsModalOpen(false); // top-most popup first
      else setViewTypeId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isModalOpen, viewTypeId]);

  // When the active row changes: scroll it into view and focus its name box if it is still empty
  useEffect(() => {
    if (!isModalOpen || editingId) return;
    const t = setTimeout(() => {
      rowRefs.current[activeRow]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      if (selectedTypeId && !rows[activeRow]?.parameterName.trim()) nameRefs.current[activeRow]?.focus();
    }, 60);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRow, isModalOpen]);

  const fetchMasterData = async () => {
    try {
      const [catRes, typeRes, paramRes, rangeRes] = await Promise.all([
        fetch("/api/manager/categories"),
        fetch("/api/manager/types"),
        fetch("/api/manager/parameters"),
        fetch("/api/manager/ranges"),
      ]);

      const catData = await catRes.json();
      const typeData = await typeRes.json();
      const paramData = await paramRes.json();
      const rangeData = await rangeRes.json();

      if (catRes.ok) setCategories(catData.data || []);
      if (typeRes.ok) setTypes(typeData.data || []);
      if (paramRes.ok) setGlobalParameters(paramData.data || []);
      if (rangeRes.ok) setAllConfiguredRanges(rangeData.data || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMasterData();
  }, []);

  const refreshRanges = async () => {
    try {
      const res = await fetch("/api/manager/ranges");
      const data = await res.json();
      if (res.ok) setAllConfiguredRanges(data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  // ---------- Derived data ----------
  const selectedType = types.find((t) => t.id === selectedTypeId);
  const formFilteredTypes = types.filter((t) => t.categoryId === selectedCatId);
  const filterFilteredTypes = types.filter((t) => !filterCatId || t.categoryId === filterCatId);
  const editingRange = editingId ? allConfiguredRanges.find((r) => r.id === editingId) : null;

  // Parameters already configured for the unit chosen in the form
  const configuredNames = new Set(
    allConfiguredRanges.filter((r) => r.typeId === selectedTypeId).map((r) => norm(r.parameterName))
  );

  // Catalog parameters that can still be added (quick-add chips)
  const catalogSuggestions = globalParameters.filter(
    (p) => !configuredNames.has(norm(p.name)) && !rows.some((r) => norm(r.parameterName) === norm(p.name))
  );

  const hasActiveFilters = !!(filterCatId || filterTypeId || searchText.trim());

  const filteredMasterRanges = allConfiguredRanges.filter((r) => {
    const matchesCat = !filterCatId || r.type?.categoryId === filterCatId;
    const matchesType = !filterTypeId || r.typeId === filterTypeId;
    const matchesSearch = !searchText.trim() || norm(r.parameterName).includes(norm(searchText));
    return matchesCat && matchesType && matchesSearch;
  });

  const categoryGroups = buildCategoryGroups(filteredMasterRanges);
  const unitCount = categoryGroups.reduce((n, c) => n + c.units.length, 0);
  const totalUnitCount = new Set(allConfiguredRanges.map((r) => r.typeId)).size;
  const viewGroup = viewTypeId
    ? buildCategoryGroups(allConfiguredRanges.filter((r) => r.typeId === viewTypeId))[0]?.units[0]
    : undefined;

  // If the viewed unit has no limits left (e.g. last one deleted), close its popup
  useEffect(() => {
    if (viewTypeId && !allConfiguredRanges.some((r) => r.typeId === viewTypeId)) setViewTypeId(null);
  }, [viewTypeId, allConfiguredRanges]);

  // ---------- Row validation ----------
  // level "error" = something is wrong, "hint" = something is still missing. Both block saving.
  const getRowIssue = (row: ParameterRow, index: number): { level: "error" | "hint"; text: string } | null => {
    const name = norm(row.parameterName);
    if (!name) return null; // empty rows are simply ignored

    if (selectedTypeId && configuredNames.has(name)) {
      return { level: "error", text: `"${row.parameterName.trim()}" is already configured for this unit. Use the edit (pencil) button in the list instead.` };
    }
    if (rows.some((r, i) => i < index && norm(r.parameterName) === name)) {
      return { level: "error", text: `"${row.parameterName.trim()}" is added twice in this list.` };
    }
    const minSet = hasValue(row.standardMin);
    const maxSet = hasValue(row.standardMax);
    if (!minSet && !maxSet && !row.rangeText.trim()) {
      return { level: "hint", text: "Enter a Min, a Max, or a special rule." };
    }
    const lim = limitIssue(row.standardMin, row.standardMax, row.minOp, row.maxOp, !!row.rangeText.trim());
    if (lim) return { level: "error", text: lim };
    return null;
  };

  const readyCount = rows.filter((r, i) => norm(r.parameterName) && !getRowIssue(r, i)).length;
  const isDirty = rows.some((r) => norm(r.parameterName));

  // ---------- Row handlers ----------
  const handleAddRow = () => {
    setRows((prev) => [...prev, emptyRow()]);
    setActiveRow(rows.length); // open the new row, collapse the others
  };

  const handleRemoveRow = (index: number) => {
    const newLen = rows.length === 1 ? 1 : rows.length - 1;
    setRows((prev) => (prev.length === 1 ? [emptyRow()] : prev.filter((_, i) => i !== index)));
    setActiveRow((a) => Math.min(Math.max(0, a > index ? a - 1 : a), newLen - 1));
  };

  const handleRowChange = (index: number, field: keyof ParameterRow, value: string) => {
    setRows((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Typing / picking a name that exists in the catalog auto-fills its unit
  const handleNameChange = (index: number, value: string) => {
    const found = globalParameters.find((p) => norm(p.name) === norm(value));
    setRows((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        parameterName: value,
        unit: found?.unit ? found.unit : updated[index].unit,
      };
      return updated;
    });
  };

  // One-click add from the catalog chips
  const handleQuickAdd = (p: any) => {
    const emptyIndex = rows.findIndex((r) => !r.parameterName.trim());
    const targetIndex = emptyIndex === -1 ? rows.length : emptyIndex;
    setRows((prev) => {
      const newRow: ParameterRow = { ...emptyRow(), parameterName: p.name, unit: p.unit || DEFAULT_UNIT };
      if (emptyIndex === -1) return [...prev, newRow];
      const updated = [...prev];
      updated[emptyIndex] = { ...updated[emptyIndex], ...newRow };
      return updated;
    });
    setActiveRow(targetIndex);
  };

  // ---------- Save ----------
  const handleSaveRanges = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingId) {
      // Single Edit Submission
      if (!editParamName.trim()) return;
      const limErr = limitIssue(editMin, editMax, editMinOp, editMaxOp, !!editRangeText.trim());
      if (limErr) {
        setToast({ message: limErr, type: "error" });
        return;
      }
      if (!hasValue(editMin) && !hasValue(editMax) && !editRangeText.trim()) {
        setToast({ message: "Enter a Min, a Max, or a special rule.", type: "error" });
        return;
      }

      setSubmitting(true);
      try {
        const res = await fetch("/api/manager/ranges", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingId,
            unit: editUnit,
            standardMin: editMin,
            standardMax: editMax,
            rangeText: storedRangeText(editMin, editMax, editMinOp, editMaxOp, editRangeText, editParamName),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to update range");

        setToast({ message: `"${formatChem(editParamName)}" limit updated successfully!`, type: "success" });
        cancelEdit();
        setIsModalOpen(false);
        refreshRanges();
      } catch (err: any) {
        setToast({ message: err.message || "Failed to update", type: "error" });
      } finally {
        setSubmitting(false);
      }
    } else {
      // Batch Multi-Row Submission
      if (!selectedTypeId) {
        setToast({ message: "Please select a Category and a Tank / Unit first.", type: "error" });
        return;
      }
      const filledRows = rows.map((r, i) => ({ r, i })).filter(({ r }) => r.parameterName.trim() !== "");
      if (filledRows.length === 0) {
        setToast({ message: "Please add at least one parameter.", type: "error" });
        return;
      }
      const bad = filledRows.find(({ r, i }) => getRowIssue(r, i));
      if (bad) {
        setActiveRow(bad.i); // open the row that needs fixing
        setToast({ message: `Parameter #${bad.i + 1}: ${getRowIssue(bad.r, bad.i)!.text}`, type: "error" });
        return;
      }

      setSubmitting(true);
      try {
        const payload = filledRows.map(({ r }) => ({
          typeId: selectedTypeId,
          parameterName: r.parameterName.trim(),
          unit: r.unit,
          standardMin: r.standardMin,
          standardMax: r.standardMax,
          rangeText: storedRangeText(r.standardMin, r.standardMax, r.minOp, r.maxOp, r.rangeText, r.parameterName.trim()),
        }));

        const res = await fetch("/api/manager/ranges", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to save parameter ranges");

        setToast({
          message: `${filledRows.length} parameter limit${filledRows.length > 1 ? "s" : ""} added to ${selectedType?.name || "the unit"}!`,
          type: "success",
        });
        cancelEdit();
        setIsModalOpen(false);
        refreshRanges();
      } catch (err: any) {
        setToast({ message: err.message || "Failed to save", type: "error" });
      } finally {
        setSubmitting(false);
      }
    }
  };

  // ---------- Open / close ----------
  // "Add" pre-fills the category / unit from the filters you already picked
  const openAddModal = () => {
    cancelEdit();
    const t = types.find((x) => x.id === filterTypeId);
    setSelectedCatId(filterCatId || t?.categoryId || "");
    setSelectedTypeId(filterTypeId || "");
    setIsModalOpen(true);
  };

  // "Add parameter" from inside the View popup: unit is already chosen
  const openAddForUnit = (g: UnitGroup) => {
    cancelEdit();
    setSelectedCatId(g.categoryId);
    setSelectedTypeId(g.typeId);
    setIsModalOpen(true);
  };

  const startEdit = (r: any) => {
    setEditingId(r.id);
    setSelectedCatId(r.type?.categoryId || "");
    setSelectedTypeId(r.typeId);
    setEditParamName(r.parameterName);
    setEditUnit(r.unit || DEFAULT_UNIT);
    const minStr = r.standardMin !== null && r.standardMin !== undefined ? r.standardMin.toString() : "";
    const maxStr = r.standardMax !== null && r.standardMax !== undefined ? r.standardMax.toString() : "";
    const parsed = parseStoredOps(minStr, maxStr, r.rangeText, r.parameterName);
    setEditMin(minStr);
    setEditMax(maxStr);
    setEditMinOp(parsed.minOp);
    setEditMaxOp(parsed.maxOp);
    setEditRangeText(parsed.text);
    setIsModalOpen(true);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setSelectedCatId("");
    setSelectedTypeId("");
    setRows([emptyRow()]);
    setActiveRow(0);
    setEditParamName("");
    setEditUnit(DEFAULT_UNIT);
    setEditMin("");
    setEditMax("");
    setEditRangeText("");
    setEditMinOp(">");
    setEditMaxOp("<");
  };

  const handleDeleteRange = async (r: any) => {
    if (!confirm(`Delete the "${r.parameterName}" limit for ${r.type?.name || "this unit"}?`)) return;
    try {
      const res = await fetch(`/api/manager/ranges?id=${r.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete configuration");
      setToast({ message: "Deleted successfully!", type: "success" });
      refreshRanges();
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
            <span className="p-2.5 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 text-white shadow-lg">
              <Sliders size={22} />
            </span>
            Tank & Unit Parameter Ranges Hub
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Set the acceptable min / max limits for each tank or unit, and see every configured limit in one place.
          </p>
        </div>

        <Button
          onClick={openAddModal}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl h-11 px-5 font-semibold shadow-lg cursor-pointer flex items-center gap-2 flex-shrink-0"
        >
          <Plus size={18} /> Add Parameter Limits
        </Button>
      </div>

      {/* MASTER LIST (Full Width) */}
      <div className={`${glass} p-6 rounded-3xl space-y-4 w-full`}>
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 border-b border-white/60 pb-4 flex-wrap">
            <h3 className="font-semibold text-base text-slate-900 flex items-center gap-2">
              <span>All Configured Limits</span>
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search parameter (e.g. pH, COD)..."
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
              placeholder="All Tanks / Units"
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
                          {u.ranges.length} parameter{u.ranges.length > 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {u.ranges.slice(0, 4).map((r: any) => (
                          <span key={r.id} className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                            {formatChem(r.parameterName)}
                          </span>
                        ))}
                        {u.ranges.length > 4 && (
                          <span className="text-[11px] font-semibold text-slate-400 px-1 py-0.5">+{u.ranges.length - 4} more</span>
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
            {filteredMasterRanges.length === 0 && (
              <div className="text-center py-16 text-slate-500 text-sm space-y-3">
                {allConfiguredRanges.length === 0 ? (
                  <>
                    <p>No parameter limits configured yet.</p>
                    <Button
                      onClick={openAddModal}
                      className="bg-blue-600 hover:bg-blue-700 text-white rounded-full h-9 px-4 text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <Plus size={14} /> Add your first limit
                    </Button>
                  </>
                ) : (
                  <>
                    <p>No limits match your filters.</p>
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

      {/* VIEW POPUP: all parameter limits of one tank / unit */}
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
                    {viewGroup.ranges.length} parameter{viewGroup.ranges.length > 1 ? "s" : ""}
                  </span>
                </div>
              </div>
              <button onClick={() => setViewTypeId(null)} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors flex-shrink-0">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-2.5 flex-1">
              {viewGroup.ranges.map((r: any) => (
                <div key={r.id} className="p-3.5 rounded-2xl bg-white/80 border border-slate-200/80 flex items-center justify-between gap-3 shadow-sm">
                  <div className="space-y-1 min-w-0">
                    <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <Sliders size={14} className="text-indigo-700 flex-shrink-0" />
                      <span className="truncate">{formatChem(r.parameterName)}</span>
                      {r.unit && <span className="text-xs font-normal text-slate-500">({formatChem(r.unit, "unit")})</span>}
                    </h4>
                    <p className="text-xs text-slate-600">
                      Acceptable range:{" "}
                      <span className="font-semibold text-blue-700 bg-blue-500/10 px-2 py-0.5 rounded-md">
                        {displayRange(r)}
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => startEdit(r)} className="p-2 rounded-xl text-blue-600 hover:bg-blue-500/10 transition-all cursor-pointer" title="Edit limit">
                      <Edit3 size={16} />
                    </button>
                    <button onClick={() => handleDeleteRange(r)} className="p-2 rounded-xl text-red-500 hover:bg-red-500/10 transition-all cursor-pointer" title="Delete limit">
                      <Trash2 size={16} />
                    </button>
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

      {/* POPUP MODAL (BATCH ADD OR SINGLE EDIT) */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200"
          onMouseDown={(e) => {
            // clicking the dark backdrop closes the popup, unless you have typed something (avoids losing work)
            if (e.target === e.currentTarget && !isDirty) setIsModalOpen(false);
          }}
        >
          <div className="bg-white/95 backdrop-blur-2xl border border-white/80 shadow-2xl rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-shrink-0">
              <div>
                <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                  <Sliders size={20} className="text-blue-600" /> {editingId ? "Edit Parameter Limit" : "Add Parameter Limits"}
                </h3>
                {!editingId && (
                  <p className="text-xs text-slate-500 mt-0.5">Pick a tank / unit, then add as many parameters as you need in one go.</p>
                )}
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <form onSubmit={handleSaveRanges} id="range-form" className="space-y-4">
                {editingId ? (
                  // SINGLE EDIT VIEW
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 flex-wrap p-3 rounded-2xl bg-slate-50/80 border border-slate-200/80">
                      <span className="text-[11px] font-bold text-indigo-700 bg-indigo-500/10 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <Folder size={11} /> {editingRange?.type?.category?.name || "Category"}
                      </span>
                      <span className="text-[11px] font-bold text-blue-700 bg-blue-500/10 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <TestTube2 size={11} /> {editingRange?.type?.name || "Tank / Unit"}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">Parameter</label>
                      <input
                        type="text"
                        value={formatChem(editParamName)}
                        readOnly
                        title="The parameter can't be changed. Delete this limit and add a new one instead."
                        className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-300/80 bg-slate-100/70 text-sm font-bold text-slate-600 cursor-not-allowed"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">Unit</label>
                      <input
                        type="text"
                        value={editUnit}
                        onChange={(e) => setEditUnit(e.target.value)}
                        className={glassField}
                      />
                      {formatChem(editUnit, "unit") !== editUnit && (
                        <p className="text-[11px] text-slate-500">Shows as: <span className="font-bold text-blue-700">{formatChem(editUnit, "unit")}</span></p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700">Min limit</label>
                        <input
                          type="number"
                          step="any"
                          placeholder="e.g. 6.5"
                          value={editMin}
                          onChange={(e) => setEditMin(e.target.value)}
                          className={glassField}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700">Max limit</label>
                        <input
                          type="number"
                          step="any"
                          placeholder="e.g. 8.0"
                          value={editMax}
                          onChange={(e) => setEditMax(e.target.value)}
                          className={glassField}
                        />
                      </div>
                    </div>

                    <OpsRow
                      min={editMin}
                      max={editMax}
                      minOp={editMinOp}
                      maxOp={editMaxOp}
                      onMinOp={setEditMinOp}
                      onMaxOp={setEditMaxOp}
                      hasText={!!editRangeText.trim()}
                    />

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">Special rule / text (optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. Absent or Nil"
                        value={editRangeText}
                        onChange={(e) => setEditRangeText(e.target.value)}
                        className={glassField}
                      />
                      <p className="text-[11px] text-slate-500">{"Only for words like Absent / Nil. If filled, it replaces the min / max and the ≥ > ≤ < choices."}</p>
                    </div>

                    <div className="text-xs text-slate-600 bg-blue-50/70 border border-blue-100 rounded-2xl px-3.5 py-2.5">
                      Will be shown as:{" "}
                      <span className="font-bold text-blue-700">{formatLimit(editMin, editMax, editMinOp, editMaxOp, editRangeText, editParamName)}</span>
                    </div>
                  </div>
                ) : (
                  // BATCH MULTI-ROW ADD VIEW
                  <>
                    {/* Step 1 */}
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] flex items-center justify-center">1</span>
                        Choose the tank / unit
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80">
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-slate-600">Category</label>
                          <SearchableDropdown
                            options={categories.map((c) => ({ id: c.id, label: c.name, subLabel: c.description }))}
                            value={selectedCatId}
                            onChange={(id) => { setSelectedCatId(id); setSelectedTypeId(""); }}
                            placeholder="-- Choose Category --"
                            icon={Folder}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-slate-600">Tank / Unit</label>
                          <SearchableDropdown
                            options={formFilteredTypes.map((t) => ({ id: t.id, label: t.name, subLabel: t.description }))}
                            value={selectedTypeId}
                            onChange={setSelectedTypeId}
                            placeholder={selectedCatId ? "-- Choose Tank / Unit --" : "Pick a category first"}
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

                    {/* Step 2 */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] flex items-center justify-center">2</span>
                          Add the parameters
                        </p>
                      </div>

                      {/* Quick add chips */}
                      {catalogSuggestions.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-[11px] font-semibold text-slate-500">
                            Quick add from catalog{selectedTypeId ? " (already configured ones are hidden)" : ""}:
                          </p>
                          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                            {catalogSuggestions.map((p) => (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => handleQuickAdd(p)}
                                className="text-xs font-semibold text-blue-700 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-200 px-2.5 py-1 rounded-full flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                <Plus size={11} /> {formatChem(p.name)}
                                {p.unit && <span className="font-normal text-blue-500">({formatChem(p.unit, "unit")})</span>}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                        {rows.map((row, index) => {
                          const issue = getRowIssue(row, index);
                          const color = ROW_COLORS[index % ROW_COLORS.length];
                          const isActive = activeRow === index;
                          const named = row.parameterName.trim();

                          return (
                            <div
                              key={index}
                              ref={(el) => { rowRefs.current[index] = el; }}
                              className={`rounded-2xl border-2 bg-white/80 shadow-sm transition-colors ${
                                issue?.level === "error" ? "border-red-300" : isActive ? color.border : "border-slate-200/80"
                              }`}
                            >
                              {/* Row header: always visible, shows WHICH parameter this is. Click to open. */}
                              <div onClick={() => setActiveRow(index)} className="flex items-center gap-3 p-3 cursor-pointer select-none">
                                <span className={`w-7 h-7 rounded-full ${color.badge} text-white text-xs font-bold flex items-center justify-center flex-shrink-0`}>
                                  {index + 1}
                                </span>

                                <div className="min-w-0 flex-1">
                                  <p className={`text-sm font-bold truncate ${named ? "text-slate-900" : "text-slate-400 italic font-medium"}`}>
                                    {named ? formatChem(named) : "New parameter (name it below)"}
                                  </p>
                                  {!isActive && named && (
                                    <p className={`text-xs truncate ${issue ? (issue.level === "error" ? "text-red-600" : "text-amber-600") : "text-slate-500"}`}>
                                      {issue ? issue.text : formatLimit(row.standardMin, row.standardMax, row.minOp, row.maxOp, row.rangeText, row.parameterName)}
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

                                {(rows.length > 1 || named) && (
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); handleRemoveRow(index); }}
                                    className="text-red-500 hover:text-red-700 p-1 rounded-lg hover:bg-red-50 cursor-pointer flex-shrink-0"
                                    title="Remove this parameter"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                )}
                                <ChevronDown size={16} className={`text-slate-400 flex-shrink-0 transition-transform duration-200 ${isActive ? "rotate-180" : ""}`} />
                              </div>

                              {/* Fields: only the open row shows them */}
                              {isActive && (
                                <div className="px-4 pb-4 pt-3 space-y-3 border-t border-slate-100">
                                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                                    <div className="sm:col-span-6 space-y-1">
                                      <label className="text-[11px] font-semibold text-slate-600">Parameter name</label>
                                      <NameCombobox
                                        value={row.parameterName}
                                        onChange={(v) => handleNameChange(index, v)}
                                        options={globalParameters}
                                        taken={
                                          new Set([
                                            ...Array.from(configuredNames),
                                            ...rows.filter((_, i) => i !== index).map((r) => norm(r.parameterName)),
                                          ])
                                        }
                                        inputRef={(el) => { nameRefs.current[index] = el; }}
                                        placeholder="Pick from the list or type a new name"
                                      />
                                      {formatChem(row.parameterName) !== row.parameterName && (
                                        <p className="text-[11px] text-slate-500">
                                          Shows as: <span className="font-bold text-blue-700">{formatChem(row.parameterName)}</span>
                                        </p>
                                      )}
                                    </div>

                                    <div className="sm:col-span-2 space-y-1">
                                      <label className="text-[11px] font-semibold text-slate-600">Unit</label>
                                      <input
                                        type="text"
                                        placeholder="mg/L"
                                        value={row.unit}
                                        onChange={(e) => handleRowChange(index, "unit", e.target.value)}
                                        className={glassField}
                                      />
                                      {formatChem(row.unit, "unit") !== row.unit && (
                                        <p className="text-[11px] text-slate-500">Shows as: <span className="font-bold text-blue-700">{formatChem(row.unit, "unit")}</span></p>
                                      )}
                                    </div>

                                    <div className="sm:col-span-2 space-y-1">
                                      <label className="text-[11px] font-semibold text-slate-600">Min</label>
                                      <input
                                        type="number"
                                        step="any"
                                        placeholder="Min"
                                        value={row.standardMin}
                                        onChange={(e) => handleRowChange(index, "standardMin", e.target.value)}
                                        className={glassField}
                                      />
                                    </div>

                                    <div className="sm:col-span-2 space-y-1">
                                      <label className="text-[11px] font-semibold text-slate-600">Max</label>
                                      <input
                                        type="number"
                                        step="any"
                                        placeholder="Max"
                                        value={row.standardMax}
                                        onChange={(e) => handleRowChange(index, "standardMax", e.target.value)}
                                        className={glassField}
                                      />
                                    </div>

                                    <div className="sm:col-span-12">
                                      <OpsRow
                                        min={row.standardMin}
                                        max={row.standardMax}
                                        minOp={row.minOp}
                                        maxOp={row.maxOp}
                                        onMinOp={(v) => handleRowChange(index, "minOp", v)}
                                        onMaxOp={(v) => handleRowChange(index, "maxOp", v)}
                                        hasText={!!row.rangeText.trim()}
                                      />
                                    </div>

                                    <div className="sm:col-span-12 space-y-1">
                                      <label className="text-[11px] font-semibold text-slate-600">Special rule / text (optional)</label>
                                      <input
                                        type="text"
                                        placeholder="e.g. Absent or Nil (replaces min / max)"
                                        value={row.rangeText}
                                        onChange={(e) => handleRowChange(index, "rangeText", e.target.value)}
                                        className={glassField}
                                      />
                                    </div>
                                  </div>

                                  {named && (
                                    <div className="text-xs">
                                      {issue ? (
                                        <span className={`flex items-start gap-1.5 font-medium ${issue.level === "error" ? "text-red-600" : "text-amber-600"}`}>
                                          <AlertCircle size={14} className="flex-shrink-0 mt-px" /> {issue.text}
                                        </span>
                                      ) : (
                                        <span className="text-slate-600">
                                          Will be shown as:{" "}
                                          <span className="font-bold text-blue-700">
                                            {formatLimit(row.standardMin, row.standardMax, row.minOp, row.maxOp, row.rangeText, row.parameterName)}
                                          </span>
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <Button
                        type="button"
                        onClick={handleAddRow}
                        className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-dashed border-indigo-300 rounded-2xl h-10 text-xs font-semibold shadow-none cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Plus size={14} /> Add another parameter
                      </Button>
                    </div>
                  </>
                )}
              </form>
            </div>

            <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50/80 flex-shrink-0">
              <p className="text-xs text-slate-500 hidden sm:block">
                {editingId
                  ? "Changes apply immediately after saving."
                  : readyCount > 0
                    ? `${readyCount} parameter${readyCount > 1 ? "s" : ""} ready to save${selectedType ? ` to ${selectedType.name}` : ""}`
                    : "Nothing to save yet."}
              </p>
              <div className="flex items-center gap-3 ml-auto">
                <Button type="button" onClick={() => setIsModalOpen(false)} className="bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-full h-10 px-5 font-semibold cursor-pointer shadow-sm">
                  Cancel
                </Button>
                <Button type="submit" form="range-form" disabled={submitting} className="bg-blue-600 hover:bg-blue-700 text-white rounded-full h-10 px-6 font-semibold cursor-pointer shadow-md">
                  {submitting ? (
                    <Loader2 className="animate-spin h-5 w-5" />
                  ) : editingId ? (
                    "Update Limit"
                  ) : readyCount > 0 ? (
                    `Save ${readyCount} Parameter${readyCount > 1 ? "s" : ""}`
                  ) : (
                    "Save Parameters"
                  )}
                </Button>
              </div>
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