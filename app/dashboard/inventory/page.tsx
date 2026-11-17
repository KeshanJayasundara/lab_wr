"use client";

import React, { useState } from "react";
import { Package, AlertTriangle, TrendingDown, RefreshCw, PlusCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// Shared "frosted glass" look (same as the other pages)
const glass =
  "bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_32px_rgba(15,23,42,0.10)] ring-1 ring-inset ring-white/40";

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

export default function InventoryDashboardPage() {
  // Inventory items mock state
  const [inventoryItems, setInventoryItems] = useState([
    { id: 1, name: "Aluminium Sulphate (Alum)", category: "Coagulants", stock: 18, unit: "Kg", minLimit: 50, status: "Critical" },
    { id: 2, name: "Hydrochloric Acid (HCl 37%)", category: "Acids", stock: 25, unit: "Liters", minLimit: 30, status: "Low Stock" },
    { id: 3, name: "Sodium Hydroxide (NaOH)", category: "Bases", stock: 120, unit: "Kg", minLimit: 40, status: "Normal" },
    { id: 4, name: "Activated Carbon (Powdered)", category: "Adsorbents", stock: 85, unit: "Kg", minLimit: 40, status: "Normal" },
    { id: 5, name: "Glass Beakers (500ml)", category: "Glassware", stock: 12, unit: "Units", minLimit: 15, status: "Low Stock" },
  ]);

  // Quick Restock Handler
  const handleRestock = (id: number) => {
    setInventoryItems(inventoryItems.map(item => {
      if (item.id === id) {
        const newStock = item.stock + 50;
        return {
          ...item,
          stock: newStock,
          status: newStock >= item.minLimit ? "Normal" : "Low Stock"
        };
      }
      return item;
    }));
  };

  const summaryCards = [
    {
      label: "Total Inventory Items",
      value: String(inventoryItems.length),
      valueClass: "text-slate-900",
      footer: "Active stocks",
      footerClass: "text-slate-600",
      icon: Package,
      tile: "from-sky-400 to-blue-600 shadow-blue-500/30",
    },
    {
      label: "Critical Low Stock",
      value: String(inventoryItems.filter(i => i.status === "Critical" || i.status === "Low Stock").length),
      valueClass: "text-red-600",
      footer: "Requires immediate attention",
      footerClass: "text-red-600",
      icon: AlertTriangle,
      tile: "from-rose-400 to-red-500 shadow-red-500/30",
    },
    {
      label: "Monthly Consumption",
      value: "410 L / Kg",
      valueClass: "text-slate-900",
      footer: "Within expected limits",
      footerClass: "text-slate-600",
      icon: TrendingDown,
      tile: "from-violet-400 to-purple-600 shadow-purple-500/30",
    },
    {
      label: "Stock Health Status",
      value: "Good",
      valueClass: "text-emerald-600",
      footer: "Automated deduction active",
      footerClass: "text-slate-600",
      icon: CheckCircle2,
      tile: "from-emerald-400 to-teal-500 shadow-emerald-500/30",
    },
  ];

  return (
    <div className="w-full min-w-0 space-y-4 sm:space-y-6">
      {/* Page Header */}
      <div className={`${glass} flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 p-4 sm:p-6 rounded-2xl sm:rounded-3xl`}>
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl font-semibold tracking-tight text-slate-900 flex items-start sm:items-center gap-3 leading-tight">
            <span className="p-2 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow-lg shadow-blue-500/30 ring-1 ring-inset ring-white/40 shrink-0">
              <Package size={22} />
            </span>
            <span className="mt-1 sm:mt-0">Inventory Manager Dashboard</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
            Monitor chemical stock levels, track consumption rates, and manage laboratory equipment replenishments.
          </p>
        </div>
        <Button className="w-full md:w-auto min-h-[44px] bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold px-5 rounded-full shadow-lg shadow-blue-500/30 ring-1 ring-inset ring-white/30 flex items-center justify-center gap-2 cursor-pointer transition-all hover:-translate-y-0.5 active:translate-y-0 flex-shrink-0">
          <PlusCircle size={18} />
          Add New Stock Item
        </Button>
      </div>

      {/* Summary Cards: 2 columns on phones (icon on top), 4 on large screens */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className={`${glass} h-full min-w-0 p-4 sm:p-5 rounded-2xl sm:rounded-3xl flex flex-col justify-between transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/55`}
            >
              <div className="flex flex-col items-start gap-3 sm:flex-row sm:justify-between">
                <div className={`shrink-0 p-2.5 rounded-xl sm:rounded-2xl bg-gradient-to-br ${card.tile} text-white shadow-lg ring-1 ring-inset ring-white/40 sm:order-2`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0 w-full sm:w-auto sm:order-1">
                  <p className="text-[10px] sm:text-xs font-semibold text-slate-600 uppercase tracking-wider leading-snug break-words">{card.label}</p>
                  <h3 className={`text-xl sm:text-2xl font-semibold tracking-tight mt-1 break-words ${card.valueClass}`}>{card.value}</h3>
                </div>
              </div>
              <p className={`mt-3 sm:mt-4 pt-3 border-t border-white/50 text-[11px] sm:text-xs font-medium leading-snug break-words ${card.footerClass}`}>{card.footer}</p>
            </div>
          );
        })}
      </div>

      {/* Stock Levels with Quick Restock */}

      {/* Phones: heading, then every item as its own separate card with a gap between them */}
      <div className="md:hidden space-y-3">
        <div className="px-1">
          <h3 className="text-base font-semibold tracking-tight text-slate-900">Chemical & Equipment Stock Status</h3>
          <p className="text-xs text-slate-600 mt-0.5">Manage real-time stock quantities and perform quick replenishments.</p>
        </div>

        {inventoryItems.map((item) => (
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

            <div>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-white/60 backdrop-blur-xl text-slate-700 border border-white/70">
                {item.category}
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
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Min Threshold</p>
                <p className="text-lg font-bold text-slate-700 break-words">
                  {item.minLimit} <span className="text-xs font-normal text-slate-500">{item.unit}</span>
                </p>
              </div>
            </div>

            <button
              onClick={() => handleRestock(item.id)}
              className="w-full min-h-[44px] inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-blue-700 hover:text-blue-800 bg-white/60 hover:bg-white/90 border border-white/70 backdrop-blur-xl px-3.5 py-2.5 rounded-full shadow-sm transition-all hover:-translate-y-0.5 cursor-pointer group"
            >
              <RefreshCw size={14} className="transition-transform duration-500 group-active:rotate-180" /> Quick Restock (+50)
            </button>
          </div>
        ))}
      </div>

      {/* Tablet / desktop: full table */}
      <div className={`hidden md:block ${glass} rounded-3xl overflow-hidden`}>
        <div className="p-5 border-b border-white/50 flex justify-between items-center">
          <div>
            <h3 className="text-base font-semibold tracking-tight text-slate-900">Chemical & Equipment Stock Status</h3>
            <p className="text-xs text-slate-600 mt-0.5">Manage real-time stock quantities and perform quick replenishments.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/40 border-b border-white/60 text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                <th className="py-3.5 px-4 lg:px-6">Item Name</th>
                <th className="py-3.5 px-4 lg:px-6">Category</th>
                <th className="py-3.5 px-4 lg:px-6">Current Stock</th>
                <th className="py-3.5 px-4 lg:px-6">Min Threshold</th>
                <th className="py-3.5 px-4 lg:px-6">Status</th>
                <th className="py-3.5 px-4 lg:px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/50 text-sm">
              {inventoryItems.map((item) => (
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
                  <td className="py-4 px-4 lg:px-6 font-bold text-slate-800 whitespace-nowrap">
                    {item.stock} <span className="text-xs font-normal text-slate-500">{item.unit}</span>
                  </td>
                  <td className="py-4 px-4 lg:px-6 text-slate-600 text-xs whitespace-nowrap">
                    {item.minLimit} {item.unit}
                  </td>
                  <td className="py-4 px-4 lg:px-6">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="py-4 px-4 lg:px-6 text-right whitespace-nowrap">
                    <button
                      onClick={() => handleRestock(item.id)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-800 bg-white/60 hover:bg-white/90 border border-white/70 backdrop-blur-xl px-3.5 py-1.5 rounded-full shadow-sm transition-all hover:-translate-y-0.5 cursor-pointer group"
                    >
                      <RefreshCw size={13} className="transition-transform duration-500 group-hover:rotate-180" /> Quick Restock (+50)
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}