"use client";

import React, { useState } from "react";
import { Package, Plus, Search, Filter, RefreshCw, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

// Shared "frosted glass" look (same as the other pages)
const glass =
  "bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_32px_rgba(15,23,42,0.10)] ring-1 ring-inset ring-white/40";

const categories = ["All", "Coagulants", "Acids", "Bases", "Adsorbents", "Glassware"];

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border backdrop-blur-xl whitespace-nowrap ${
        status === "Critical"
          ? "bg-red-400/20 text-red-700 border-red-400/40"
          : status === "Low Stock"
          ? "bg-amber-400/20 text-amber-700 border-amber-400/40"
          : "bg-emerald-400/20 text-emerald-700 border-emerald-400/40"
      }`}
    >
      {status}
    </span>
  );
}

// Left accent stripe on the phone cards so each item is easy to tell apart
const statusBorder = (status: string) =>
  status === "Critical" ? "border-l-red-400" : status === "Low Stock" ? "border-l-amber-400" : "border-l-emerald-400";

export default function InventoryStockPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Stock inventory list
  const [stocks, setStocks] = useState([
    { id: 1, name: "Aluminium Sulphate (Alum)", category: "Coagulants", stock: 18, unit: "Kg", minLimit: 50, location: "Store Room A", status: "Critical" },
    { id: 2, name: "Hydrochloric Acid (HCl 37%)", category: "Acids", stock: 25, unit: "Liters", minLimit: 30, location: "Chemical Cabinet 2", status: "Low Stock" },
    { id: 3, name: "Sodium Hydroxide (NaOH)", category: "Bases", stock: 120, unit: "Kg", minLimit: 40, location: "Store Room B", status: "Normal" },
    { id: 4, name: "Activated Carbon (Powdered)", category: "Adsorbents", stock: 85, unit: "Kg", minLimit: 40, location: "Store Room A", status: "Normal" },
    { id: 5, name: "Glass Beakers (500ml)", category: "Glassware", stock: 12, unit: "Units", minLimit: 15, location: "Lab Shelf 1", status: "Low Stock" },
    { id: 6, name: "Sulfuric Acid (H2SO4)", category: "Acids", stock: 60, unit: "Liters", minLimit: 20, location: "Chemical Cabinet 1", status: "Normal" },
  ]);

  // Filter stocks based on search term and category
  const filteredStocks = stocks.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Restock handler
  const handleUpdateStock = (id: number, amount: number) => {
    setStocks(stocks.map(item => {
      if (item.id === id) {
        const newStock = Math.max(0, item.stock + amount);
        return {
          ...item,
          stock: newStock,
          status: newStock <= 0 ? "Critical" : newStock <= item.minLimit ? "Low Stock" : "Normal"
        };
      }
      return item;
    }));
  };

  return (
    <div className="w-full min-w-0 space-y-4 sm:space-y-6">
      {/* Page Header */}
      <div className={`${glass} flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 p-4 sm:p-6 rounded-2xl sm:rounded-3xl`}>
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl font-semibold tracking-tight text-slate-900 flex items-start sm:items-center gap-3 leading-tight">
            <span className="p-2 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow-lg shadow-blue-500/30 ring-1 ring-inset ring-white/40 shrink-0">
              <Package size={22} />
            </span>
            <span className="mt-1 sm:mt-0">Chemical & Equipment Stock Management</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
            View, filter, and adjust laboratory stock quantities and reorder thresholds.
          </p>
        </div>
        <Button className="w-full md:w-auto min-h-[44px] bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold px-5 rounded-full shadow-lg shadow-blue-500/30 ring-1 ring-inset ring-white/30 flex items-center justify-center gap-2 cursor-pointer transition-all hover:-translate-y-0.5 active:translate-y-0 flex-shrink-0">
          <Plus size={18} />
          Add New Stock Item
        </Button>
      </div>

      {/* Search and Category Filter Toolbar */}
      <div className={`${glass} p-3 sm:p-4 rounded-2xl sm:rounded-3xl flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3 sm:gap-4`}>
        <div className="relative w-full lg:w-80 group">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-blue-600"
            size={18}
          />
          <input
            type="text"
            placeholder="Search chemical or equipment..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 min-h-[44px] sm:min-h-0 rounded-full border border-white/70 bg-white/60 hover:bg-white/80 backdrop-blur-xl text-base sm:text-xs font-medium text-slate-800 placeholder:text-slate-400 shadow-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:bg-white/90"
          />
        </div>

        {/* Category chips wrap onto new lines on phones, so every category is visible without sideways scrolling */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <Filter size={16} className="text-blue-600 flex-shrink-0" />
            <span className="text-xs font-semibold text-slate-700">Category:</span>
          </div>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-2 sm:py-1.5 min-h-[40px] sm:min-h-0 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer hover:-translate-y-0.5 ${
                selectedCategory === cat
                  ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md shadow-blue-500/30 ring-1 ring-inset ring-white/30"
                  : "bg-white/60 text-slate-600 border border-white/70 backdrop-blur-xl hover:bg-white/90 hover:text-blue-700"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Phones: every item is its own separate card with a gap between them */}
      <div className="md:hidden space-y-3">
        {filteredStocks.map((item) => (
          <div
            key={item.id}
            className={`${glass} p-4 space-y-3 rounded-2xl border-l-4 ${statusBorder(item.status)}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5 min-w-0">
                <Package size={18} className="text-blue-600 shrink-0 mt-0.5" />
                <p className="text-sm font-semibold text-slate-900 leading-snug break-words min-w-0">{item.name}</p>
              </div>
              <StatusBadge status={item.status} />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-white/60 backdrop-blur-xl text-slate-700 border border-white/70">
                {item.category}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 min-w-0">
                <MapPin size={12} className="shrink-0" />
                <span className="break-words">{item.location}</span>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-2xl bg-white/50 border border-white/60 px-3 py-2.5 min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Current Stock</p>
                <p className="text-lg font-bold text-slate-900 break-words">
                  {item.stock} <span className="text-xs font-normal text-slate-500">{item.unit}</span>
                </p>
              </div>
              <div className="rounded-2xl bg-white/50 border border-white/60 px-3 py-2.5 min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Min Limit</p>
                <p className="text-lg font-bold text-slate-700 break-words">
                  {item.minLimit} <span className="text-xs font-normal text-slate-500">{item.unit}</span>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleUpdateStock(item.id, 25)}
                className="group min-h-[44px] inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-blue-700 hover:text-blue-800 bg-white/60 hover:bg-white/90 border border-white/70 backdrop-blur-xl px-3 py-2.5 rounded-full shadow-sm transition-all hover:-translate-y-0.5 cursor-pointer"
              >
                <RefreshCw size={14} className="transition-transform duration-500 group-active:rotate-180" /> Add +25
              </button>
              <button
                onClick={() => handleUpdateStock(item.id, -10)}
                className="min-h-[44px] inline-flex items-center justify-center text-sm font-semibold text-red-600 hover:text-red-700 bg-red-400/10 hover:bg-red-400/20 border border-red-300/60 backdrop-blur-xl px-3 py-2.5 rounded-full shadow-sm transition-all hover:-translate-y-0.5 cursor-pointer"
              >
                Deduct -10
              </button>
            </div>
          </div>
        ))}
        {filteredStocks.length === 0 && (
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
                <th className="py-3.5 px-4 lg:px-6">Storage Location</th>
                <th className="py-3.5 px-4 lg:px-6">Current Stock</th>
                <th className="py-3.5 px-4 lg:px-6">Min Limit</th>
                <th className="py-3.5 px-4 lg:px-6">Status</th>
                <th className="py-3.5 px-4 lg:px-6 text-right">Quick Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/50 text-sm">
              {filteredStocks.map((item) => (
                <tr key={item.id} className="hover:bg-white/55 transition-all duration-200">
                  <td className="py-4 px-4 lg:px-6">
                    <div className="flex items-center gap-2.5 font-semibold text-slate-900">
                      <Package size={18} className="text-blue-600 flex-shrink-0" />
                      {item.name}
                    </div>
                  </td>
                  <td className="py-4 px-4 lg:px-6 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-white/60 backdrop-blur-xl text-slate-700 border border-white/70">
                      {item.category}
                    </span>
                  </td>
                  <td className="py-4 px-4 lg:px-6 text-slate-600 text-xs whitespace-nowrap">{item.location}</td>
                  <td className="py-4 px-4 lg:px-6 font-bold text-slate-800 whitespace-nowrap">
                    {item.stock} <span className="text-xs font-normal text-slate-500">{item.unit}</span>
                  </td>
                  <td className="py-4 px-4 lg:px-6 text-slate-600 text-xs whitespace-nowrap">
                    {item.minLimit} {item.unit}
                  </td>
                  <td className="py-4 px-4 lg:px-6">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="py-4 px-4 lg:px-6 text-right space-x-2 whitespace-nowrap">
                    <button
                      onClick={() => handleUpdateStock(item.id, 25)}
                      className="group inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-800 bg-white/60 hover:bg-white/90 border border-white/70 backdrop-blur-xl px-3 py-1.5 rounded-full shadow-sm transition-all hover:-translate-y-0.5 cursor-pointer"
                      title="Add 25 Units"
                    >
                      <RefreshCw size={13} className="transition-transform duration-500 group-hover:rotate-180" /> +25
                    </button>
                    <button
                      onClick={() => handleUpdateStock(item.id, -10)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700 bg-red-400/10 hover:bg-red-400/20 border border-red-300/60 backdrop-blur-xl px-3 py-1.5 rounded-full shadow-sm transition-all hover:-translate-y-0.5 cursor-pointer"
                      title="Deduct 10 Units"
                    >
                      -10
                    </button>
                  </td>
                </tr>
              ))}
              {filteredStocks.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-500 text-sm">
                    No items found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}