"use client";

/**
 * Private Samples – Test Pricing
 *
 * Flow:
 *  1. Category (compulsory)  e.g. Potable Water
 *  2. Sub-category (optional) e.g. Physical/Chemical Requirement
 *  3. Type parameter name + unit + price, add to the list, save all in one go
 *     (parameters that don't exist yet are created automatically)
 *
 * All data is loaded from / saved to the database through
 *   /api/manager/private-prices, /api/manager/private-categories and /api/manager/parameters.
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Plus, Loader2, Droplets, Trash2, Search, CheckCircle2, AlertCircle, X, Edit3,
  ChevronDown, ChevronLeft, ChevronRight, Check, Tag, Layers, FolderPlus, Save, FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatUnit } from "@/lib/chemFormat";
import { uniqueByParameter, billableTotal } from "@/lib/privateBilling";
import BillWizard from "./BillWizard";

/* ───────────────────────── styles ───────────────────────── */

const glass =
  "bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_32px_rgba(15,23,42,0.10)] ring-1 ring-inset ring-white/40";

// text-base on mobile stops iOS from zooming in when an input is focused
const glassField =
  "w-full px-3.5 py-3 sm:py-2.5 rounded-2xl border border-white/70 bg-white/60 hover:bg-white/80 backdrop-blur-xl text-base sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 shadow-sm " +
  "transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:bg-white/90";

const btnPrimary =
  "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-full cursor-pointer shadow-lg shadow-blue-500/30 ring-1 ring-inset ring-white/30 transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0";

const btnGlass =
  "bg-white/60 hover:bg-white/90 text-slate-700 border border-white/70 backdrop-blur-xl rounded-full font-semibold shadow-sm cursor-pointer transition-all hover:-translate-y-0.5";

// small round icon buttons: bigger tap area on phones
const iconBtn = "p-2.5 sm:p-1.5 rounded-xl cursor-pointer transition-colors";

// Modal: a bottom sheet on phones, a centred dialog from sm: upwards
const modalOverlay =
  "fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/30 backdrop-blur-sm animate-in fade-in duration-200";

const modalPanel =
  "w-full max-h-[92dvh] sm:max-h-[90vh] flex flex-col overflow-hidden overscroll-contain " +
  "rounded-t-3xl sm:rounded-3xl bg-white/75 backdrop-blur-2xl border border-white/70 ring-1 ring-inset ring-white/50 " +
  "shadow-[0_24px_60px_rgba(15,23,42,0.25)] animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200";

/* ───────────────────────── types ───────────────────────── */

type Parameter = { id: string; name: string; unit: string | null };
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

/* ───────────────────────── helpers ───────────────────────── */

