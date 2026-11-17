"use client";

import React, { useState } from "react";
import { Bell, AlertTriangle, CheckCircle, Package, FlaskConical, Trash2, CheckCheck, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminNotificationsPage() {
  // Filter state: All, Inventory, Tests, Equipment
  const [filterType, setFilterType] = useState("All");

  // Mock Notifications List
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      title: "Critical Chemical Stock Alert",
      description: "Aluminium Sulphate (Alum) stock has dropped to 15 Kg (Minimum threshold is 50 Kg). Immediate reorder required.",
      category: "Inventory",
      severity: "critical",
      time: "10 mins ago",
      read: false,
    },
    {
      id: 2,
      title: "Water Discharge Quality Warning",
      description: "Sample SMP-2026-086 recorded a high COD value of 95 mg/L exceeding permissible limits.",
      category: "Tests",
      severity: "warning",
      time: "2 hours ago",
      read: false,
    },
    {
      id: 3,
      title: "Glassware Breakage Logged",
      description: "Lab Technician Chaminda Perera logged the breakage of 2 Glass Beakers (500ml) at Kurunegala Lab.",
      category: "Equipment",
      severity: "info",
      time: "Yesterday",
      read: true,
    },
    {
      id: 4,
      title: "Low Chemical Warning",
      description: "Hydrochloric Acid (HCl) stock is running low (25 L remaining).",
      category: "Inventory",
      severity: "warning",
      time: "2 days ago",
      read: true,
    },
  ]);

  // Filter notifications based on selected category
  const filteredNotifications = notifications.filter(notif => {
    if (filterType === "All") return true;
    return notif.category === filterType;
  });

  // Mark single notification as read
  const markAsRead = (id: number) => {
    setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
  };

  // Mark all as read
  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  // Delete notification
  const deleteNotification = (id: number) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Bell className="text-blue-600" size={26} />
            System Notifications & Alerts Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Monitor real-time alerts regarding chemical inventories, water discharge test warnings, and equipment breakages.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={markAllAsRead}
            variant="outline" 
            className="flex items-center gap-1.5 text-slate-700 border-slate-300 hover:bg-slate-50 cursor-pointer text-xs"
          >
            <CheckCheck size={16} className="text-blue-600" />
            Mark All as Read
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-slate-500" />
          <span className="text-xs font-semibold text-slate-700">Filter by Category:</span>
          <div className="flex flex-wrap gap-1.5 ml-2">
            {["All", "Inventory", "Tests", "Equipment"].map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterType(cat)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  filterType === cat 
                    ? "bg-blue-600 text-white shadow-sm" 
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Unread alerts: <span className="font-bold text-blue-600">{notifications.filter(n => !n.read).length}</span>
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.map((notif) => (
          <div 
            key={notif.id} 
            className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${
              notif.read 
                ? "bg-white border-slate-200 shadow-sm" 
                : "bg-blue-50/50 border-blue-200 shadow-md ring-1 ring-blue-500/20"
            }`}
          >
            <div className="flex items-start gap-3.5">
              <div className={`p-2.5 rounded-xl border flex-shrink-0 mt-0.5 ${
                notif.severity === "critical" 
                  ? "bg-red-50 text-red-600 border-red-200" 
                  : notif.severity === "warning"
                  ? "bg-amber-50 text-amber-600 border-amber-200"
                  : "bg-blue-50 text-blue-600 border-blue-200"
              }`}>
                {notif.category === "Inventory" ? <Package size={20} /> : notif.category === "Tests" ? <FlaskConical size={20} /> : <AlertTriangle size={20} />}
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">{notif.title}</h3>
                  {!notif.read && (
                    <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                  )}
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                    {notif.category}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{notif.description}</p>
                <span className="text-[11px] text-slate-400 block">{notif.time}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              {!notif.read && (
                <button 
                  onClick={() => markAsRead(notif.id)}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1"
                >
                  <CheckCircle size={14} /> Mark Read
                </button>
              )}
              <button 
                onClick={() => deleteNotification(notif.id)}
                className="text-xs font-semibold text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-all cursor-pointer"
                title="Delete Notification"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}

        {filteredNotifications.length === 0 && (
          <div className="bg-white p-12 rounded-xl border border-slate-200 text-center text-slate-400 text-sm">
            No notifications found matching this category.
          </div>
        )}
      </div>
    </div>
  );
}