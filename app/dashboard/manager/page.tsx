"use client";

import React from "react";
import Link from "next/link";
import { CheckSquare, FileSpreadsheet, ShieldAlert, CheckCircle2, Clock, AlertTriangle, TrendingUp, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

// Shared "frosted glass" look used by every card
const glass =
  "bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_32px_rgba(15,23,42,0.10)] ring-1 ring-inset ring-white/40";

export default function ManagerDashboard() {
  const stats = [
    { title: "Pending Test Verifications", value: "3", icon: Clock, tile: "from-amber-400 to-orange-500 shadow-amber-500/30" },
    { title: "Approved & Certified Today", value: "14", icon: CheckCircle2, tile: "from-emerald-400 to-teal-500 shadow-emerald-500/30" },
    { title: "Critical Range Alerts", value: "1", icon: AlertTriangle, tile: "from-rose-400 to-red-500 shadow-red-500/30" },
    { title: "Overall Plant Compliance", value: "99.4%", icon: TrendingUp, tile: "from-sky-400 to-blue-600 shadow-blue-500/30" },
  ];

  const pendingQueue = [
    { id: "TST-8902", technician: "Chaminda P.", category: "Physicochemical", sample: "Raw Water Intake - Point A", status: "Pass" },
    { id: "TST-8901", technician: "Nimal S.", category: "Microbiological", sample: "Treated Water Reservoir", status: "Pass" },
    { id: "TST-8899", technician: "Chaminda P.", category: "Physicochemical", sample: "Coagulation Basin Output", status: "Critical" },
  ];

  return (
    // Colourful backdrop so the glass has something to blur (remove this wrapper's gradient/blobs if your layout already has a background)
    <div className="relative isolate overflow-hidden rounded-3xl sm:rounded-[2rem] p-3 sm:p-6 bg-gradient-to-br from-sky-100 via-indigo-100 to-fuchsia-100">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-24 -left-16 h-80 w-80 rounded-full bg-blue-400/40 blur-3xl" />
        <div className="absolute top-1/3 -right-20 h-96 w-96 rounded-full bg-fuchsia-400/30 blur-3xl" />
        <div className="absolute -bottom-24 left-1/3 h-80 w-80 rounded-full bg-cyan-300/40 blur-3xl" />
      </div>

      <div className="space-y-4 sm:space-y-6">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-3xl p-5 sm:p-8 text-white bg-gradient-to-br from-slate-900/85 via-blue-950/80 to-indigo-950/80 backdrop-blur-2xl border border-white/20 ring-1 ring-inset ring-white/10 shadow-[0_20px_60px_rgba(30,58,138,0.35)] flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-5 sm:gap-6">
          <div aria-hidden className="pointer-events-none absolute -top-20 -right-10 h-56 w-56 rounded-full bg-blue-500/30 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute -bottom-24 left-10 h-48 w-48 rounded-full bg-fuchsia-500/20 blur-3xl" />

          <div className="relative space-y-3 min-w-0">
            {/* macOS-style window dots */}
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-[#ff5f57] shadow-inner" />
              <span className="h-3 w-3 rounded-full bg-[#febc2e] shadow-inner" />
              <span className="h-3 w-3 rounded-full bg-[#28c840] shadow-inner" />
            </div>
            <span className="inline-block bg-white/10 backdrop-blur-xl text-blue-100 text-[11px] sm:text-xs font-semibold leading-snug px-3 py-1.5 sm:py-1 rounded-2xl sm:rounded-full border border-white/20">
              Kurunegala Water Reclamation Plant • Executive Quality Control
            </span>
            <h1 className="text-lg sm:text-2xl font-semibold tracking-tight leading-tight">
              Welcome back, Lab Manager / Chemist
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
              Review technician submissions, verify WHO standard compliance, execute bulk approvals, and export official certified plant reports.
            </p>
          </div>
          <Link href="/dashboard/manager/verify" className="relative block w-full sm:w-auto shrink-0">
            <Button className="w-full sm:w-auto justify-center bg-white/15 hover:bg-white/25 backdrop-blur-xl border border-white/30 text-white font-semibold text-sm px-5 py-3 sm:py-2.5 rounded-full shadow-[0_8px_24px_rgba(37,99,235,0.35)] flex items-center gap-2 cursor-pointer transition-all hover:-translate-y-0.5">
              <CheckSquare size={18} />
              <span className="sm:hidden">Verification Queue (3)</span>
              <span className="hidden sm:inline">Open Verification Queue (3)</span>
            </Button>
          </Link>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {stats.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <div
                key={idx}
                className={`${glass} p-4 sm:p-5 rounded-3xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 transition-all hover:-translate-y-0.5 hover:bg-white/55`}
              >
                <div className="min-w-0 order-2 sm:order-1">
                  <p className="text-[11px] sm:text-xs font-medium text-slate-600 leading-snug">{stat.title}</p>
                  <h3 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900 mt-1">{stat.value}</h3>
                </div>
                <div
                  className={`order-1 sm:order-2 self-start sm:self-auto shrink-0 p-2.5 sm:p-3 rounded-2xl bg-gradient-to-br ${stat.tile} text-white shadow-lg ring-1 ring-inset ring-white/40`}
                >
                  <Icon size={20} className="sm:hidden" />
                  <Icon size={22} className="hidden sm:block" />
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Pending queue */}
          <div className={`${glass} lg:col-span-2 p-4 sm:p-6 rounded-3xl space-y-4`}>
            <div className="flex flex-wrap justify-between items-center gap-2">
              <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Clock size={18} className="text-blue-600" /> Pending Verification Queue
              </h2>
              <Link
                href="/dashboard/manager/verify"
                className="text-xs font-semibold text-blue-700 hover:text-blue-900 flex items-center gap-1 bg-white/50 hover:bg-white/80 border border-white/70 backdrop-blur-xl px-3.5 py-2 sm:py-1.5 rounded-full transition-all"
              >
                View All <ArrowRight size={14} />
              </Link>
            </div>

            <div className="space-y-2">
              {pendingQueue.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-2xl bg-white/45 hover:bg-white/70 border border-white/60 backdrop-blur-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 transition-all"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-xs font-bold text-slate-900">{item.id}</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/60 border border-white/70 text-slate-600">
                        {item.category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 sm:mt-0.5 break-words">
                      {item.sample} • <span className="text-slate-500">By {item.technician}</span>
                    </p>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-3 sm:pt-0 border-t border-white/60 sm:border-0">
                    <span
                      className={`text-xs font-semibold px-3 py-1 rounded-full backdrop-blur-xl border ${
                        item.status === "Pass"
                          ? "bg-emerald-400/20 text-emerald-700 border-emerald-400/40"
                          : "bg-red-400/20 text-red-700 border-red-400/40"
                      }`}
                    >
                      {item.status}
                    </span>
                    <Link href="/dashboard/manager/verify">
                      <Button
                        variant="outline"
                        className="h-10 sm:h-8 px-5 sm:px-4 text-xs font-semibold text-blue-700 border-white/70 bg-white/60 hover:bg-white/90 backdrop-blur-xl rounded-full cursor-pointer shadow-sm"
                      >
                        Verify
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Analytics & reports */}
          <div className={`${glass} p-4 sm:p-6 rounded-3xl space-y-4`}>
            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <TrendingUp size={18} className="text-blue-600" /> Plant Analytics & Reports
            </h2>
            <p className="text-xs text-slate-600">
              Access monthly water quality compliance analytics, turbidity trend graphs, and export official PDF certificates.
            </p>
            <div className="space-y-2 pt-2">
              <Link
                href="/dashboard/manager/reports"
                className="flex items-center gap-3 p-3.5 min-h-[56px] rounded-2xl bg-white/45 hover:bg-white/75 border border-white/60 backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:shadow-lg cursor-pointer group"
              >
                <div className="p-2 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow-md shadow-blue-500/30 ring-1 ring-inset ring-white/40 shrink-0">
                  <FileSpreadsheet size={16} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs font-semibold text-slate-800 group-hover:text-blue-700">Reports & Export Hub</h3>
                  <p className="text-[10px] text-slate-600 mt-0.5">Filter by week/month and download official PDF / Excel sheets</p>
                </div>
              </Link>
              <Link
                href="/dashboard/manager/breakages"
                className="flex items-center gap-3 p-3.5 min-h-[56px] rounded-2xl bg-white/45 hover:bg-white/75 border border-white/60 backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:shadow-lg cursor-pointer group"
              >
                <div className="p-2 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md shadow-amber-500/30 ring-1 ring-inset ring-white/40 shrink-0">
                  <ShieldAlert size={16} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs font-semibold text-slate-800 group-hover:text-blue-700">Breakage Monitoring</h3>
                  <p className="text-[10px] text-slate-600 mt-0.5">Track lab asset losses reported by technicians</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}