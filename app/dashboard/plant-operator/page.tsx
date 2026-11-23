"use client";

import React from "react";
import Link from "next/link";
import { Truck, Droplets, ArrowRight } from "lucide-react";

// Shared "frosted glass" look (same as the other pages)
const glass =
  "bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_32px_rgba(15,23,42,0.10)] ring-1 ring-inset ring-white/40";

export default function PlantOperatorDashboard() {
  const sections = [
    {
      title: "Gali",
      desc: "Register Gali vehicles and run the daily ES / PH check with approve or reject.",
      href: "/dashboard/plant-operator/gali",
      icon: Truck,
      tile: "from-emerald-400 to-teal-500 shadow-emerald-500/30",
    },
    {
      title: "Tank Operator",
      desc: "Tank operator section.",
      href: "/dashboard/plant-operator/tank-operator",
      icon: Droplets,
      tile: "from-sky-400 to-blue-600 shadow-blue-500/30",
    },
  ];

  return (
    <div className="w-full min-w-0 space-y-4 sm:space-y-6">
      {/* Welcome Banner (dark glass) */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl p-4 sm:p-8 text-white bg-gradient-to-br from-slate-900/85 via-blue-950/80 to-indigo-950/80 backdrop-blur-2xl border border-white/20 ring-1 ring-inset ring-white/10 shadow-[0_20px_60px_rgba(30,58,138,0.35)]">
        <div aria-hidden className="pointer-events-none absolute -top-20 -right-10 h-56 w-56 rounded-full bg-blue-500/30 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-24 left-10 h-48 w-48 rounded-full bg-fuchsia-500/20 blur-3xl" />

        <div className="relative space-y-3 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-[#ff5f57] shadow-inner" />
            <span className="h-3 w-3 rounded-full bg-[#febc2e] shadow-inner" />
            <span className="h-3 w-3 rounded-full bg-[#28c840] shadow-inner" />
          </div>
          <span className="inline-block max-w-full bg-white/10 backdrop-blur-xl text-blue-100 text-[11px] sm:text-xs font-semibold px-3 py-1 rounded-full border border-white/20">
            Kurunegala Water Reclamation Plant
          </span>
          <h1 className="text-lg sm:text-2xl font-semibold tracking-tight leading-snug">
            Welcome back, Plant Operator
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
            Use the side menu to open the Gali section or the Tank Operator section.
          </p>
        </div>
      </div>

      {/* Section cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {sections.map((s) => {
          const Icon = s.icon;
          return (
            <Link
              key={s.title}
              href={s.href}
              className={`${glass} group rounded-2xl p-5 flex items-center gap-4 transition-all hover:-translate-y-0.5 hover:bg-white/60`}
            >
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${s.tile} text-white flex items-center justify-center shadow-lg shrink-0`}>
                <Icon size={22} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-base font-semibold text-slate-800">{s.title}</p>
                <p className="text-xs text-slate-600 mt-0.5">{s.desc}</p>
              </div>
              <ArrowRight size={18} className="text-slate-500 transition-transform group-hover:translate-x-1" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}