"use client";

import React, { useEffect, useRef, useState } from "react";
import { Package, Plus, Search, AlertTriangle, Shield, FlaskConical, Wrench, AlertOctagon, X, RefreshCw, ChevronDown, Check } from "lucide-react";
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
  if (status === "Normal") {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-xl bg-emerald-400/20 text-emerald-700 border border-emerald-400/40 whitespace-nowrap">
        Normal
      </span>
    );
  }
  if (status === "Low Stock") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-xl bg-amber-400/20 text-amber-700 border border-amber-400/40 whitespace-nowrap">
        <AlertTriangle size={12} /> Low Stock
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-xl bg-red-400/20 text-red-700 border border-red-400/40 whitespace-nowrap">
      <AlertTriangle size={12} /> Critical
    </span>
  );
}

// Left accent stripe on the phone cards so each item is easy to tell apart
const statusBorder = (status: string) =>
  status === "Normal" ? "border-l-emerald-400" : status === "Low Stock" ? "border-l-amber-400" : "border-l-red-400";

const damageReasonOptions: Option[] = [
  { value: "Accidental Drop", label: "Accidental Drop / Chipped" },
  { value: "Thermal Shock", label: "Thermal Shock (Heat Damage)" },
  { value: "Calibration Failure", label: "Calibration Failure / Worn Out" },
  { value: "Chemical Corrosion", label: "Chemical Corrosion" },
  { value: "Other", label: "Other Reason" },
];

const stockReasonOptions: Option[] = [
  { value: "New Shipment Received", label: "New Shipment Received (Stock-in)" },
  { value: "Periodic Audit Correction", label: "Periodic Audit Correction" },
  { value: "Manual Adjustment", label: "Manual Adjustment" },
];

const tabs = [
  { id: "chemicals", label: "Chemical Inventory (Automated)", short: "Chemicals", icon: FlaskConical },
  { id: "glassware", label: "Glassware & Equipment", short: "Glassware", icon: Package },
  { id: "safety", label: "Safety Gear & PPE", short: "Safety & PPE", icon: Shield },
  { id: "consumables", label: "Consumables & Tools", short: "Consumables", icon: Wrench },
];

