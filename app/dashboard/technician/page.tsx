"use client";

import React from "react";
import Link from "next/link";
import { FlaskConical, CheckCircle2, Clock, AlertTriangle, PlusCircle, FileText, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

// Shared "frosted glass" look (same as the other pages)
const glass =
  "bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_32px_rgba(15,23,42,0.10)] ring-1 ring-inset ring-white/40";

export default function TechnicianDashboard() {
  // Mock Summary Stats
  const stats = [
    { title: "Tests Completed Today", value: "12", icon: CheckCircle2, tile: "from-emerald-400 to-teal-500 shadow-emerald-500/30" },
    { title: "Pending Manager Review", value: "3", icon: Clock, tile: "from-amber-400 to-orange-500 shadow-amber-500/30" },
    { title: "Standard Range Alerts", value: "1", icon: AlertTriangle, tile: "from-rose-400 to-red-500 shadow-red-500/30" },
    { title: "Active Test Categories", value: "4", icon: FlaskConical, tile: "from-sky-400 to-blue-600 shadow-blue-500/30" },
  ];

  // Recent test submissions
  const recentTests = [
    { id: "TST-8902", category: "Physicochemical Analysis", sample: "Raw Water Intake - Point A", status: "Approved", time: "25 mins ago" },
    { id: "TST-8901", category: "Microbiological Test", sample: "Treated Water Reservoir", status: "Pending", time: "1 hour ago" },
    { id: "TST-8900", category: "Chemical & Heavy Metals", sample: "Distribution Line 4", status: "Approved", time: "3 hours ago" },
  ];

  return (
    <div className="w-full min-w-0 space-y-4 sm:space-y-6">
      {/* Welcome Banner (dark glass) */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl p-4 sm:p-8 text-white bg-gradient-to-br from-slate-900/85 via-blue-950/80 to-indigo-950/80 backdrop-blur-2xl border border-white/20 ring-1 ring-inset ring-white/10 shadow-[0_20px_60px_rgba(30,58,138,0.35)] flex flex-col md:flex-row justify-between items-stretch md:items-center gap-5 sm:gap-6">
        <div aria-hidden className="pointer-events-none absolute -top-20 -right-10 h-56 w-56 rounded-full bg-blue-500/30 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-24 left-10 h-48 w-48 rounded-full bg-fuchsia-500/20 blur-3xl" />

        <div className="relative space-y-3 min-w-0">
          {/* macOS-style window dots */}
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-[#ff5f57] shadow-inner" />
            <span className="h-3 w-3 rounded-full bg-[#febc2e] shadow-inner" />
            <span className="h-3 w-3 rounded-full bg-[#28c840] shadow-inner" />
          </div>
          <span className="inline-block max-w-full bg-white/10 backdrop-blur-xl text-blue-100 text-[11px] sm:text-xs font-semibold px-3 py-1 rounded-full border border-white/20">
            Kurunegala Water Reclamation Plant
          </span>
          <h1 className="text-lg sm:text-2xl font-semibold tracking-tight leading-snug">
            Welcome back, Lab Technician
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
            Record accurate water quality parameters, perform automated WHO standard validation, and submit test reports seamlessly.
          </p>
        </div>
        <Link href="/dashboard/technician/tests" className="relative block w-full md:w-auto shrink-0">
          <Button className="w-full md:w-auto min-h-[44px] justify-center bg-white/15 hover:bg-white/25 backdrop-blur-xl border border-white/30 text-white font-semibold text-sm px-5 py-2.5 rounded-full shadow-[0_8px_24px_rgba(37,99,235,0.35)] flex items-center gap-2 cursor-pointer transition-all hover:-translate-y-0.5">
            <PlusCircle size={18} /> Start New Test Entry
          </Button>
        </Link>
      </div>

      {/* Stats Grid: 2 columns on phones (icon on top), 4 on large screens */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div
              key={idx}
              className={`${glass} h-full min-w-0 p-4 sm:p-5 rounded-2xl sm:rounded-3xl flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/55`}
            >
              <div className={`shrink-0 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-gradient-to-br ${stat.tile} text-white shadow-lg ring-1 ring-inset ring-white/40 sm:order-2`}>
                <Icon className="w-5 h-5 sm:w-[22px] sm:h-[22px]" />
              </div>
              <div className="min-w-0 w-full sm:w-auto sm:flex-1 sm:order-1">
                <p className="text-xs font-medium text-slate-600 leading-snug break-words">{stat.title}</p>
                <h3 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900 mt-1">{stat.value}</h3>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions & Recent Tests Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Recent Submissions */}
        <div className={`${glass} lg:col-span-2 min-w-0 p-4 sm:p-6 rounded-2xl sm:rounded-3xl space-y-4`}>
          <div className="flex justify-between items-center gap-3">
            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2 min-w-0">
              <FileText size={18} className="text-blue-600 shrink-0" /> Recent Test Submissions
            </h2>
            <Link
              href="/dashboard/technician/history"
              className="shrink-0 min-h-[40px] sm:min-h-0 text-xs font-semibold text-blue-700 hover:text-blue-900 flex items-center gap-1 bg-white/50 hover:bg-white/80 border border-white/70 backdrop-blur-xl px-3.5 py-1.5 rounded-full transition-all"
            >
              View All <ArrowRight size={14} />
            </Link>
          </div>

          {/* Every submission is its own card with a gap between them; left border = status */}
          <div className="space-y-2.5">
            {recentTests.map((test) => (
              <div
                key={test.id}
                className={`p-3.5 rounded-2xl bg-white/45 hover:bg-white/70 border border-white/60 border-l-4 ${
                  test.status === "Approved" ? "border-l-emerald-400" : "border-l-amber-400"
                } backdrop-blur-xl flex items-start justify-between gap-3 transition-all`}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-xs font-bold text-slate-900">{test.id}</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/60 border border-white/70 text-slate-600">
                      {test.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed break-words">
                    {test.sample} • <span className="text-slate-500 whitespace-nowrap">{test.time}</span>
                  </p>
                </div>
                <span
                  className={`shrink-0 text-xs font-semibold px-3 py-1 rounded-full backdrop-blur-xl border whitespace-nowrap ${
                    test.status === "Approved"
                      ? "bg-emerald-400/20 text-emerald-700 border-emerald-400/40"
                      : "bg-amber-400/20 text-amber-700 border-amber-400/40"
                  }`}
                >
                  {test.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Testing Categories Shortcut */}
        <div className={`${glass} min-w-0 p-4 sm:p-6 rounded-2xl sm:rounded-3xl space-y-4`}>
          <h2 className="text-sm font-semibold text-slate-900">Testing Categories</h2>
          <div className="space-y-2.5">
            {[
              { name: "Physicochemical Analysis", desc: "pH, Turbidity, Conductivity, TDS" },
              { name: "Microbiological Testing", desc: "Coliform & E. coli presence count" },
              { name: "Chemical & Residuals", desc: "Residual Chlorine, Alum dosage, Fluoride" },
            ].map((cat, i) => (
              <Link
                key={i}
                href="/dashboard/technician/tests"
                className="block min-h-[52px] p-3.5 rounded-2xl bg-white/45 hover:bg-white/75 border border-white/60 backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:shadow-lg cursor-pointer group"
              >
                <h3 className="text-xs font-semibold text-slate-800 group-hover:text-blue-700">{cat.name}</h3>
                <p className="text-[11px] sm:text-[10px] text-slate-600 mt-0.5 leading-snug">{cat.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}