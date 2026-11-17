"use client";

import React, { useState } from "react";
import { Bell, AlertTriangle, CheckCircle, Package, ShieldAlert, CheckCheck, Filter, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// Shared "frosted glass" look (same as the other pages)
const glass =
  "bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_32px_rgba(15,23,42,0.10)] ring-1 ring-inset ring-white/40";

const categories = ["All", "Stock", "Breakage", "Restock"];

// Left accent stripe so each notification is easy to tell apart (colour = severity)
const severityBorder = (severity: string) =>
  severity === "critical" ? "border-l-red-400" : severity === "warning" ? "border-l-amber-400" : "border-l-blue-400";

export default function InventoryNotificationsPage() {
  const [filterType, setFilterType] = useState("All");

  // Mock Inventory Notifications
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      title: "Critical Chemical Stock Alert",
      description: "Aluminium Sulphate (Alum) stock has dropped to 18 Kg (Minimum threshold is 50 Kg). Reorder required immediately.",
      category: "Stock",
      severity: "critical",
      time: "15 mins ago",
      read: false,
    },
    {
      id: 2,
      title: "New Equipment Breakage Logged",
      description: "Lab Tech Chaminda Perera logged the breakage of 2 Glass Beakers (500ml). Verification pending.",
      category: "Breakage",
      severity: "warning",
      time: "3 hours ago",
      read: false,
    },
    {
      id: 3,
      title: "Low Stock Warning: Hydrochloric Acid",
      description: "Hydrochloric Acid (HCl 37%) is running low (25 Liters remaining).",
      category: "Stock",
      severity: "warning",
      time: "Yesterday",
      read: true,
    },
    {
      id: 4,
      title: "Stock Replenishment Successful",
      description: "Sodium Hydroxide (NaOH) stock was successfully updated (+50 Kg).",
      category: "Restock",
      severity: "info",
      time: "3 days ago",
      read: true,
    },
  ]);

  const filteredNotifications = notifications.filter(notif => {
    if (filterType === "All") return true;
    return notif.category === filterType;
  });

  const markAsRead = (id: number) => {
    setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const deleteNotification = (id: number) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  return (
    <div className="w-full min-w-0 space-y-4 sm:space-y-6">
      {/* Page Header */}
      <div className={`${glass} flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 p-4 sm:p-6 rounded-2xl sm:rounded-3xl`}>
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl font-semibold tracking-tight text-slate-900 flex items-start sm:items-center gap-3 leading-tight">
            <span className="p-2 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow-lg shadow-blue-500/30 ring-1 ring-inset ring-white/40 shrink-0">
              <Bell size={22} />
            </span>
            <span className="mt-1 sm:mt-0">Inventory Notifications & Alerts</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
            Real-time tracking of low chemical stocks, reorder alerts, and equipment breakage logs.
          </p>
        </div>
        <Button
          onClick={markAllAsRead}
          variant="outline"
          className="w-full md:w-auto min-h-[44px] justify-center flex items-center gap-1.5 text-slate-700 border-white/70 bg-white/60 hover:bg-white/90 backdrop-blur-xl rounded-full shadow-sm cursor-pointer text-sm sm:text-xs transition-all hover:-translate-y-0.5 flex-shrink-0"
        >
          <CheckCheck size={16} className="text-blue-600" />
          Mark All as Read
        </Button>
      </div>

      {/* Filter Toolbar */}
      <div className={`${glass} p-3 sm:p-4 rounded-2xl sm:rounded-3xl flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3 sm:gap-4`}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 min-w-0">
          <div className="flex items-center gap-2 shrink-0">
            <Filter size={16} className="text-blue-600" />
            <span className="text-xs font-semibold text-slate-700">Filter Category:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterType(cat)}
                className={`px-3.5 py-2 sm:py-1 min-h-[40px] sm:min-h-0 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer hover:-translate-y-0.5 ${
                  filterType === cat
                    ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md shadow-blue-500/30 ring-1 ring-inset ring-white/30"
                    : "bg-white/60 text-slate-600 border border-white/70 backdrop-blur-xl hover:bg-white/90 hover:text-blue-700"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="text-xs text-slate-600 font-medium">
          Unread alerts: <span className="font-bold text-blue-600">{notifications.filter(n => !n.read).length}</span>
        </div>
      </div>

      {/* Notifications List: every notification is its own card with a gap between them */}
      <div className="space-y-3">
        {filteredNotifications.map((notif) => (
          <div
            key={notif.id}
            className={`p-4 rounded-2xl sm:rounded-3xl backdrop-blur-2xl border border-l-4 ${severityBorder(notif.severity)} transition-all duration-300 hover:-translate-y-0.5 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3 md:gap-4 ${
              notif.read
                ? "bg-white/40 border-white/60 ring-1 ring-inset ring-white/40 shadow-[0_8px_32px_rgba(15,23,42,0.08)] hover:bg-white/55"
                : "bg-blue-400/15 border-blue-400/40 ring-1 ring-inset ring-white/40 shadow-[0_8px_32px_rgba(59,130,246,0.18)] hover:bg-blue-400/20"
            }`}
          >
            <div className="flex items-start gap-3 sm:gap-3.5 min-w-0">
              <div className={`p-2.5 rounded-2xl border backdrop-blur-xl flex-shrink-0 mt-0.5 ${
                notif.severity === "critical"
                  ? "bg-red-400/20 text-red-600 border-red-400/40"
                  : notif.severity === "warning"
                  ? "bg-amber-400/20 text-amber-600 border-amber-400/40"
                  : "bg-blue-400/20 text-blue-600 border-blue-400/40"
              }`}>
                {notif.category === "Stock" ? <Package size={20} /> : notif.category === "Breakage" ? <ShieldAlert size={20} /> : <AlertTriangle size={20} />}
              </div>

              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <h3 className="text-sm font-bold text-slate-900 leading-snug break-words min-w-0">{notif.title}</h3>
                  {!notif.read && (
                    <span className="w-2 h-2 rounded-full bg-blue-600 ring-2 ring-white/70 animate-pulse shrink-0" />
                  )}
                  <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-white/60 backdrop-blur-xl text-slate-600 border border-white/70 shrink-0">
                    {notif.category}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed break-words">{notif.description}</p>
                <span className="text-[11px] text-slate-500 block">{notif.time}</span>
              </div>
            </div>

            {/* Actions: full-width row on phones (easy to tap), compact on the right from md up */}
            <div className="flex items-center gap-2 md:self-center shrink-0">
              {!notif.read && (
                <button
                  onClick={() => markAsRead(notif.id)}
                  className="flex-1 md:flex-none min-h-[44px] md:min-h-0 justify-center text-sm md:text-xs font-semibold text-blue-700 hover:text-blue-800 bg-white/60 hover:bg-white/90 border border-white/70 backdrop-blur-xl px-3.5 py-2 md:py-1.5 rounded-full shadow-sm transition-all hover:-translate-y-0.5 cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle size={14} /> Mark Read
                </button>
              )}
              <button
                onClick={() => deleteNotification(notif.id)}
                aria-label="Delete notification"
                className={`min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 flex items-center justify-center text-slate-500 hover:text-red-600 p-2 rounded-full hover:bg-red-400/15 transition-all cursor-pointer hover:scale-110 ${
                  notif.read ? "ml-auto md:ml-0" : ""
                }`}
                title="Delete Notification"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}

        {filteredNotifications.length === 0 && (
          <div className={`${glass} p-8 sm:p-12 rounded-2xl sm:rounded-3xl text-center text-slate-500 text-sm`}>
            No inventory notifications found matching this filter.
          </div>
        )}
      </div>
    </div>
  );
}