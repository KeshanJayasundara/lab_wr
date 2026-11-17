"use client";

import React, { useState } from "react";
import { Settings, Shield, Bell, Database, Save, CheckCircle2, Sliders, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

// Shared "frosted glass" look (same as the other pages)
const glass =
  "bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_32px_rgba(15,23,42,0.10)] ring-1 ring-inset ring-white/40";

// Glass text / number input
// Phones: 16px text (stops iOS zoom-on-focus) + 44px tap height. sm and up: compact.
const glassInput =
  "w-full px-3.5 py-2.5 min-h-[44px] sm:min-h-0 rounded-2xl border border-white/70 bg-white/60 hover:bg-white/80 backdrop-blur-xl text-base sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 shadow-sm " +
  "transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:bg-white/90";

// macOS-style toggle switch (still a real checkbox underneath)
function GlassToggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer p-3 min-h-[52px] rounded-2xl bg-white/40 hover:bg-white/65 border border-white/60 backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5">
      <span className="relative inline-flex h-6 w-11 flex-shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <span className="absolute inset-0 rounded-full bg-slate-300/80 shadow-inner transition-colors duration-300 peer-checked:bg-emerald-500 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500/60" />
        <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-300 peer-checked:translate-x-5" />
      </span>
      <span className="min-w-0 flex-1 text-sm font-medium text-slate-700 leading-snug break-words">{label}</span>
    </label>
  );
}

// Section title row used by every card
function SectionTitle({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 pb-3 border-b border-white/50 text-slate-900 font-semibold">
      <Icon className="text-blue-600 shrink-0" size={20} />
      <h2 className="text-sm sm:text-base leading-snug break-words min-w-0">{title}</h2>
    </div>
  );
}

