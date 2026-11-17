import React from "react";
import Link from "next/link";
import { Menu, Bell } from "lucide-react";

interface HeaderProps {
  setSidebarOpen: (open: boolean) => void;
}

export function Header({ setSidebarOpen }: HeaderProps) {
  return (
    <header className="h-16 mx-3 mt-3 lg:ml-0 rounded-2xl bg-white/40 backdrop-blur-2xl border border-white/60 ring-1 ring-inset ring-white/40 shadow-[0_8px_32px_rgba(15,23,42,0.08)] flex items-center justify-between px-4 sm:px-6 sticky top-3 z-30">
      <div className="flex items-center gap-4 min-w-0">
        {/* Mobile Sidebar Toggle Button */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden text-slate-600 hover:text-slate-900 p-1 rounded-lg hover:bg-white/60 cursor-pointer transition-all"
        >
          <Menu size={22} />
        </button>
        <h2 className="text-base sm:text-lg font-semibold text-slate-800 tracking-tight truncate">
          Kurunegala Water Reclamation Plant
        </h2>
      </div>

      {/* Right Header Icons / Profile */}
      <div className="flex items-center gap-4">
        {/* Notification Bell with Badge linked to Notifications Center */}
        <Link
          href="/dashboard/admin/notifications"
          className="relative p-2 text-slate-600 hover:text-blue-600 hover:bg-white/60 rounded-full transition-all duration-200 hover:scale-110 cursor-pointer block"
          title="View Notifications"
        >
          <Bell size={20} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white/70 animate-pulse"></span>
        </Link>

        {/* Admin Profile Pill */}
        <div className="flex items-center gap-3 pl-3 border-l border-white/60">
          <div className="w-9 h-9 bg-gradient-to-br from-sky-400 to-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-md shadow-blue-500/30 ring-1 ring-inset ring-white/40">
            AD
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-bold text-slate-800">Super Admin</p>
            <p className="text-[10px] text-slate-600">admin@waterboard.lk</p>
          </div>
        </div>
      </div>
    </header>
  );
}