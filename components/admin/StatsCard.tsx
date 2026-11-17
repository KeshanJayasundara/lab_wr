import React from "react";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtext: string;
  subtextClass?: string;
  icon?: LucideIcon;
}

export function StatsCard({ title, value, subtext, subtextClass = "text-emerald-600", icon: Icon }: StatsCardProps) {
  return (
    <div
      className="h-full w-full min-w-0 bg-white/40 backdrop-blur-2xl border border-white/60 ring-1 ring-inset ring-white/40 shadow-[0_8px_32px_rgba(15,23,42,0.10)] p-4 sm:p-5 rounded-2xl sm:rounded-3xl
      flex flex-col items-start gap-3
      sm:flex-row sm:items-center sm:justify-between
      transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/55"
    >
      {/* Phone: icon on top. sm and up: icon on the right */}
      {Icon && (
        <div className="shrink-0 p-2.5 sm:p-3 bg-gradient-to-br from-sky-400 to-blue-600 text-white rounded-xl sm:rounded-2xl shadow-lg shadow-blue-500/30 ring-1 ring-inset ring-white/40 sm:order-2">
          <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
      )}

      <div className="min-w-0 w-full sm:w-auto sm:flex-1 sm:order-1">
        <p className="text-xs font-medium text-slate-600 leading-snug break-words">{title}</p>
        <h3 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900 mt-1.5 sm:mt-2 break-words">
          {value}
        </h3>
        <p className={`text-[11px] sm:text-[10px] font-semibold mt-1 leading-snug break-words ${subtextClass}`}>
          {subtext}
        </p>
      </div>
    </div>
  );
}