export default function AdminSettingsPage() {
  // Facility Settings State
  const [facilityName, setFacilityName] = useState("NWSDB Regional Water Reclamation Facility - Kurunegala");
  const [labChief, setLabChief] = useState("Eng. Upul Shantha");
  const [contactEmail, setContactEmail] = useState("kurunegala.lab@waterboard.lk");

  // Threshold Limits State
  const [maxBodLimit, setMaxBodLimit] = useState("30"); // mg/L
  const [maxCodLimit, setMaxCodLimit] = useState("250"); // mg/L
  const [phMinLimit, setPhMinLimit] = useState("6.5");
  const [phMaxLimit, setPhMaxLimit] = useState("8.5");

  // Notification Preferences State
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(true);
  const [criticalStockThreshold, setCriticalStockThreshold] = useState("20"); // %

  // Save State Feedback
  const [savedMessage, setSavedMessage] = useState(false);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedMessage(true);
    setTimeout(() => {
      setSavedMessage(false);
    }, 3000);
  };

  return (
    <div className="w-full min-w-0 space-y-4 sm:space-y-6">
      {/* Page Header */}
      <div className={`${glass} flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 p-4 sm:p-6 rounded-2xl sm:rounded-3xl`}>
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl font-semibold tracking-tight text-slate-900 flex items-start sm:items-center gap-3 leading-tight">
            <span className="p-2 rounded-2xl bg-gradient-to-br from-slate-500 to-slate-700 text-white shadow-lg shadow-slate-500/30 ring-1 ring-inset ring-white/40 shrink-0">
              <Settings size={22} />
            </span>
            <span className="mt-1 sm:mt-0">System Configuration & Settings</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
            Configure laboratory facility details, environmental discharge threshold limits, and automated notification triggers.
          </p>
        </div>
        <Button
          onClick={handleSaveSettings}
          className="w-full md:w-auto min-h-[44px] bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold px-5 rounded-full shadow-lg shadow-blue-500/30 ring-1 ring-inset ring-white/30 flex items-center justify-center gap-2 cursor-pointer transition-all hover:-translate-y-0.5 active:translate-y-0 flex-shrink-0"
        >
          <Save size={18} />
          Save All Changes
        </Button>
      </div>

      {/* Success Notification: floats at the bottom on phones (so it is seen wherever you scrolled), inline from sm up */}
      {savedMessage && (
        <div
          role="status"
          className="fixed bottom-4 inset-x-4 z-50 sm:static sm:inset-auto bg-emerald-100/90 sm:bg-emerald-400/20 backdrop-blur-2xl border border-emerald-400/40 ring-1 ring-inset ring-white/30 rounded-2xl p-3 sm:p-4 text-xs text-emerald-900 flex items-start sm:items-center gap-2 shadow-lg sm:shadow-sm animate-in fade-in slide-in-from-bottom-2 sm:slide-in-from-top-1 duration-200"
        >
          <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" />
          <span className="min-w-0 leading-relaxed">
            <span className="font-bold">Success!</span> System settings and environmental thresholds have been updated successfully.
          </span>
        </div>
      )}

      <form onSubmit={handleSaveSettings} className="space-y-4 sm:space-y-6">
        {/* Facility Profile Section */}
        <div className={`${glass} p-4 sm:p-6 rounded-2xl sm:rounded-3xl space-y-4`}>
          <SectionTitle icon={Shield} title="Laboratory Facility Profile" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 min-w-0">
              <label className="text-xs font-semibold text-slate-700">Facility / Plant Name</label>
              <input
                type="text"
                value={facilityName}
                onChange={(e) => setFacilityName(e.target.value)}
                className={glassInput}
                required
              />
            </div>

            <div className="space-y-1.5 min-w-0">
              <label className="text-xs font-semibold text-slate-700">Chief Laboratory Officer</label>
              <input
                type="text"
                value={labChief}
                onChange={(e) => setLabChief(e.target.value)}
                className={glassInput}
                required
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2 min-w-0">
              <label className="text-xs font-semibold text-slate-700">Official Notification Email</label>
              <input
                type="email"
                inputMode="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className={glassInput}
                required
              />
            </div>
          </div>
        </div>

        {/* Environmental Discharge Threshold Limits */}
        <div className={`${glass} p-4 sm:p-6 rounded-2xl sm:rounded-3xl space-y-4`}>
          <SectionTitle icon={Sliders} title="Environmental Discharge Threshold Limits" />
          <p className="text-xs text-slate-600 leading-relaxed">
            Tests exceeding these limits will automatically trigger warning flags in the Test Records and Reports modules.
          </p>

          {/* 2 columns on phones (pH min/max sit side by side), 4 on large screens */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="space-y-1.5 min-w-0">
              <label className="block text-xs font-semibold text-slate-700 leading-snug">Max BOD Limit (mg/L)</label>
              <input
                type="number"
                inputMode="decimal"
                value={maxBodLimit}
                onChange={(e) => setMaxBodLimit(e.target.value)}
                className={glassInput}
              />
            </div>

            <div className="space-y-1.5 min-w-0">
              <label className="block text-xs font-semibold text-slate-700 leading-snug">Max COD Limit (mg/L)</label>
              <input
                type="number"
                inputMode="decimal"
                value={maxCodLimit}
                onChange={(e) => setMaxCodLimit(e.target.value)}
                className={glassInput}
              />
            </div>

            <div className="space-y-1.5 min-w-0">
              <label className="block text-xs font-semibold text-slate-700 leading-snug">Min pH Limit</label>
              <input
                type="number"
                inputMode="decimal"
                step="0.1"
                value={phMinLimit}
                onChange={(e) => setPhMinLimit(e.target.value)}
                className={glassInput}
              />
            </div>

            <div className="space-y-1.5 min-w-0">
              <label className="block text-xs font-semibold text-slate-700 leading-snug">Max pH Limit</label>
              <input
                type="number"
                inputMode="decimal"
                step="0.1"
                value={phMaxLimit}
                onChange={(e) => setPhMaxLimit(e.target.value)}
                className={glassInput}
              />
            </div>
          </div>
        </div>

        {/* Notifications & Inventory Alerts */}
        <div className={`${glass} p-4 sm:p-6 rounded-2xl sm:rounded-3xl space-y-4`}>
          <SectionTitle icon={Bell} title="Alerts & Notification Triggers" />

          <div className="space-y-2.5 sm:space-y-3">
            <GlassToggle
              checked={emailAlerts}
              onChange={setEmailAlerts}
              label="Enable Email notifications for critical water test warnings"
            />
            <GlassToggle
              checked={smsAlerts}
              onChange={setSmsAlerts}
              label="Enable SMS alerts for low chemical stock levels"
            />
          </div>

          <div className="pt-1 sm:pt-3 w-full sm:max-w-xs space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 leading-snug">Low Stock Critical Warning Threshold (%)</label>
            <input
              type="number"
              inputMode="numeric"
              value={criticalStockThreshold}
              onChange={(e) => setCriticalStockThreshold(e.target.value)}
              className={glassInput}
            />
          </div>
        </div>

        {/* System Maintenance & Backups */}
        <div className={`${glass} p-4 sm:p-6 rounded-2xl sm:rounded-3xl space-y-3 sm:space-y-4`}>
          <SectionTitle icon={Database} title="System Maintenance & Database" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 p-3.5 sm:p-4 bg-white/40 backdrop-blur-xl rounded-2xl border border-white/60 transition-all duration-200 hover:bg-white/60">
            <div className="min-w-0">
              <h4 className="text-sm font-bold text-slate-900">Export Full Database Backup</h4>
              <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">Download complete PostgreSQL SQL backup archive containing test logs and inventory.</p>
            </div>
            <Button
              variant="outline"
              type="button"
              className="w-full sm:w-auto min-h-[44px] sm:min-h-0 text-slate-700 border-white/70 bg-white/60 hover:bg-white/90 backdrop-blur-xl rounded-full shadow-sm cursor-pointer transition-all hover:-translate-y-0.5 flex-shrink-0"
            >
              Download Backup SQL
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 p-3.5 sm:p-4 bg-white/40 backdrop-blur-xl rounded-2xl border border-white/60 transition-all duration-200 hover:bg-white/60">
            <div className="min-w-0">
              <h4 className="text-sm font-bold text-slate-900">Clear System Cache & Temp Logs</h4>
              <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">Purge temporary session files and optimize database query indices.</p>
            </div>
            <Button
              variant="outline"
              type="button"
              className="w-full sm:w-auto min-h-[44px] sm:min-h-0 justify-center text-amber-700 border-amber-300/60 bg-amber-400/10 hover:bg-amber-400/20 backdrop-blur-xl rounded-full shadow-sm cursor-pointer flex items-center gap-1.5 transition-all hover:-translate-y-0.5 flex-shrink-0"
            >
              <RefreshCw size={14} /> Clear Cache
            </Button>
          </div>
        </div>

        {/* Phones: a Save button at the bottom too, so you don't scroll back up */}
        <Button
          type="submit"
          className="md:hidden w-full min-h-[48px] bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-full shadow-lg shadow-blue-500/30 ring-1 ring-inset ring-white/30 flex items-center justify-center gap-2 cursor-pointer active:translate-y-0"
        >
          <Save size={18} />
          Save All Changes
        </Button>
      </form>
    </div>
  );
}