"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  FileText, 
  Package, 
  BarChart3, 
  FileSpreadsheet,
  Users, 
  Settings, 
  LogOut, 
  X 
} from "lucide-react";

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export function Sidebar({ sidebarOpen, setSidebarOpen }: SidebarProps) {
  const pathname = usePathname();

  const navItems = [
    { name: "Dashboard", href: "/dashboard/admin", icon: LayoutDashboard },
    { name: "Test Records", href: "/dashboard/admin/tests", icon: FileText },
    { name: "Inventory", href: "/dashboard/admin/inventory", icon: Package },
    { name: "Reports & Exports", href: "/dashboard/admin/reports", icon: FileSpreadsheet },
    { name: "Analytics & Trends", href: "/dashboard/admin/analytics", icon: BarChart3 },
    { name: "User Management", href: "/dashboard/admin/users", icon: Users },
    { name: "System Settings", href: "/dashboard/admin/settings", icon: Settings },
  ];

  return (
    <>
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-40 lg:hidden animate-in fade-in duration-200"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Floating glass sidebar for Desktop & Mobile */}
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
              <p className="text-[10px] text-blue-600 font-medium">Super Admin Portal</p>
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
    </>
  );
}