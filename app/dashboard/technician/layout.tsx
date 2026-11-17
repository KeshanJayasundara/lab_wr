"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FlaskConical, FileText, AlertTriangle, LogOut, X, Menu, Bell } from "lucide-react";

export default function TechnicianLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Lab Technician Navigation Items
  const navItems = [
    { name: "Dashboard", href: "/dashboard/technician", icon: LayoutDashboard },
    { name: "Testing", href: "/dashboard/technician/tests", icon: FlaskConical },
    { name: "Test History", href: "/dashboard/technician/history", icon: FileText },
    { name: "Breakage & Damage Logs", href: "/dashboard/technician/breakages", icon: AlertTriangle },
  ];

  return (
    // Colourful backdrop for the glass to blur
    <div className="relative isolate h-screen flex overflow-hidden bg-gradient-to-br from-sky-100 via-indigo-100 to-fuchsia-100">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-24 -left-16 h-96 w-96 rounded-full bg-blue-400/40 blur-3xl" />
        <div className="absolute top-1/3 -right-24 h-[28rem] w-[28rem] rounded-full bg-fuchsia-400/30 blur-3xl" />
        <div className="absolute -bottom-28 left-1/3 h-96 w-96 rounded-full bg-cyan-300/40 blur-3xl" />
      </div>

      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-40 lg:hidden animate-in fade-in duration-200"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Floating glass sidebar */}
      <aside
        className={`
          fixed inset-y-3 left-3 z-50 w-64 rounded-3xl flex flex-col overflow-hidden flex-shrink-0
          bg-white/40 backdrop-blur-2xl border border-white/60 ring-1 ring-inset ring-white/40
          shadow-[0_8px_32px_rgba(15,23,42,0.12)]
          transition-transform duration-300 ease-in-out
          lg:static lg:m-3 lg:h-[calc(100vh-1.5rem)] lg:translate-x-0
          ${sidebarOpen ? "translate-x-0" : "-translate-x-[110%]"}
        `}
      >
        {/* Sidebar Header with Logo & Brand Name */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-white/50 flex-shrink-0">
          <div className="flex items-center gap-3 group">
            <div className="w-9 h-9 bg-white/80 rounded-xl p-1 flex items-center justify-center shadow-sm ring-1 ring-inset ring-white/70 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
              <Image
                src="/logo.png"
                alt="NWSDB Logo"
                width={32}
                height={32}
                quality={100}
                unoptimized
                className="object-contain"
              />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900 tracking-wide">NWSDB</h1>
              <p className="text-[10px] text-blue-600 font-medium">Technician Portal</p>
            </div>
          </div>
          {/* Close button for mobile */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-slate-500 hover:text-slate-900 cursor-pointer transition-transform hover:rotate-90"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-5 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`group flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30 ring-1 ring-inset ring-white/30 font-semibold"
                    : "text-slate-700 hover:bg-white/60 hover:text-blue-700 hover:translate-x-1 hover:shadow-sm"
                }`}
              >
                <Icon
                  size={18}
                  className="transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-6"
                />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer / Logout */}
        <div className="p-3 border-t border-white/50 flex-shrink-0">
          <Link
            href="/login"
            className="group flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm font-medium text-red-600 hover:bg-red-500/10 hover:text-red-700 hover:translate-x-1 transition-all duration-200"
          >
            <LogOut size={18} className="transition-transform duration-200 group-hover:-translate-x-0.5 group-hover:scale-110" />
            Sign Out
          </Link>
        </div>
      </aside>

      {/* Main Content Area Wrapper (Scrollable independently) */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        {/* Glass header */}
        <header className="h-16 mx-3 mt-3 lg:ml-0 rounded-2xl bg-white/40 backdrop-blur-2xl border border-white/60 ring-1 ring-inset ring-white/40 shadow-[0_8px_32px_rgba(15,23,42,0.08)] flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30 flex-shrink-0">
          <div className="flex items-center gap-4 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-slate-600 hover:text-slate-900 p-1 rounded-lg hover:bg-white/60 cursor-pointer transition-all"
            >
              <Menu size={22} />
            </button>
            <h2 className="text-base sm:text-lg font-semibold text-slate-800 tracking-tight truncate">
              Kurunegala Water Treatment Plant - Lab Testing Hub
            </h2>
          </div>

          <div className="flex items-center gap-4">
            {/* Notification Bell */}
            <div className="relative p-2 text-slate-600 hover:text-blue-600 hover:bg-white/60 rounded-full transition-all cursor-pointer hover:scale-110">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-600 rounded-full ring-2 ring-white/70"></span>
            </div>

            {/* Lab Technician Profile Pill */}
            <div className="flex items-center gap-3 pl-3 border-l border-white/60">
              <div className="w-9 h-9 bg-gradient-to-br from-emerald-400 to-teal-600 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-md shadow-emerald-500/30 ring-1 ring-inset ring-white/40">
                LT
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-bold text-slate-800">Lab Technician</p>
                <p className="text-[10px] text-slate-600">technician@waterboard.lk</p>
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Page Content */}
        <main className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-6 bg-transparent">
          {children}
        </main>
      </div>
    </div>
  );
}