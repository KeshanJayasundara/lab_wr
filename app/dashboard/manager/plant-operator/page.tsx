// >>> SAVE AS: app/dashboard/manager/plant-operator/page.tsx   (UPDATED - replace the whole file) - delete this line after saving <<<
"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Droplets, HardHat, Truck } from "lucide-react";
import { glass, PageTitle } from "@/components/manager/plant/ui";

const sections = [
  {
    title: "Gali Operator",
    desc: "ES / PH parameters & ranges, daily data and monthly report.",
    href: "/dashboard/manager/plant-operator/gali",
    icon: Truck,
    tile: "from-emerald-400 to-teal-500 shadow-emerald-500/30",
  },
  {
    title: "Tank Operator",
    desc: "Tanks, check parameters, shifts, daily data and monthly report.",
    href: "/dashboard/manager/plant-operator/tank",
    icon: Droplets,
    tile: "from-sky-400 to-blue-600 shadow-blue-500/30",
  },
];

export default function PlantOperatorHub() {
  return (
    <div className="w-full min-w-0 space-y-4 sm:space-y-6">
      <PageTitle icon={<HardHat size={20} />} title="Plant Operator" sub="Select a duty to manage." tile="from-indigo-400 to-blue-600 shadow-blue-500/30" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {sections.map((s) => {
          const Icon = s.icon;
          return (
            <Link key={s.title} href={s.href} className={`${glass} group rounded-2xl p-5 flex items-center gap-4 transition-all hover:-translate-y-0.5 hover:bg-white/60`}>
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${s.tile} text-white flex items-center justify-center shadow-lg shrink-0`}><Icon size={22} /></div>
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