export default function AdminInventoryPage() {
  const [activeTab, setActiveTab] = useState("chemicals");
  const [searchTerm, setSearchTerm] = useState("");

  // Modal State for Reporting Breakage / Damage or Stock Adjustment
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [modalActionType, setModalActionType] = useState<"damage" | "stock" | "add">("stock");

  // Form fields state
  const [inputQty, setInputQty] = useState(1);
  const [selectReason, setSelectReason] = useState("Accidental Drop");

  // Mock Data separated by sub-parts reflecting real lab rules
  const [inventoryData, setInventoryData] = useState<Record<string, any[]>>({
    chemicals: [
      { id: 1, name: "Sodium Hydroxide (NaOH)", category: "pH Adjustment", stock: 120, minStock: 50, unit: "Liters", status: "Normal", note: "Linked to BOD/COD tests" },
      { id: 2, name: "Hydrochloric Acid (HCl)", category: "pH Adjustment", stock: 25, minStock: 30, unit: "Liters", status: "Low Stock", note: "Linked to Titration tests" },
      { id: 3, name: "Polyelectrolyte (Flocculant)", category: "Coagulation", stock: 85, minStock: 40, unit: "Kg", status: "Normal", note: "Linked to Clarifier unit" },
      { id: 4, name: "Aluminium Sulphate (Alum)", category: "Coagulation", stock: 15, minStock: 50, unit: "Kg", status: "Critical", note: "Linked to Water treatment" },
    ],
    glassware: [
      { id: 1, name: "Beaker (500ml - Pyrex)", category: "Glassware", stock: 45, minStock: 20, unit: "Units", status: "Normal", note: "Incident/Breakage tracked" },
      { id: 2, name: "Volumetric Flask (1000ml)", category: "Glassware", stock: 8, minStock: 10, unit: "Units", status: "Low Stock", note: "Incident/Breakage tracked" },
      { id: 3, name: "Digital pH Meter Probe", category: "Equipment", stock: 3, minStock: 5, unit: "Units", status: "Critical", note: "Calibration/Damage tracked" },
      { id: 4, name: "Glass Burette (50ml)", category: "Glassware", stock: 18, minStock: 10, unit: "Units", status: "Normal", note: "Incident/Breakage tracked" },
    ],
    safety: [
      { id: 1, name: "Chemical Resistant Gloves", category: "PPE", stock: 60, minStock: 25, unit: "Pairs", status: "Normal", note: "Periodic audit tracked" },
      { id: 2, name: "Safety Goggles", category: "PPE", stock: 12, minStock: 15, unit: "Units", status: "Low Stock", note: "Periodic audit tracked" },
      { id: 3, name: "Lab Coats (White - L size)", category: "Apparel", stock: 20, minStock: 10, unit: "Units", status: "Normal", note: "Periodic audit tracked" },
      { id: 4, name: "Full Face Respirator Mask", category: "Safety Gear", stock: 4, minStock: 8, unit: "Units", status: "Critical", note: "Periodic audit tracked" },
    ],
    consumables: [
      { id: 1, name: "Whatman Filter Paper (Grade 41)", category: "Consumables", stock: 150, minStock: 50, unit: "Sheets", status: "Normal", note: "Manual stock-in/out" },
      { id: 2, name: "BOD Sample Bottles (300ml)", category: "Sampling", stock: 30, minStock: 40, unit: "Units", status: "Low Stock", note: "Manual stock-in/out" },
      { id: 3, name: "Disposible Pipettes (3ml)", category: "Consumables", stock: 500, minStock: 200, unit: "Pieces", status: "Normal", note: "Manual stock-in/out" },
    ]
  });

  const currentItems = inventoryData[activeTab] || [];
  const filteredItems = currentItems.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
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

  // Open Modal Helper
  const handleOpenModal = (item: any, type: "damage" | "stock") => {
    setSelectedItem(item);
    setModalActionType(type);
    setInputQty(1);
    setSelectReason(type === "damage" ? "Accidental Drop" : "New Shipment Received");
    setIsModalOpen(true);
  };

  // Submit Form Action
  const handleSubmitAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    const updatedItems = currentItems.map(item => {
      if (item.id === selectedItem.id) {
        let newStock = item.stock;
        if (modalActionType === "damage") {
          newStock = Math.max(0, item.stock - Number(inputQty));
        } else if (modalActionType === "stock") {
          // For chemicals/consumables, stock-in adds value
          newStock = activeTab === "chemicals" ? item.stock + Number(inputQty) : Math.max(0, item.stock - Number(inputQty));
        }

        let newStatus = "Normal";
        if (newStock <= item.minStock / 2) {
          newStatus = "Critical";
        } else if (newStock <= item.minStock) {
          newStatus = "Low Stock";
        }
        return { ...item, stock: newStock, status: newStatus };
      }
      return item;
    });

    setInventoryData({
      ...inventoryData,
      [activeTab]: updatedItems
    });

    setIsModalOpen(false);
  };

  // Row action button (full width on phone cards, compact in the table)
  const renderAction = (item: any, fullWidth: boolean) => {
    const size = fullWidth
      ? "w-full min-h-[44px] justify-center px-3.5 py-2.5 text-sm"
      : "px-3.5 py-1.5 text-xs";
    return activeTab === "glassware" || activeTab === "safety" ? (
      <button
        onClick={() => handleOpenModal(item, "damage")}
        className={`inline-flex items-center gap-1.5 font-semibold text-red-600 hover:text-red-700 bg-red-400/10 hover:bg-red-400/20 border border-red-300/60 backdrop-blur-xl rounded-full shadow-sm transition-all hover:-translate-y-0.5 cursor-pointer ${size}`}
      >
        <AlertOctagon size={14} /> Report Damage
      </button>
    ) : (
      <button
        onClick={() => handleOpenModal(item, "stock")}
        className={`inline-flex items-center gap-1.5 font-semibold text-blue-700 hover:text-blue-800 bg-white/60 hover:bg-white/90 border border-white/70 backdrop-blur-xl rounded-full shadow-sm transition-all hover:-translate-y-0.5 cursor-pointer ${size}`}
      >
        <RefreshCw size={13} /> Update Stock
      </button>
    );
  };

  return (
    <div className="w-full min-w-0 space-y-4 sm:space-y-6 relative">
      {/* Page Header */}
      <div className={`${glass} flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 p-4 sm:p-6 rounded-2xl sm:rounded-3xl`}>
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl font-semibold tracking-tight text-slate-900 flex items-start sm:items-center gap-3 leading-tight">
            <span className="p-2 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow-lg shadow-blue-500/30 ring-1 ring-inset ring-white/40 shrink-0">
              <Package size={22} />
            </span>
            <span className="mt-1 sm:mt-0">Inventory Management</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
            Centralized stock control: Automated chemical test deductions & incident-based equipment tracking.
          </p>
        </div>
        <Button
          variant="default"
          className="w-full md:w-auto min-h-[44px] bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold px-5 rounded-full shadow-lg shadow-blue-500/30 ring-1 ring-inset ring-white/30 flex items-center justify-center gap-2 cursor-pointer transition-all hover:-translate-y-0.5 active:translate-y-0 flex-shrink-0"
        >
          <Plus size={18} />
          Add New Item
        </Button>
      </div>

      {/* Tabs Navigation: 2x2 grid on phones (nothing hidden off-screen), one row from sm up */}
      <div className={`${glass} p-1.5 rounded-2xl grid grid-cols-2 sm:flex gap-1.5 sm:gap-1 sm:overflow-x-auto`}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSearchTerm(""); }}
              className={`group flex items-center justify-center sm:justify-start gap-2 py-2.5 px-2 sm:px-4 min-h-[44px] text-xs sm:text-sm font-semibold rounded-xl transition-all duration-200 sm:whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? "bg-white/85 text-blue-700 shadow-md ring-1 ring-inset ring-white/70"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
              }`}
            >
              <Icon size={18} className="shrink-0 transition-transform duration-200 group-hover:scale-110" />
              <span className="sm:hidden">{tab.short}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Info Banner based on Tab */}
      <div className="bg-blue-400/15 backdrop-blur-2xl border border-blue-400/40 ring-1 ring-inset ring-white/30 rounded-2xl p-3 sm:p-4 text-xs text-blue-900 shadow-sm leading-relaxed">
        <span className="font-bold">Active Sub-system Mode: </span>
        {activeTab === "chemicals" && "Chemicals are automatically deducted via daily test record entries, with manual stock-in support."}
        {activeTab === "glassware" && "Glassware and equipment are tracked via incident-based breakage reporting and periodic physical audits."}
        {activeTab === "safety" && "Safety gear and PPE are managed through periodic audits and replacement logs."}
        {activeTab === "consumables" && "Consumables are monitored via manual stock adjustments and batch usage."}
      </div>

      {/* Search & Filter Bar */}
      <div className={`${glass} p-3 sm:p-4 rounded-2xl sm:rounded-3xl flex flex-col sm:flex-row gap-3 sm:gap-4 justify-between items-stretch sm:items-center`}>
        <div className="w-full sm:w-80 relative group">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-500 transition-colors group-focus-within:text-blue-600">
            <Search size={18} />
          </span>
          <input
            type="text"
            placeholder="Search items or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 min-h-[44px] sm:min-h-0 rounded-full border border-white/70 bg-white/60 hover:bg-white/80 backdrop-blur-xl text-base sm:text-sm text-slate-800 font-medium placeholder:text-slate-400 shadow-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:bg-white/90"
          />
        </div>
        <div className="text-xs text-slate-600 font-medium">
          Showing <span className="font-bold text-slate-800">{filteredItems.length}</span> items
        </div>
      </div>

      {/* Phones: every item is its own separate card with a gap between them */}
      <div className="md:hidden space-y-3">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className={`${glass} p-4 space-y-3 rounded-2xl border-l-4 ${statusBorder(item.status)}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 break-words">{item.name}</p>
                <p className="text-[11px] text-slate-500 mt-0.5 break-words">{item.note}</p>
              </div>
              <StatusBadge status={item.status} />
            </div>

            <p className="text-xs text-slate-600">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Category: </span>
              <span className="font-medium">{item.category}</span>
            </p>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-2xl bg-white/50 border border-white/60 px-3 py-2.5 min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Current Stock</p>
                <p className="text-lg font-bold text-slate-900 break-words">
                  {item.stock} <span className="text-xs font-normal text-slate-500">{item.unit}</span>
                </p>
              </div>
              <div className="rounded-2xl bg-white/50 border border-white/60 px-3 py-2.5 min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Min Threshold</p>
                <p className="text-lg font-bold text-slate-700 break-words">
                  {item.minStock} <span className="text-xs font-normal text-slate-500">{item.unit}</span>
                </p>
              </div>
            </div>

            {renderAction(item, true)}
          </div>
        ))}
        {filteredItems.length === 0 && (
          <div className={`${glass} text-center py-8 px-4 rounded-2xl text-slate-500 text-sm`}>
            No items found matching your search.
          </div>
        )}
      </div>

      {/* Tablet / desktop: full table */}
      <div className={`hidden md:block ${glass} rounded-3xl overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/40 border-b border-white/60 text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                <th className="py-3.5 px-4 lg:px-6">Item Name</th>
                <th className="py-3.5 px-4 lg:px-6">Category</th>
                <th className="py-3.5 px-4 lg:px-6">Current Stock</th>
                <th className="py-3.5 px-4 lg:px-6">Min Threshold</th>
                <th className="py-3.5 px-4 lg:px-6">Status / Rule</th>
                <th className="py-3.5 px-4 lg:px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/50 text-sm">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-white/55 transition-all duration-200">
                  <td className="py-4 px-4 lg:px-6 font-semibold text-slate-900">
                    {item.name}
                    <div className="text-[11px] font-normal text-slate-500">{item.note}</div>
                  </td>
                  <td className="py-4 px-4 lg:px-6 text-slate-600 font-medium whitespace-nowrap">{item.category}</td>
                  <td className="py-4 px-4 lg:px-6 font-bold text-slate-800 whitespace-nowrap">
                    {item.stock} <span className="text-xs font-normal text-slate-500">{item.unit}</span>
                  </td>
                  <td className="py-4 px-4 lg:px-6 text-slate-600 whitespace-nowrap">
                    {item.minStock} {item.unit}
                  </td>
                  <td className="py-4 px-4 lg:px-6">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="py-4 px-4 lg:px-6 text-right whitespace-nowrap">
                    {renderAction(item, false)}
                  </td>
                </tr>
              ))}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-500 text-sm">
                    No items found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Universal Action Modal (Stock Update / Breakage Report): bottom sheet on phones, centred dialog from sm up */}
      {isModalOpen && selectedItem && (
        <div
          className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
        >
          <div className="bg-white/80 sm:bg-white/70 backdrop-blur-2xl border border-white/70 ring-1 ring-inset ring-white/50 shadow-[0_24px_60px_rgba(15,23,42,0.25)] rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md max-h-[92dvh] sm:max-h-[90vh] overflow-y-auto overscroll-contain p-4 sm:p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center gap-3 mb-4 border-b border-white/60 pb-3">
              <div className="flex items-center gap-2 text-slate-900 min-w-0">
                {modalActionType === "damage" ? (
                  <>
                    <AlertOctagon className="text-red-600 shrink-0" size={22} />
                    <h3 className="text-base font-semibold tracking-tight text-slate-900">Report Item Breakage / Loss</h3>
                  </>
                ) : (
                  <>
                    <RefreshCw className="text-blue-600 shrink-0" size={22} />
                    <h3 className="text-base font-semibold tracking-tight text-slate-900">Update Stock Level</h3>
                  </>
                )}
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

            <form onSubmit={handleSubmitAction} className="space-y-4">
              <div className="bg-white/50 backdrop-blur-xl p-3.5 rounded-2xl border border-white/70">
                <p className="text-xs font-semibold text-slate-600">Selected Item</p>
                <p className="text-sm font-bold text-slate-900 mt-0.5 break-words">{selectedItem.name}</p>
                <p className="text-xs text-slate-600 mt-0.5">Current Stock: {selectedItem.stock} {selectedItem.unit}</p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  {modalActionType === "damage" ? "Quantity Broken / Lost" : "Adjustment Quantity (+ / -)"}
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  value={inputQty}
                  onChange={(e) => setInputQty(Number(e.target.value))}
                  className={glassField}
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  {modalActionType === "damage" ? "Reason / Cause" : "Stock Entry Note"}
                </label>
                <GlassSelect
                  value={selectReason}
                  onChange={setSelectReason}
                  options={modalActionType === "damage" ? damageReasonOptions : stockReasonOptions}
                />
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
                  className={`w-full sm:w-auto min-h-[44px] sm:min-h-0 px-4 py-2 rounded-full text-sm font-semibold text-white shadow-md ring-1 ring-inset ring-white/30 cursor-pointer transition-all hover:-translate-y-0.5 active:translate-y-0 ${
                    modalActionType === "damage"
                      ? "bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 shadow-red-500/30"
                      : "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-blue-500/30"
                  }`}
                >
                  {modalActionType === "damage" ? "Confirm & Deduct Stock" : "Save Stock Update"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}