const key = (s: string) => s.trim().toLowerCase();
const PAGE_SIZE = 5; // parameters shown per page inside each sub-category card
const NONE = "__none__"; // "No sub-category" target in the add modal
const money = (n: number) =>
  `Rs. ${Number(n).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// don't pop the keyboard open automatically on touch screens
const canAutoFocus = () => typeof window !== "undefined" && !window.matchMedia("(pointer: coarse)").matches;

/* ───────────────────────── api helpers ───────────────────────── */

type ApiResult<T> = { ok: boolean; data?: T; error?: string };

async function api<T = any>(url: string, init?: RequestInit): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      cache: "no-store",
      ...init,
      headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.success === false) return { ok: false, error: json.error || "Something went wrong" };
    return { ok: true, data: json.data };
  } catch {
    return { ok: false, error: "Network error – please try again" };
  }
}

// server row -> UI row
const toRow = (r: any): PriceRow => ({
  id: r.id,
  categoryId: r.categoryId,
  subCategoryId: r.subCategoryId ?? null,
  parameterId: r.parameter.id,
  parameterName: r.parameter.name,
  unit: r.parameter.unit ?? null,
  price: r.price,
});

/* ───────────────────────── glass dropdown ───────────────────────── */

function GlassSelect({
  value, options, onChange, disabled = false, placeholder = "Select...",
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
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={`${glassField} flex items-center justify-between gap-2 text-left ${
          disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(59,130,246,0.25)]"
        }`}
      >
        <span className={`truncate ${selected ? "text-slate-800 font-semibold" : "text-slate-400"}`}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown size={16} className={`flex-shrink-0 text-blue-600 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && !disabled && (
        <ul
          role="listbox"
          className="absolute z-50 mt-2 w-full origin-top rounded-2xl p-1.5 space-y-0.5 bg-white/90 backdrop-blur-2xl border border-white/70 ring-1 ring-inset ring-white/50 shadow-[0_16px_40px_rgba(15,23,42,0.18)] max-h-56 overflow-y-auto overscroll-contain animate-in fade-in zoom-in-95 slide-in-from-top-1 duration-150"
        >
          {options.length === 0 && <li className="px-3 py-3 text-xs text-slate-500 text-center">Nothing to select</li>}
          {options.map((opt) => (
            <li
              key={opt.value}
              role="option"
              aria-selected={opt.value === value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`flex items-center justify-between gap-3 px-3 py-3 sm:py-2 rounded-xl text-sm sm:text-xs cursor-pointer transition-all duration-200 hover:bg-blue-500/15 hover:text-blue-700 sm:hover:translate-x-1 ${
                opt.value === value ? "bg-blue-500/10 text-blue-700 font-semibold" : "text-slate-700"
              }`}
            >
              <span>{opt.label}</span>
              {opt.value === value && <Check size={14} className="flex-shrink-0 text-blue-600" />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ───────────────────────── modal shell ───────────────────────── */

function Modal({
  title, icon, onClose, children, footer, note, wide = false, dismissOnOverlay = true,
}: {
  title: string;
  icon: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  footer: React.ReactNode;
  note?: React.ReactNode;
  wide?: boolean;
  dismissOnOverlay?: boolean;
}) {
  return (
    <div className={modalOverlay} onClick={dismissOnOverlay ? onClose : undefined}>
      <div
        className={`${modalPanel} ${wide ? "sm:max-w-3xl" : "sm:max-w-md"}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* drag-handle look on phones */}
        <div className="sm:hidden mx-auto mt-2 h-1.5 w-10 rounded-full bg-slate-300/80 flex-shrink-0" />

        <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-white/60 flex-shrink-0">
          <h3 className="font-semibold tracking-tight text-base sm:text-lg text-slate-900 flex items-center gap-2 min-w-0">
            <span className="shrink-0">{icon}</span>
            <span className="truncate">{title}</span>
          </h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-2 rounded-full text-slate-500 hover:text-slate-800 hover:bg-white/70 cursor-pointer transition-all hover:rotate-90 shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 sm:p-6 overflow-y-auto overscroll-contain flex-1 space-y-4 min-h-0">{children}</div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 sm:px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-white/60 flex-shrink-0">
          {note && <div className="text-xs text-slate-500 text-center sm:text-left sm:mr-auto">{note}</div>}
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 sm:ml-auto">{footer}</div>
        </div>
      </div>
    </div>
  );
}

const CancelBtn = ({ onClick }: { onClick: () => void }) => (
  <Button
    type="button"
    variant="outline"
    onClick={onClick}
    className={`${btnGlass} w-full sm:w-auto h-11 sm:h-10 px-5 justify-center`}
  >
    Cancel
  </Button>
);

/* ───────────────────────── page ───────────────────────── */

type NameModal =
  | { kind: "category"; id: string | null }
  | { kind: "sub"; id: string | null; categoryId: string }
  | null;

export default function PrivateSamplesPage() {
  const [parameters, setParameters] = useState<Parameter[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subs, setSubs] = useState<SubCategory[]>([]);
  const [prices, setPrices] = useState<PriceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCat, setActiveCat] = useState<string>("");
  const [search, setSearch] = useState("");
  const [billOpen, setBillOpen] = useState(false);
  const [groupPage, setGroupPage] = useState<Record<string, number>>({}); // current page per sub-category card
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // inline price edit
  const [editPriceId, setEditPriceId] = useState<string | null>(null);
  const [editPriceVal, setEditPriceVal] = useState("");

  // category / sub-category name modal
  const [nameModal, setNameModal] = useState<NameModal>(null);
  const [nameVal, setNameVal] = useState("");

  // bulk add modal
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bCat, setBCat] = useState("");
  const [bSubs, setBSubs] = useState<string[]>([]); // ticked sub-categories (NONE = no sub-category)
  const [bErr, setBErr] = useState("");
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [bItems, setBItems] = useState<{ name: string; unit: string; price: string }[]>([]);
  const [dName, setDName] = useState("");
  const [dUnit, setDUnit] = useState("");
  const [dPrice, setDPrice] = useState("");
  const [bSaving, setBSaving] = useState(false);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3500);
      return () => clearTimeout(t);
    }
  }, [toast]);

  // Escape closes the small name modal, and the add-prices modal as long as nothing has been typed yet
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setNameModal(null);
      if (bulkOpen && bItems.length === 0 && !dName) setBulkOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [bulkOpen, bItems.length, dName]);

  // Load categories, prices and the parameter list from the database
  useEffect(() => {
    (async () => {
      const [pr, pa] = await Promise.all([
        api<{ categories: (Category & { subCategories: SubCategory[] })[]; prices: any[] }>("/api/manager/private-prices"),
        api<Parameter[]>("/api/manager/parameters"),
      ]);
      if (pr.ok && pr.data) {
        setCategories(pr.data.categories.map((c) => ({ id: c.id, name: c.name })));
        setSubs(pr.data.categories.flatMap((c) => c.subCategories.map((s) => ({ id: s.id, categoryId: c.id, name: s.name }))));
        setPrices(pr.data.prices.map(toRow));
        setActiveCat((cur) => cur || pr.data!.categories[0]?.id || "");
      } else {
        setToast({ message: pr.error || "Failed to load prices", type: "error" });
      }
      if (pa.ok && Array.isArray(pa.data)) setParameters(pa.data);
      setLoading(false);
    })();
  }, []);

  /* ── derived ── */

  const category = categories.find((c) => c.id === activeCat) ?? null;
  const catSubs = subs.filter((s) => s.categoryId === activeCat);
  const catRows = prices.filter((p) => p.categoryId === activeCat);
  // a parameter that sits in several sub-categories is billed only once
  const catTotal = billableTotal(catRows);
  const catUniqueCount = uniqueByParameter(catRows).length;

  const matches = (r: PriceRow) => key(r.parameterName).includes(key(search));

  const groups = useMemo(() => {
    const rows = prices.filter((p) => p.categoryId === activeCat);
    const list: { id: string | null; name: string; rows: PriceRow[] }[] = subs
      .filter((s) => s.categoryId === activeCat)
      .map((s) => ({
        id: s.id,
        name: s.name,
        rows: rows.filter((r) => r.subCategoryId === s.id),
      }));
    const loose = rows.filter((r) => !r.subCategoryId);
    if (loose.length > 0) list.push({ id: null, name: "No sub-category", rows: loose });
    return list;
  }, [subs, prices, activeCat]);

  /* ── category / sub-category CRUD ── */

  const openCategoryModal = (id: string | null) => {
    setNameVal(id ? categories.find((c) => c.id === id)?.name ?? "" : "");
    setNameModal({ kind: "category", id });
  };

  const openSubModal = (categoryId: string, id: string | null) => {
    setNameVal(id ? subs.find((s) => s.id === id)?.name ?? "" : "");
    setNameModal({ kind: "sub", id, categoryId });
  };

  const [nameSaving, setNameSaving] = useState(false);

  const saveName = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = nameVal.trim();
    if (!name || !nameModal) return setToast({ message: "Name is required", type: "error" });

    if (nameModal.kind === "category") {
      if (categories.some((c) => key(c.name) === key(name) && c.id !== nameModal.id))
        return setToast({ message: "A category with this name already exists", type: "error" });
    } else if (subs.some((s) => s.categoryId === nameModal.categoryId && key(s.name) === key(name) && s.id !== nameModal.id)) {
      return setToast({ message: "This sub-category already exists in the category", type: "error" });
    }

    setNameSaving(true);
    const res = await api<any>("/api/manager/private-categories", {
      method: nameModal.id ? "PUT" : "POST",
      body: JSON.stringify({
        kind: nameModal.kind,
        id: nameModal.id ?? undefined,
        categoryId: nameModal.kind === "sub" ? nameModal.categoryId : undefined,
        name,
      }),
    });
    setNameSaving(false);
    if (!res.ok || !res.data) return setToast({ message: res.error || "Failed to save", type: "error" });

    if (nameModal.kind === "category") {
      if (nameModal.id) {
        setCategories((cs) => cs.map((c) => (c.id === nameModal.id ? { ...c, name: res.data.name } : c)));
        setToast({ message: "Category updated", type: "success" });
      } else {
        setCategories((cs) => [...cs, { id: res.data.id, name: res.data.name }]);
        setActiveCat(res.data.id);
        setToast({ message: "Category added", type: "success" });
      }
    } else if (nameModal.id) {
      setSubs((ss) => ss.map((s) => (s.id === nameModal.id ? { ...s, name: res.data.name } : s)));
      setToast({ message: "Sub-category updated", type: "success" });
    } else {
      setSubs((ss) => [...ss, { id: res.data.id, categoryId: res.data.categoryId, name: res.data.name }]);
      setToast({ message: "Sub-category added", type: "success" });
    }
    setNameModal(null);
  };

  const deleteCategory = async (c: Category) => {
    const n = prices.filter((p) => p.categoryId === c.id).length;
    if (!confirm(`Delete category "${c.name}"${n ? ` and its ${n} priced parameter(s)` : ""}?`)) return;
    const res = await api(`/api/manager/private-categories?kind=category&id=${encodeURIComponent(c.id)}`, { method: "DELETE" });
    if (!res.ok) return setToast({ message: res.error || "Failed to delete category", type: "error" });
    setPrices((ps) => ps.filter((p) => p.categoryId !== c.id));
    setSubs((ss) => ss.filter((s) => s.categoryId !== c.id));
    const rest = categories.filter((x) => x.id !== c.id);
    setCategories(rest);
    setActiveCat(rest[0]?.id ?? "");
    setToast({ message: "Category deleted", type: "success" });
  };

  const deleteSub = async (s: SubCategory) => {
    if (!confirm(`Delete sub-category "${s.name}"? Its parameters stay in the category (without a sub-category).`)) return;
    const res = await api(`/api/manager/private-categories?kind=sub&id=${encodeURIComponent(s.id)}`, { method: "DELETE" });
    if (!res.ok) return setToast({ message: res.error || "Failed to delete sub-category", type: "error" });
    setPrices((ps) => ps.map((p) => (p.subCategoryId === s.id ? { ...p, subCategoryId: null } : p)));
    setSubs((ss) => ss.filter((x) => x.id !== s.id));
    setToast({ message: "Sub-category deleted", type: "success" });
  };

  /* ── price row edit / delete ── */

  const startEditPrice = (r: PriceRow) => { setEditPriceId(r.id); setEditPriceVal(String(r.price)); };

  const commitEditPrice = async () => {
    const n = Number(editPriceVal);
    if (editPriceVal === "" || !Number.isFinite(n) || n < 0) return setToast({ message: "Enter a valid price", type: "error" });
    const res = await api<any>("/api/manager/private-prices", {
      method: "PUT",
      body: JSON.stringify({ id: editPriceId, price: n }),
    });
    if (!res.ok || !res.data) return setToast({ message: res.error || "Failed to update price", type: "error" });
    setPrices((ps) => ps.map((p) => (p.id === editPriceId ? { ...p, price: res.data.price } : p)));
    setEditPriceId(null);
    setToast({ message: "Price updated", type: "success" });
  };

  const deleteRow = async (r: PriceRow) => {
    if (!confirm(`Remove "${r.parameterName}" from this category?`)) return;
    const res = await api(`/api/manager/private-prices?id=${encodeURIComponent(r.id)}`, { method: "DELETE" });
    if (!res.ok) return setToast({ message: res.error || "Failed to remove parameter", type: "error" });
    setPrices((ps) => ps.filter((p) => p.id !== r.id));
    setToast({ message: "Parameter removed", type: "success" });
  };

  /* ── bulk add ── */

  // subId: undefined = nothing pre-selected, null = "No sub-category", string = that sub-category
  const openBulk = (catId?: string, subId?: string | null) => {
    setBCat(catId ?? activeCat ?? "");
    setBSubs(subId === undefined ? [] : [subId === null ? NONE : subId]);
    setBItems([]);
    setDName("");
    setDUnit("");
    setDPrice("");
    setBErr("");
    setPasteText("");
    setPasteOpen(false);
    setBulkOpen(true);
  };

  const bCatSubs = subs.filter((s) => s.categoryId === bCat);
  // where the parameters get saved: every ticked sub-category (or the category itself when it has none)
  const bTargets: string[] =
    bCatSubs.length === 0 ? [NONE] : bSubs.filter((k) => k === NONE || bCatSubs.some((s) => s.id === k));
  const targetName = (k: string) => (k === NONE ? "No sub-category" : subs.find((s) => s.id === k)?.name ?? "");
  const existsIn = (name: string, target: string) =>
    prices.some((p) => p.categoryId === bCat && (p.subCategoryId ?? NONE) === target && key(p.parameterName) === key(name));
  const toggleTarget = (k: string) => setBSubs((cur) => (cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k]));
  const allTargetKeys = [...bCatSubs.map((s) => s.id), NONE];

  const priceInvalid = (v: string) => v === "" || !Number.isFinite(Number(v)) || Number(v) < 0;
  const canSaveBulk = !!bCat && bTargets.length > 0 && bItems.length > 0 && bItems.every((s) => !priceInvalid(s.price));

  // typing a known parameter name auto-fills its unit (and the price already used in this category)
  const onNameChange = (v: string) => {
    setDName(v);
    setBErr("");
    const k = key(v);
    const priced = prices.find((p) => p.categoryId === bCat && key(p.parameterName) === k);
    const known = parameters.find((p) => key(p.name) === k);
    const unit = priced?.unit ?? known?.unit ?? "";
    if (!dUnit && unit) setDUnit(unit);
    if (!dPrice && priced) setDPrice(String(priced.price));
  };

  // add the typed parameter (name + unit + price) to the list
  const addTyped = () => {
    const name = dName.trim();
    if (bTargets.length === 0) return setBErr("Tick at least one sub-category first");
    if (!name) return setBErr("Type a parameter name");
    if (priceInvalid(dPrice)) return setBErr("Enter a valid price");
    if (bItems.some((i) => key(i.name) === key(name))) return setBErr(`"${name}" is already in the list`);
    if (bTargets.every((t) => existsIn(name, t)))
      return setBErr(
        bTargets.length > 1
          ? `"${name}" already has a price in all the selected sub-categories – edit it instead`
          : `"${name}" already has a price in ${targetName(bTargets[0])} – edit it instead`
      );

    setBErr("");
    setBItems((items) => [...items, { name, unit: dUnit.trim(), price: dPrice }]);
    setDName("");
    setDUnit("");
    setDPrice("");
    document.getElementById("typed-param-name")?.focus();
  };

  // paste many lines:  name, unit, price   (tab / comma / semicolon separated; unit is optional)
  const addPasted = () => {
    const lines = pasteText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return setBErr("Paste at least one line");
    if (bTargets.length === 0) return setBErr("Tick at least one sub-category first");

    const seen = new Set(bItems.map((i) => key(i.name)));
    const added: { name: string; unit: string; price: string }[] = [];
    const bad: string[] = [];

    for (const line of lines) {
      const parts = line.split(/\t|,|;/).map((x) => x.trim());
      if (parts.length < 2) { bad.push(`"${line}" (need name and price)`); continue; }
      const name = parts[0];
      const price = parts[parts.length - 1].replace(/^rs\.?\s*/i, "");
      const unit = parts.length >= 3 ? parts[1] : parameters.find((p) => key(p.name) === key(name))?.unit ?? "";
      if (!name || priceInvalid(price)) { bad.push(`"${line}" (invalid price)`); continue; }
      if (seen.has(key(name))) { bad.push(`"${name}" (duplicate in list)`); continue; }
      if (bTargets.every((t) => existsIn(name, t))) { bad.push(`"${name}" (already priced)`); continue; }
      seen.add(key(name));
      added.push({ name, unit, price });
    }

    if (added.length) setBItems((items) => [...items, ...added]);
    if (bad.length) {
      setBErr(`Added ${added.length}, skipped ${bad.length}: ${bad.slice(0, 3).join(", ")}${bad.length > 3 ? "…" : ""}`);
    } else {
      setBErr("");
      setPasteText("");
      setPasteOpen(false);
    }
  };

  const saveBulk = async () => {
    if (!bCat) return setBErr("Please select a category");
    if (bTargets.length === 0) return setBErr("Tick at least one sub-category");
    if (bItems.length === 0) return setBErr("Add at least one parameter");
    if (bItems.some((s) => priceInvalid(s.price))) return setBErr("Enter a valid price for every parameter");

    setBSaving(true);
    setBErr("");
    const created: PriceRow[] = [];
    const failed: string[] = [];
    let skipped = 0;

    // one request per ticked sub-category – the same parameters + prices go to each of them
    for (const t of bTargets) {
      const items = bItems.filter((i) => !existsIn(i.name, t));
      skipped += bItems.length - items.length;
      if (items.length === 0) continue;
      const res = await api<any[]>("/api/manager/private-prices", {
        method: "POST",
        body: JSON.stringify({
          categoryId: bCat,
          subCategoryId: t === NONE ? null : t,
          items: items.map((s) => ({ name: s.name, unit: s.unit || null, price: Number(s.price) })),
        }),
      });
      if (res.ok && res.data) created.push(...res.data.map(toRow));
      else failed.push(`${targetName(t)}: ${res.error || "failed"}`);
    }
    setBSaving(false);

    if (created.length) {
      setPrices((ps) => [...ps, ...created]);
      // remember any newly created parameters for the suggestions list
      setParameters((ps) => {
        const have = new Set(ps.map((p) => p.id));
        const fresh = new Map<string, Parameter>();
        for (const r of created) if (!have.has(r.parameterId)) fresh.set(r.parameterId, { id: r.parameterId, name: r.parameterName, unit: r.unit });
        return [...ps, ...fresh.values()];
      });
      setActiveCat(bCat);
    }

    if (failed.length) {
      setBErr(`Some sub-categories failed – ${failed.join(" | ")}`);
      return;
    }

    setBulkOpen(false);
    setToast({
      message: `${created.length} price${created.length === 1 ? "" : "s"} added${skipped ? ` (${skipped} already existed, skipped)` : ""}`,
      type: "success",
    });
  };

  /* ───────────────────────── render ───────────────────────── */

  return (
    <div className="w-full min-w-0 space-y-4 sm:space-y-6 relative pb-24 sm:pb-0">
      {/* Header */}
      <div className={`${glass} flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 p-4 sm:p-6 rounded-3xl`}>
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl font-semibold tracking-tight text-slate-900 flex items-start sm:items-center gap-3 leading-tight">
            <span className="p-2 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow-lg shadow-blue-500/30 ring-1 ring-inset ring-white/40 shrink-0">
              <Droplets size={22} />
            </span>
            <span className="mt-1 sm:mt-0">Private Samples – Test Pricing</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-2">
            Set test prices for private (outside customer) samples by category. Prices are without VAT.
          </p>
        </div>

        <div className="grid grid-cols-3 sm:flex items-center gap-2 flex-shrink-0">
          <Button
            variant="outline"
            onClick={() => openCategoryModal(null)}
            className={`${btnGlass} h-11 px-3 sm:px-4 text-xs sm:text-sm justify-center flex items-center gap-1.5 sm:gap-2`}
          >
            <FolderPlus size={18} /> Category
          </Button>
          <Button
            onClick={() => setBillOpen(true)}
            disabled={prices.length === 0}
            className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-full h-11 px-3 sm:px-5 text-xs sm:text-sm font-semibold shadow-lg shadow-emerald-500/30 ring-1 ring-inset ring-white/30 cursor-pointer flex items-center justify-center gap-1.5 sm:gap-2 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          >
            <FileText size={18} /> Bill
          </Button>
          <Button
            onClick={() => openBulk()}
            disabled={categories.length === 0}
            className={`${btnPrimary} h-11 px-3 sm:px-5 text-xs sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2`}
          >
            <Plus size={18} />
            <span className="sm:hidden">Add</span>
            <span className="hidden sm:inline">Add Prices</span>
          </Button>
        </div>
      </div>

      {/* Category tabs: scroll sideways on phones, wrap on larger screens */}
      <div
        className={`${glass} p-2 sm:p-3 rounded-3xl flex items-center gap-2 overflow-x-auto sm:flex-wrap sm:overflow-visible [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`}
      >
        {!loading && categories.length === 0 && (
          <p className="text-sm text-slate-500 px-3 py-2">No categories yet. Click &quot;Category&quot; to add one (e.g. Potable Water).</p>
        )}
        {categories.map((c) => {
          const count = prices.filter((p) => p.categoryId === c.id).length;
          const active = c.id === activeCat;
          return (
            <button
              key={c.id}
              onClick={() => { setActiveCat(c.id); setSearch(""); setGroupPage({}); }}
              className={`shrink-0 whitespace-nowrap flex items-center gap-2 px-4 py-2.5 sm:py-2 rounded-full text-sm font-semibold transition-all duration-200 cursor-pointer hover:-translate-y-0.5 ${
                active
                  ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30 ring-1 ring-inset ring-white/30"
                  : "bg-white/60 text-slate-700 border border-white/70 hover:bg-white/90"
              }`}
            >
              {c.name}
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${active ? "bg-white/25" : "bg-slate-500/10 text-slate-600"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {loading && (
        <div className={`${glass} p-10 rounded-3xl flex items-center justify-center gap-3 text-sm text-slate-600`}>
          <Loader2 className="animate-spin h-5 w-5" /> Loading prices...
        </div>
      )}

      {/* Active category */}
      {!loading && category && (
        <>
          <div className={`${glass} p-4 sm:p-5 rounded-3xl flex flex-col lg:flex-row lg:items-center justify-between gap-4`}>
            <div className="flex items-start sm:items-center gap-3 min-w-0">
              <span className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-600 shrink-0"><Layers size={20} /></span>
              <div className="min-w-0 flex-1">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 break-words">{category.name}</h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  {catUniqueCount} parameter{catUniqueCount === 1 ? "" : "s"} · {catSubs.length} sub-categor{catSubs.length === 1 ? "y" : "ies"} · All parameters total{" "}
                  <span className="font-bold text-slate-800 whitespace-nowrap">{money(catTotal)}</span>
                </p>
              </div>
              <div className="flex items-center gap-0.5 shrink-0 -my-1 -mr-1 sm:m-0">
                <button onClick={() => openCategoryModal(category.id)} aria-label="Rename category" className={`${iconBtn} text-blue-600 hover:bg-blue-500/10`} title="Rename category"><Edit3 size={16} /></button>
                <button onClick={() => deleteCategory(category)} aria-label="Delete category" className={`${iconBtn} text-red-500 hover:bg-red-500/10`} title="Delete category"><Trash2 size={16} /></button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <div className="relative">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search parameters..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setGroupPage({}); }}
                  className="w-full sm:w-56 pl-9 pr-3 py-2 min-h-[44px] sm:min-h-0 rounded-full border border-white/70 bg-white/60 hover:bg-white/80 backdrop-blur-xl text-base sm:text-xs text-slate-800 placeholder:text-slate-400 shadow-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:bg-white/90"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => openSubModal(category.id, null)}
                className={`${btnGlass} w-full sm:w-auto h-11 sm:h-9 px-4 text-xs justify-center flex items-center gap-1.5`}
              >
                <Plus size={14} /> Sub-category
              </Button>
            </div>
          </div>

          {groups.length === 0 ? (
            <div className={`${glass} p-8 sm:p-10 rounded-3xl text-center space-y-3`}>
              <p className="text-sm text-slate-600">No parameters priced in <b>{category.name}</b> yet.</p>
              <Button onClick={() => openBulk(category.id)} className={`${btnPrimary} h-11 sm:h-10 px-5 inline-flex items-center gap-2`}>
                <Plus size={16} /> Add Prices
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-5">
              {groups.map((g, gi) => {
                const visible = g.rows.filter(matches);
                const total = g.rows.reduce((a, r) => a + r.price, 0);
                if (search && visible.length === 0) return null;
                const sub = g.id ? subs.find((s) => s.id === g.id) : null;

                // pagination: keep the real row number (ri) so numbering stays 1.1, 1.2 ... on every page
                const gk = g.id ?? "none";
                const filtered = g.rows.map((r, ri) => ({ r, ri })).filter(({ r }) => matches(r));
                const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
                const page = Math.min(groupPage[gk] ?? 0, pages - 1);
                const pageRows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
                const goPage = (n: number) => setGroupPage((cur) => ({ ...cur, [gk]: Math.max(0, Math.min(pages - 1, n)) }));
                return (
                  <div key={g.id ?? "none"} className={`${glass} rounded-3xl overflow-hidden flex flex-col min-w-0`}>
                    <div className="pl-4 sm:pl-5 pr-2 sm:pr-5 py-3 border-b border-white/60 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-bold text-sm text-slate-900 break-words sm:truncate">
                          {g.id ? `${gi + 1}.0 ` : ""}{g.name}
                        </h3>
                        <p className="text-[11px] text-slate-500">{g.rows.length} parameter{g.rows.length === 1 ? "" : "s"}</p>
                      </div>
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        <button onClick={() => openBulk(category.id, g.id)} aria-label="Add parameters here" className={`${iconBtn} text-emerald-600 hover:bg-emerald-500/10`} title="Add parameters here"><Plus size={18} /></button>
                        {sub && (
                          <>
                            <button onClick={() => openSubModal(category.id, sub.id)} aria-label="Rename sub-category" className={`${iconBtn} text-blue-600 hover:bg-blue-500/10`} title="Rename sub-category"><Edit3 size={16} /></button>
                            <button onClick={() => deleteSub(sub)} aria-label="Delete sub-category" className={`${iconBtn} text-red-500 hover:bg-red-500/10`} title="Delete sub-category"><Trash2 size={16} /></button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex-1 divide-y divide-white/60">
                      {g.rows.length === 0 && <p className="px-5 py-6 text-xs text-slate-500 text-center">No parameters yet. Use + to add.</p>}
                      {pageRows.map(({ r, ri }) => {
                        const editing = editPriceId === r.id;
                        return (
                          /* phones: name on the first line, price + buttons on the second line; sm and up: one line */
                          <div key={r.id} className="px-4 sm:px-5 py-3 sm:py-2.5 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 hover:bg-white/40 transition-colors">
                            <div className="flex items-start gap-3 min-w-0 flex-1">
                              <span className="w-9 text-[11px] font-semibold text-slate-400 flex-shrink-0 pt-0.5 sm:pt-0">{g.id ? `${gi + 1}.${ri + 1}` : ri + 1}</span>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-slate-800 break-words sm:truncate" title={r.parameterName}>{r.parameterName}</p>
                                {r.unit && <p className="text-[11px] text-slate-500">{formatUnit(r.unit)}</p>}
                                {(() => {
                                  const others = catRows.filter((x) => x.parameterId === r.parameterId && x.id !== r.id);
                                  if (others.length === 0) return null;
                                  const names = others.map((o) => subs.find((x) => x.id === o.subCategoryId)?.name ?? "No sub-category");
                                  const differs = others.some((o) => o.price !== r.price);
                                  return (
                                    <p className="text-[10px] text-amber-600 break-words sm:truncate" title={names.join(", ")}>
                                      Also in {names.join(", ")} · billed once{differs ? " · prices differ" : ""}
                                    </p>
                                  );
                                })()}
                              </div>
                            </div>

                            {editing ? (
                              <div className="flex items-center gap-1 pl-12 sm:pl-0">
                                <input
                                  autoFocus
                                  type="number"
                                  inputMode="decimal"
                                  step="0.01"
                                  min="0"
                                  value={editPriceVal}
                                  onChange={(e) => setEditPriceVal(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") commitEditPrice();
                                    if (e.key === "Escape") setEditPriceId(null);
                                  }}
                                  className="flex-1 min-w-0 sm:flex-none sm:w-28 px-3 py-2 sm:px-2.5 sm:py-1.5 rounded-xl border border-blue-300 bg-white/90 text-base sm:text-xs font-semibold text-right focus:outline-none focus:ring-2 focus:ring-blue-500/60"
                                />
                                <button onClick={commitEditPrice} aria-label="Save price" className={`${iconBtn} text-emerald-600 hover:bg-emerald-500/10`} title="Save"><Check size={18} /></button>
                                <button onClick={() => setEditPriceId(null)} aria-label="Cancel" className={`${iconBtn} text-slate-400 hover:bg-slate-500/10`} title="Cancel"><X size={18} /></button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between sm:justify-end gap-1 pl-12 sm:pl-0">
                                <span className="text-sm font-bold text-blue-700 tabular-nums">{money(r.price)}</span>
                                <div className="flex items-center gap-0.5">
                                  <button onClick={() => startEditPrice(r)} aria-label={`Edit price of ${r.parameterName}`} className={`${iconBtn} text-blue-600 hover:bg-blue-500/10`} title="Edit price"><Edit3 size={16} /></button>
                                  <button onClick={() => deleteRow(r)} aria-label={`Remove ${r.parameterName}`} className={`${iconBtn} text-red-500 hover:bg-red-500/10`} title="Remove"><Trash2 size={16} /></button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {pages > 1 && (
                      <div className="px-4 sm:px-5 py-2 border-t border-white/60 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600">
                        <span>
                          {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
                        </span>
                        <div className="flex flex-wrap items-center gap-1">
                          <button
                            type="button"
                            onClick={() => goPage(page - 1)}
                            disabled={page === 0}
                            aria-label="Previous page"
                            className="p-2 sm:p-1 rounded-lg hover:bg-slate-500/10 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                            title="Previous page"
                          >
                            <ChevronLeft size={16} />
                          </button>
                          {Array.from({ length: pages }, (_, n) => (
                            <button
                              key={n}
                              type="button"
                              onClick={() => goPage(n)}
                              className={`min-w-[32px] sm:min-w-[24px] h-8 sm:h-6 px-1.5 rounded-lg text-[11px] font-semibold cursor-pointer transition-colors ${
                                n === page ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-500/10"
                              }`}
                            >
                              {n + 1}
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => goPage(page + 1)}
                            disabled={page === pages - 1}
                            aria-label="Next page"
                            className="p-2 sm:p-1 rounded-lg hover:bg-slate-500/10 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                            title="Next page"
                          >
                            <ChevronRight size={16} />
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="px-4 sm:px-5 py-3 border-t border-white/60 bg-white/40 flex items-center justify-between gap-3">
                      <span className="text-xs font-bold text-slate-600 italic">Total</span>
                      <span className="text-sm font-extrabold text-slate-900 tabular-nums">{money(total)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Floating "add prices" button for phones (the header button scrolls out of view) */}
      {!loading && categories.length > 0 && !bulkOpen && !nameModal && !billOpen && (
        <button
          type="button"
          onClick={() => openBulk()}
          aria-label="Add prices"
          className="sm:hidden fixed z-40 right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] h-14 w-14 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-xl shadow-blue-500/40 ring-1 ring-inset ring-white/30 flex items-center justify-center active:scale-95 transition-transform cursor-pointer"
        >
          <Plus size={26} />
        </button>
      )}

      {/* ───────── Category / Sub-category name modal ───────── */}
      {nameModal && (
        <Modal
          title={`${nameModal.id ? "Edit" : "Add"} ${nameModal.kind === "category" ? "Category" : "Sub-category"}`}
          icon={<FolderPlus size={20} className="text-blue-600" />}
          onClose={() => setNameModal(null)}
          footer={
            <>
              <CancelBtn onClick={() => setNameModal(null)} />
              <Button
                type="submit"
                form="name-form"
                disabled={nameSaving}
                className={`${btnPrimary} w-full sm:w-auto h-11 sm:h-10 px-6 justify-center`}
              >
                {nameSaving ? <Loader2 className="animate-spin h-4 w-4" /> : "Save"}
              </Button>
            </>
          }
        >
          <form id="name-form" onSubmit={saveName} className="space-y-1.5">
            {nameModal.kind === "sub" && (
              <p className="text-xs text-slate-600 pb-1">
                In category: <b>{categories.find((c) => c.id === nameModal.categoryId)?.name}</b>
              </p>
            )}
            <label className="text-xs font-semibold text-slate-700">
              {nameModal.kind === "category" ? "Category name" : "Sub-category name"} <span className="text-red-500">*</span>
            </label>
            <input
              autoFocus={canAutoFocus()}
              value={nameVal}
              onChange={(e) => setNameVal(e.target.value)}
              placeholder={nameModal.kind === "category" ? "e.g. Potable Water" : "e.g. Physical/Chemical Requirement"}
              className={glassField}
            />
          </form>
        </Modal>
      )}

      {/* ───────── Bulk add prices modal ───────── */}
      {bulkOpen && (
        <Modal
          wide
          dismissOnOverlay={false}
          title="Add Parameter Prices"
          icon={<Tag size={20} className="text-blue-600" />}
          onClose={() => setBulkOpen(false)}
          note={
            <>
              {bItems.length} parameter{bItems.length === 1 ? "" : "s"}
              {bTargets.length > 1 && bItems.length > 0 && (
                <> × {bTargets.length} sub-categories = <b className="text-slate-700">{bItems.length * bTargets.length}</b> prices</>
              )}
            </>
          }
          footer={
            <>
              <CancelBtn onClick={() => setBulkOpen(false)} />
              <Button
                type="button"
                onClick={saveBulk}
                disabled={!canSaveBulk || bSaving}
                className={`${btnPrimary} w-full sm:w-auto h-11 sm:h-10 px-6 flex items-center justify-center gap-2`}
              >
                {bSaving ? <Loader2 className="animate-spin h-4 w-4" /> : <Save size={16} />} Save all
              </Button>
            </>
          }
        >
          {/* Step 1 – category */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] flex items-center justify-center shrink-0">1</span>
              Category <span className="text-red-500">*</span>
            </label>
            <GlassSelect
              value={bCat}
              options={categories.map((c) => ({ value: c.id, label: c.name }))}
              placeholder="Select category..."
              onChange={(v) => { setBCat(v); setBSubs([]); setBItems([]); setBErr(""); }}
            />
          </div>

          {/* Step 2 – sub-categories (tick one or many) */}
          {bCat && bCatSubs.length > 0 && (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] flex items-center justify-center shrink-0">2</span>
                  <span>Save in which sub-categories? <span className="font-normal text-slate-400">(tick one or more)</span></span>
                </label>
                <div className="flex items-center gap-4 text-xs font-semibold">
                  <button type="button" onClick={() => setBSubs(allTargetKeys)} className="text-blue-600 hover:underline cursor-pointer py-1">Select all</button>
                  <button type="button" onClick={() => setBSubs([])} className="text-slate-500 hover:underline cursor-pointer py-1">Clear</button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {[...bCatSubs.map((s) => ({ k: s.id, label: s.name })), { k: NONE, label: "No sub-category" }].map((o) => {
                  const on = bTargets.includes(o.k);
                  return (
                    <button
                      key={o.k}
                      type="button"
                      onClick={() => toggleTarget(o.k)}
                      aria-pressed={on}
                      className={`flex items-center gap-1.5 px-3.5 py-2 sm:py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 cursor-pointer hover:-translate-y-0.5 text-left ${
                        on
                          ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white border-white/30 shadow-md shadow-blue-500/25"
                          : "bg-white/60 backdrop-blur-xl text-slate-600 border-white/70 hover:bg-white/90 hover:text-blue-700"
                      }`}
                    >
                      {on && <Check size={13} className="shrink-0" />} {o.label}
                    </button>
                  );
                })}
              </div>
              {bTargets.length > 1 && (
                <p className="text-[11px] text-slate-500">
                  The same parameters and prices will be saved in each ticked sub-category. In bills a parameter is charged only once.
                </p>
              )}
            </div>
          )}

          {/* Step 3 – type the parameter */}
          <div className={`space-y-2 ${!bCat ? "opacity-50 pointer-events-none" : ""}`}>
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] flex items-center justify-center shrink-0">{bCatSubs.length > 0 ? 3 : 2}</span>
                <span>Type parameter, unit &amp; price, then press Add</span>
              </label>
              <button
                type="button"
                onClick={() => setPasteOpen((o) => !o)}
                className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer flex items-center gap-1 py-1"
              >
                Paste many at once <ChevronDown size={13} className={`transition-transform ${pasteOpen ? "rotate-180" : ""}`} />
              </button>
            </div>

            {/* phones: name on its own line, unit + price side by side, full-width Add button */}
            <form
              onSubmit={(e) => { e.preventDefault(); addTyped(); }}
              className="p-3 rounded-2xl bg-blue-500/5 border border-blue-500/20 backdrop-blur-xl grid grid-cols-2 sm:grid-cols-[1fr_110px_130px_auto] gap-2 items-end"
            >
              <div className="space-y-1 col-span-2 sm:col-span-1">
                <label className="text-[11px] font-semibold text-slate-600">Parameter name</label>
                <input
                  id="typed-param-name"
                  list="known-parameters"
                  value={dName}
                  onChange={(e) => onNameChange(e.target.value)}
                  placeholder="e.g. Calcium"
                  className={glassField}
                  autoComplete="off"
                />
                <datalist id="known-parameters">
                  {parameters.map((p) => <option key={p.id} value={p.name} />)}
                </datalist>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600">Unit <span className="font-normal text-slate-400">(optional)</span></label>
                <input value={dUnit} onChange={(e) => setDUnit(e.target.value)} placeholder="mg/L" className={glassField} />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600">Price (Rs.)</label>
                <input type="number" inputMode="decimal" step="0.01" min="0" value={dPrice} onChange={(e) => { setDPrice(e.target.value); setBErr(""); }} placeholder="0.00" className={glassField} />
              </div>
              <Button
                type="submit"
                className={`${btnPrimary} col-span-2 sm:col-span-1 h-11 sm:h-[42px] px-4 text-xs flex items-center justify-center gap-1.5`}
              >
                <Plus size={14} /> Add
              </Button>
            </form>

            {pasteOpen && (
              <div className="p-3 rounded-2xl bg-white/50 backdrop-blur-xl border border-white/70 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                <p className="text-[11px] text-slate-600">
                  One parameter per line: <b>name, unit, price</b> (unit is optional). Copy straight from Excel or type it.
                </p>
                <textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  rows={5}
                  placeholder={"Calcium, mg/L, 120\nTotal Hardness, mg/L, 150\nChloride, 90"}
                  className={`${glassField} font-mono !text-base sm:!text-xs`}
                />
                <div className="flex justify-end">
                  <Button
                    type="button"
                    onClick={addPasted}
                    className="bg-slate-800 hover:bg-slate-900 text-white rounded-full w-full sm:w-auto h-11 sm:h-9 px-5 text-xs font-semibold cursor-pointer shadow-md transition-all hover:-translate-y-0.5 justify-center"
                  >
                    Add to list
                  </Button>
                </div>
              </div>
            )}

            {bErr ? (
              <p className="flex items-start gap-2 text-xs font-semibold text-red-600 bg-red-400/10 border border-red-400/30 backdrop-blur-xl rounded-2xl px-3 py-2 break-words">
                <AlertCircle size={14} className="flex-shrink-0 mt-0.5" /> <span className="min-w-0">{bErr}</span>
              </p>
            ) : (
              <p className="text-[11px] text-slate-500">
                Known parameters fill the unit and price for you. New parameters are created automatically when you save.
              </p>
            )}
          </div>

          {/* Review */}
          {bItems.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700">Review (Rs., without VAT)</label>

              <div className="rounded-2xl border border-white/70 bg-white/50 backdrop-blur-xl divide-y divide-white/60 max-h-64 overflow-y-auto overscroll-contain">
                {bItems.map((s) => {
                  const skipIn = bTargets.filter((t) => existsIn(s.name, t));
                  return (
                    <div key={s.name} className="px-3 sm:px-4 py-2.5 flex items-center gap-2 sm:gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-slate-800 break-words sm:truncate">{s.name}</p>
                        {s.unit && <p className="text-[11px] text-slate-500">{formatUnit(s.unit)}</p>}
                        {skipIn.length > 0 && (
                          <p className="text-[10px] text-amber-600 break-words">Already in {skipIn.map(targetName).join(", ")} – will be skipped there</p>
                        )}
                      </div>
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        value={s.price}
                        onChange={(e) =>
                          setBItems((items) => items.map((x) => (x.name === s.name ? { ...x, price: e.target.value } : x)))
                        }
                        placeholder="0.00"
                        aria-label={`Price of ${s.name}`}
                        className={`w-24 sm:w-32 px-3 py-2 sm:py-1.5 rounded-xl border bg-white/80 text-base sm:text-xs font-semibold text-right focus:outline-none focus:ring-2 ${
                          priceInvalid(s.price) ? "border-red-300 focus:ring-red-400/50" : "border-white/70 focus:ring-blue-500/60"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setBItems((items) => items.filter((x) => x.name !== s.name))}
                        aria-label={`Remove ${s.name}`}
                        className="p-2.5 sm:p-1.5 rounded-xl text-red-500 hover:bg-red-500/10 cursor-pointer shrink-0"
                        title="Remove"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>

              <p className="text-right text-xs text-slate-600">
                Total (each parameter once):{" "}
                <span className="font-bold text-slate-900">
                  {money(bItems.reduce((a, s) => a + (priceInvalid(s.price) ? 0 : Number(s.price)), 0))}
                </span>
              </p>
            </div>
          )}
        </Modal>
      )}

      {billOpen && (
        <BillWizard categories={categories} subs={subs} prices={prices} onClose={() => setBillOpen(false)} />
      )}

      {/* Toast: full width at the top on phones, bottom-right on larger screens */}
      {toast && (
        <div className="fixed z-[60] top-4 inset-x-3 sm:inset-x-auto sm:top-auto sm:bottom-6 sm:right-6 sm:max-w-sm flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/80 backdrop-blur-2xl border border-white/80 ring-1 ring-inset ring-white/50 shadow-2xl animate-in fade-in slide-in-from-top-4 sm:slide-in-from-bottom-4 duration-300">
          {toast.type === "success" ? (
            <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle size={18} className="text-red-600 flex-shrink-0" />
          )}
          <span className="text-xs font-semibold text-slate-800 flex-1 min-w-0 break-words">{toast.message}</span>
          <button onClick={() => setToast(null)} aria-label="Dismiss" className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer flex-shrink-0">
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}