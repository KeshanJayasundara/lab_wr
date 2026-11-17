"use client";

import React, { useState } from "react";
import { AlertTriangle, Plus, User, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

// Shared "frosted glass" look (same as the other pages)
const glass =
  "bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_32px_rgba(15,23,42,0.10)] ring-1 ring-inset ring-white/40";

// Glass form control
// Phones: 16px text (stops iOS zoom-on-focus) + 44px tap height. sm and up: compact.
const glassField =
  "w-full px-3.5 py-2.5 min-h-[44px] sm:min-h-0 rounded-2xl border border-white/70 bg-white/60 hover:bg-white/80 backdrop-blur-xl text-base sm:text-xs font-medium text-slate-800 placeholder:text-slate-400 shadow-sm " +
  "transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:bg-white/90";

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border backdrop-blur-xl whitespace-nowrap ${
        status === "Replaced"
          ? "bg-emerald-400/20 text-emerald-700 border-emerald-400/40"
          : status === "Pending Replacement"
          ? "bg-amber-400/20 text-amber-700 border-amber-400/40"
          : "bg-blue-400/20 text-blue-700 border-blue-400/40"
      }`}
    >
      {status}
    </span>
  );
}

// Left accent stripe on the phone cards so each log is easy to tell apart
const statusBorder = (status: string) =>
  status === "Replaced" ? "border-l-emerald-400" : status === "Pending Replacement" ? "border-l-amber-400" : "border-l-blue-400";

export default function InventoryBreakagesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Damage Log Form States
  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [reportedBy, setReportedBy] = useState("");
  const [reason, setReason] = useState("");

  // Mock Breakage Logs List
  const [breakageLogs, setBreakageLogs] = useState([
    {
      id: 1,
      itemName: "Glass Beakers (500ml)",
      quantity: 2,
      reportedBy: "Chaminda Perera (Lab Tech)",
      date: "2026-11-02",
      reason: "Accidentally slipped during chemical mixing process.",
      status: "Logged & Verified",
    },
    {
      id: 2,
      itemName: "Volumetric Flask (250ml)",
      quantity: 1,
      reportedBy: "Sampath Bandara (Lab Tech)",
      date: "2026-10-28",
      reason: "Chipped rim found during routine wash.",
      status: "Replaced",
    },
    {
      id: 3,
      itemName: "Digital pH Electrode Probe",
      quantity: 1,
      reportedBy: "Upul Shantha",
      date: "2026-10-20",
      reason: "Sensor malfunction / accidental drop.",
      status: "Pending Replacement",
    },
  ]);

  // Handle Form Submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName || !reportedBy || !reason) return;

    const newLog = {
      id: breakageLogs.length + 1,
      itemName,
      quantity: Number(quantity),
      reportedBy,
      date: new Date().toISOString().split("T")[0],
      reason,
      status: "Logged & Verified",
    };

    setBreakageLogs([newLog, ...breakageLogs]);
    setItemName("");
    setQuantity("1");
    setReportedBy("");
    setReason("");
    setIsModalOpen(false);
  };

  return (
    <div className="w-full min-w-0 space-y-4 sm:space-y-6">
      {/* Page Header */}
      <div className={`${glass} flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 p-4 sm:p-6 rounded-2xl sm:rounded-3xl`}>
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl font-semibold tracking-tight text-slate-900 flex items-start sm:items-center gap-3 leading-tight">
            <span className="p-2 rounded-2xl bg-gradient-to-br from-rose-400 to-red-500 text-white shadow-lg shadow-red-500/30 ring-1 ring-inset ring-white/40 shrink-0">
              <ShieldAlert size={22} />
            </span>
            <span className="mt-1 sm:mt-0">Glassware & Equipment Breakage Logs</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
            Track damaged lab items, record breakage incidents, and manage replacement approvals.
          </p>
        </div>
        <Button
          onClick={() => setIsModalOpen(true)}
          className="w-full md:w-auto min-h-[44px] bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold px-5 rounded-full shadow-lg shadow-blue-500/30 ring-1 ring-inset ring-white/30 flex items-center justify-center gap-2 cursor-pointer transition-all hover:-translate-y-0.5 active:translate-y-0 flex-shrink-0"
        >
          <Plus size={18} />
          Report New Breakage
        </Button>
      </div>

      {/* Report Form Section */}
      {isModalOpen && (
        <div className="bg-blue-400/15 backdrop-blur-2xl p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-blue-400/40 ring-1 ring-inset ring-white/30 shadow-[0_8px_32px_rgba(59,130,246,0.12)] space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex justify-between items-center gap-3 border-b border-white/60 pb-3">
            <h3 className="text-sm font-semibold text-blue-900 flex items-start sm:items-center gap-2 leading-snug min-w-0">
              <AlertTriangle size={18} className="text-red-600 shrink-0 mt-0.5 sm:mt-0" />
              Log New Equipment or Glassware Breakage
            </h3>
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="shrink-0 min-h-[40px] sm:min-h-0 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white/50 hover:bg-white/80 border border-white/70 backdrop-blur-xl px-3.5 py-1 rounded-full transition-all cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 min-w-0">
              <label className="text-xs font-semibold text-slate-700">Damaged Item Name</label>
              <input
                type="text"
                placeholder="e.g. Glass Beaker, Test Tube, Pipette"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                className={glassField}
                required
              />
            </div>

            <div className="space-y-1.5 min-w-0">
              <label className="text-xs font-semibold text-slate-700">Quantity Damaged</label>
              <input
                type="number"
                inputMode="numeric"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className={glassField}
                required
              />
            </div>

            <div className="space-y-1.5 min-w-0">
              <label className="text-xs font-semibold text-slate-700">Reported By (Lab Tech)</label>
              <input
                type="text"
                placeholder="e.g. Chaminda Perera"
                value={reportedBy}
                onChange={(e) => setReportedBy(e.target.value)}
                className={glassField}
                required
              />
            </div>

            <div className="space-y-1.5 min-w-0">
              <label className="text-xs font-semibold text-slate-700">Reason / Incident Details</label>
              <input
                type="text"
                placeholder="e.g. Slipped during washing / High heat crack"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className={glassField}
                required
              />
            </div>

            <div className="sm:col-span-2 flex flex-col sm:flex-row sm:justify-end gap-2 pt-2">
              <Button
                type="submit"
                className="w-full sm:w-auto min-h-[44px] sm:min-h-0 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-sm sm:text-xs font-semibold px-5 rounded-full shadow-md shadow-blue-500/30 ring-1 ring-inset ring-white/30 cursor-pointer transition-all hover:-translate-y-0.5 active:translate-y-0"
              >
                Submit Breakage Log
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Phones: heading, then every log as its own separate card with a gap between them */}
      <div className="md:hidden space-y-3">
        <div className="px-1">
          <h3 className="text-base font-semibold tracking-tight text-slate-900">Recorded Breakage History</h3>
          <p className="text-xs text-slate-600 mt-0.5">Audit trail of all equipment and glassware damage incidents.</p>
        </div>

        {breakageLogs.map((log) => (
          <div
            key={log.id}
            className={`${glass} p-4 space-y-3 rounded-2xl border-l-4 ${statusBorder(log.status)}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5 min-w-0">
                <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm font-semibold text-slate-900 leading-snug break-words min-w-0">{log.itemName}</p>
              </div>
              <StatusBadge status={log.status} />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-2xl bg-white/50 border border-white/60 px-3 py-2.5 min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Quantity</p>
                <p className="text-lg font-bold text-slate-900">{log.quantity}</p>
              </div>
              <div className="rounded-2xl bg-white/50 border border-white/60 px-3 py-2.5 min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Date</p>
                <p className="text-sm font-bold text-slate-900 mt-1">{log.date}</p>
              </div>
            </div>

            <div className="text-xs space-y-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Reported By</p>
                <div className="flex items-start gap-1.5 mt-0.5 text-slate-700">
                  <User size={13} className="text-slate-500 shrink-0 mt-0.5" />
                  <span className="break-words">{log.reportedBy}</span>
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Incident Details</p>
                <p className="mt-0.5 text-slate-700 leading-relaxed break-words">{log.reason}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tablet / desktop: full table */}
      <div className={`hidden md:block ${glass} rounded-3xl overflow-hidden`}>
        <div className="p-5 border-b border-white/50">
          <h3 className="text-base font-semibold tracking-tight text-slate-900">Recorded Breakage History</h3>
          <p className="text-xs text-slate-600 mt-0.5">Audit trail of all equipment and glassware damage incidents.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/40 border-b border-white/60 text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                <th className="py-3.5 px-4 lg:px-6">Item Name</th>
                <th className="py-3.5 px-4 lg:px-6">Quantity</th>
                <th className="py-3.5 px-4 lg:px-6">Reported By</th>
                <th className="py-3.5 px-4 lg:px-6">Date</th>
                <th className="py-3.5 px-4 lg:px-6">Incident Details</th>
                <th className="py-3.5 px-4 lg:px-6">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/50 text-sm">
              {breakageLogs.map((log) => (
                <tr key={log.id} className="hover:bg-white/55 transition-all duration-200">
                  <td className="py-4 px-4 lg:px-6">
                    <div className="flex items-center gap-2.5 font-semibold text-slate-900">
                      <AlertTriangle size={18} className="text-red-500 flex-shrink-0" />
                      {log.itemName}
                    </div>
                  </td>
                  <td className="py-4 px-4 lg:px-6 font-bold text-slate-800">{log.quantity}</td>
                  <td className="py-4 px-4 lg:px-6 text-slate-600 text-xs whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <User size={13} className="text-slate-500 shrink-0" />
                      {log.reportedBy}
                    </div>
                  </td>
                  <td className="py-4 px-4 lg:px-6 text-slate-600 text-xs whitespace-nowrap">{log.date}</td>
                  <td className="py-4 px-4 lg:px-6 text-slate-600 text-xs min-w-[14rem]">{log.reason}</td>
                  <td className="py-4 px-4 lg:px-6 whitespace-nowrap">
                    <StatusBadge status={log.status} />
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