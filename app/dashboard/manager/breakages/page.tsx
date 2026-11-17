"use client";

import React, { useEffect, useState } from "react";
import { ShieldAlert, CheckCircle2, Clock, X, User, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";

// Shared "frosted glass" look (same as the dashboard, layout, verify and reports pages)
const glass =
  "bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_32px_rgba(15,23,42,0.10)] ring-1 ring-inset ring-white/40";

const btnPrimary =
  "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-full cursor-pointer shadow-md shadow-blue-500/30 ring-1 ring-inset ring-white/30 transition-all hover:-translate-y-0.5 active:translate-y-0";

const btnGlass =
  "text-slate-700 border-white/70 bg-white/60 hover:bg-white/90 backdrop-blur-xl rounded-full cursor-pointer shadow-sm transition-all hover:-translate-y-0.5";

const severityClass = (severity: string) =>
  severity === "Moderate"
    ? "bg-blue-500/15 text-blue-700 border-blue-400/40"
    : "bg-white/60 text-slate-600 border-white/70";

const statusClass = (status: string) =>
  status === "Resolved"
    ? "bg-emerald-400/20 text-emerald-700 border-emerald-400/40"
    : "bg-amber-400/20 text-amber-700 border-amber-400/40";

type Incident = {
  id: string;
  item: string;
  qty: number;
  tech: string;
  severity: string;
  date: string;
  status: string;
};

export default function ManagerBreakagesPage() {
  const [breakages, setBreakages] = useState<Incident[]>([
    { id: "BRK-401", item: "Glass Beaker (500ml)", qty: 2, tech: "Chaminda P.", severity: "Moderate", date: "Nov 4, 2026", status: "Pending" },
    { id: "BRK-400", item: "Glass Pipette (10ml)", qty: 1, tech: "Nimal S.", severity: "Minor", date: "Nov 2, 2026", status: "Resolved" },
  ]);

  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenModal = (incident: Incident) => {
    setSelectedIncident(incident);
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  const handleConfirmResolve = () => {
    if (!selectedIncident) return;
    setBreakages(breakages.map((b) => (b.id === selectedIncident.id ? { ...b, status: "Resolved" } : b)));
    setIsModalOpen(false);
    alert(`Incident ${selectedIncident.id} has been successfully marked as Resolved and synced with inventory records.`);
  };

  // Lock page scroll behind the modal + close on Esc
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

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Page Header */}
      <div className={`${glass} p-4 sm:p-6 rounded-3xl`}>
        <h1 className="text-lg sm:text-2xl font-semibold tracking-tight text-slate-900 flex items-start sm:items-center gap-3 leading-tight">
          <span className="p-2 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-500/30 ring-1 ring-inset ring-white/40 shrink-0">
            <ShieldAlert size={22} />
          </span>
          <span className="mt-1 sm:mt-0">Breakage & Asset Loss Monitoring</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 mt-2">
          Review lab equipment breakages reported by technicians and mark incidents as resolved.
        </p>
      </div>

      {/* Breakage Table (desktop / large tablet) */}
      <div className={`${glass} hidden lg:block rounded-3xl overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/40 border-b border-white/60 text-slate-600 text-[11px] font-bold uppercase tracking-wider">
                <th className="py-3.5 px-4">Incident ID</th>
                <th className="py-3.5 px-4">Damaged Item</th>
                <th className="py-3.5 px-4">Quantity</th>
                <th className="py-3.5 px-4">Reporting Technician</th>
                <th className="py-3.5 px-4">Severity</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/50 text-xs text-slate-700">
              {breakages.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500">
                    No breakage incidents reported.
                  </td>
                </tr>
              )}
              {breakages.map((item) => (
                <tr key={item.id} className="hover:bg-white/55 transition-all duration-200">
                  <td className="py-3.5 px-4 font-bold text-slate-900">{item.id}</td>
                  <td className="py-3.5 px-4 font-semibold text-slate-800">{item.item}</td>
                  <td className="py-3.5 px-4 font-bold">{item.qty}</td>
                  <td className="py-3.5 px-4 text-slate-600">{item.tech}</td>
                  <td className="py-3.5 px-4">
                    <span className={`font-semibold px-2.5 py-0.5 rounded-full text-[10px] backdrop-blur-xl border ${severityClass(item.severity)}`}>
                      {item.severity}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold backdrop-blur-xl border ${statusClass(item.status)}`}>
                      {item.status === "Resolved" ? <CheckCircle2 size={13} /> : <Clock size={13} />}
                      {item.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    {item.status !== "Resolved" && (
                      <Button
                        onClick={() => handleOpenModal(item)}
                        className={`${btnPrimary} h-8 px-4 text-xs`}
                      >
                        Mark Resolved
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Breakage Cards (mobile / tablet) */}
      <div className="lg:hidden space-y-3">
        {breakages.length === 0 && (
          <div className={`${glass} rounded-3xl py-10 px-4 text-center text-xs text-slate-500`}>
            No breakage incidents reported.
          </div>
        )}
        {breakages.map((item) => (
          <div key={item.id} className={`${glass} rounded-3xl p-4 space-y-3`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[11px] font-bold text-slate-500">{item.id}</div>
                <h3 className="text-sm font-semibold text-slate-900 break-words">{item.item}</h3>
              </div>
              <span
                className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold backdrop-blur-xl border ${statusClass(item.status)}`}
              >
                {item.status === "Resolved" ? <CheckCircle2 size={13} /> : <Clock size={13} />}
                {item.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs text-slate-600">
              <div className="flex items-center gap-1.5 min-w-0">
                <User size={13} className="text-blue-600 shrink-0" />
                <span className="truncate">{item.tech}</span>
              </div>
              <div className="flex items-center gap-1.5 min-w-0">
                <CalendarDays size={13} className="text-blue-600 shrink-0" />
                <span className="truncate">{item.date}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Qty</span>
                <strong className="text-slate-900">{item.qty}</strong>
              </div>
              <div>
                <span
                  className={`font-semibold px-2.5 py-0.5 rounded-full text-[10px] backdrop-blur-xl border ${severityClass(item.severity)}`}
                >
                  {item.severity}
                </span>
              </div>
            </div>

            {item.status !== "Resolved" && (
              <div className="pt-3 border-t border-white/60">
                <Button
                  onClick={() => handleOpenModal(item)}
                  className={`${btnPrimary} w-full h-11 text-xs justify-center`}
                >
                  Mark Resolved
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Resolve Confirmation Modal (glass, bottom sheet on phones) */}
      {isModalOpen && selectedIncident && (
        <div
          className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in duration-200"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="resolve-modal-title"
            className="bg-white/70 backdrop-blur-2xl border border-white/70 ring-1 ring-inset ring-white/50 shadow-[0_24px_60px_rgba(15,23,42,0.25)] rounded-t-3xl sm:rounded-3xl max-w-md w-full max-h-[92dvh] sm:max-h-[90vh] flex flex-col animate-in zoom-in-95 fade-in duration-200"
          >
            {/* Header */}
            <div className="flex justify-between items-start gap-3 p-4 sm:p-6 pb-3 border-b border-white/60">
              <h3
                id="resolve-modal-title"
                className="text-base font-semibold tracking-tight text-slate-900 min-w-0 break-words"
              >
                Mark Breakage Incident as Resolved
              </h3>
              <button
                type="button"
                onClick={closeModal}
                aria-label="Close"
                className="text-slate-500 hover:text-slate-800 hover:bg-white/70 p-1.5 -m-1.5 rounded-full cursor-pointer transition-all hover:rotate-90 shrink-0"
              >
                <X size={20} />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto overscroll-contain px-4 sm:px-6 py-4 space-y-3 text-xs text-slate-600">
              <p>You are about to verify and close this equipment damage report.</p>
              <div className="bg-white/50 backdrop-blur-xl p-3.5 rounded-2xl border border-white/70 space-y-2">
                <div className="flex justify-between gap-3">
                  <strong className="text-slate-800 shrink-0">Incident ID</strong>
                  <span className="text-right">{selectedIncident.id}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <strong className="text-slate-800 shrink-0">Damaged Item</strong>
                  <span className="text-right break-words min-w-0">{selectedIncident.item}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <strong className="text-slate-800 shrink-0">Quantity</strong>
                  <span className="text-right">{selectedIncident.qty} Units</span>
                </div>
                <div className="flex justify-between gap-3">
                  <strong className="text-slate-800 shrink-0">Reported By</strong>
                  <span className="text-right break-words min-w-0">{selectedIncident.tech}</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 italic">
                * Note: Marking this resolved will clear the incident from your active review queue and log it into the permanent plant audit trail.
              </p>
            </div>

            {/* Footer */}
            <div className="grid grid-cols-2 sm:flex sm:justify-end gap-2 px-4 sm:px-6 pt-3 sm:pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-6 border-t border-white/60">
              <Button
                variant="outline"
                onClick={closeModal}
                className={`${btnGlass} h-11 sm:h-9 text-xs font-semibold`}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmResolve}
                className={`${btnPrimary} h-11 sm:h-9 text-xs justify-center`}
              >
                <span className="sm:hidden">Mark Resolved</span>
                <span className="hidden sm:inline">Confirm & Mark Resolved</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}