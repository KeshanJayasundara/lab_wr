import React from "react";
import { StatsCard } from "@/components/admin/StatsCard";
import { FileText, Package, AlertTriangle, Users } from "lucide-react";

// Shared "frosted glass" look (same as the other pages)
const glass =
  "bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_32px_rgba(15,23,42,0.10)] ring-1 ring-inset ring-white/40";

export default function AdminDashboardPage() {
  return (
    <div className="w-full min-w-0 space-y-4 sm:space-y-6">
      {/* Welcome Banner */}
      <div
        className={`${glass} p-4 sm:p-6 rounded-2xl sm:rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-3 sm:gap-4`}
      >
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl font-semibold tracking-tight text-slate-900 leading-snug break-words">
            Welcome back, Super Admin 👋
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
            Here is the live overview of Kurunegala Water Reclamation Plant operations.
          </p>
        </div>
        <div className="shrink-0 w-full min-[480px]:w-auto text-center bg-emerald-400/20 text-emerald-700 backdrop-blur-xl px-4 py-2 sm:py-1.5 rounded-full text-xs font-semibold border border-emerald-400/40 shadow-sm">
          System Status: Operational 🟢
        </div>
      </div>

      {/* Quick Stats Grid using Reusable StatsCard Component */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatsCard
          title="Today's Total Tests"
          value="24"
          subtext="↑ 12% from yesterday"
          subtextClass="text-emerald-600"
          icon={FileText}
        />
        <StatsCard
          title="Active Chemicals"
          value="18"
          subtext="All stocks tracked"
          subtextClass="text-slate-500"
          icon={Package}
        />
        <StatsCard
          title="Low Stock Alerts"
          value="2"
          subtext="Requires attention"
          subtextClass="text-red-500"
          icon={AlertTriangle}
        />
        <StatsCard
          title="System Users"
          value="9"
          subtext="Across 4 roles"
          subtextClass="text-blue-600"
          icon={Users}
        />
      </div>

      {/* Notice / Quick Action Section */}
      <div
        className={`${glass} p-4 sm:p-6 rounded-2xl sm:rounded-3xl transition-all duration-300 hover:bg-white/55`}
      >
        <h3 className="text-sm font-semibold text-slate-800 mb-2 sm:mb-3">Quick System Overview</h3>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
          You can use the sidebar navigation to view all daily test records, track chemical inventory levels,
          analyze trends via reports, and manage user accounts.
        </p>
      </div>
    </div>
  );
}