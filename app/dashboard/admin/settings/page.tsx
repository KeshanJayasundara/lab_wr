"use client";

import React, { useEffect, useState } from "react";
import { Settings, Shield, Database, Save, CheckCircle2, AlertCircle, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// Shared "frosted glass" look (same as the other pages)
const glass =
  "bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_32px_rgba(15,23,42,0.10)] ring-1 ring-inset ring-white/40";

// Glass text input
// Phones: 16px text (stops iOS zoom-on-focus) + 44px tap height. sm and up: compact.
const glassInput =
  "w-full px-3.5 py-2.5 min-h-[44px] sm:min-h-0 rounded-2xl border border-white/70 bg-white/60 hover:bg-white/80 backdrop-blur-xl text-base sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 shadow-sm " +
  "transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:bg-white/90";

// Section title row used by every card
function SectionTitle({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 pb-3 border-b border-white/50 text-slate-900 font-semibold">
      <Icon className="text-blue-600 shrink-0" size={20} />
      <h2 className="text-sm sm:text-base leading-snug break-words min-w-0">{title}</h2>
    </div>
  );
}

type Facility = {
  region: string;
  departmentName: string;
  departmentHead: string;
  officialEmail: string;
  officialPhone: string;
  regionAddress: string;
  privateContact: string;
};

const EMPTY: Facility = {
  region: "",
  departmentName: "",
  departmentHead: "",
  officialEmail: "",
  officialPhone: "",
  regionAddress: "",
  privateContact: "",
};

// Phone number auto-spacing (Sri Lankan style)
//   077 123 4567        (local: 3-3-4)
//   +94 77 123 4567     (international: +94 then 2-3-4)
// While typing, the space appears right after a group is complete; while deleting it is not re-added.
function formatPhone(value: string, isDeleting: boolean) {
  const international = value.trim().startsWith("+");
  const sizes = international ? [2, 2, 3, 4] : [3, 3, 4];
  const max = sizes.reduce((a, b) => a + b, 0);
  const digits = value.replace(/\D/g, "").slice(0, max);

  const parts: string[] = [];
  let i = 0;
  for (const n of sizes) {
    if (i >= digits.length) break;
    parts.push(digits.slice(i, i + n));
    i += n;
  }
  let out = (international ? "+" : "") + parts.join(" ");

  if (!isDeleting && digits.length > 0 && digits.length < max) {
    let end = 0;
    for (const n of sizes) {
      end += n;
      if (digits.length === end) {
        out += " ";
        break;
      }
    }
  }
  return out;
}

export default function AdminSettingsPage() {
  const [facility, setFacility] = useState<Facility>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const setField = (key: keyof Facility) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setFacility((prev) => ({ ...prev, [key]: e.target.value }));

  const setPhone = (key: "officialPhone" | "privateContact") => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFacility((prev) => ({
      ...prev,
      [key]: formatPhone(e.target.value, e.target.value.length < prev[key].length),
    }));

  // Load the saved facility profile
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/facility", { cache: "no-store" });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error || "Failed to load facility profile");
        setFacility({ ...EMPTY, ...json.data });
      } catch (err: any) {
        setMessage({ type: "error", text: err.message });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Auto-hide success messages
  useEffect(() => {
    if (message?.type !== "success") return;
    const t = setTimeout(() => setMessage(null), 3500);
    return () => clearTimeout(t);
  }, [message]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/facility", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(facility),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to save facility profile");
      setFacility({ ...EMPTY, ...json.data });
      setMessage({ type: "success", text: "Laboratory facility profile has been saved successfully." });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  // Download the whole database (schema + data) as a .sql file
  const handleDownloadBackup = async () => {
    setDownloading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/backup", { cache: "no-store" });
      if (!res.ok) {
        let errText = "Failed to generate the database backup";
        try {
          const json = await res.json();
          errText = json.error || errText;
        } catch {}
        throw new Error(errText);
      }

      const disposition = res.headers.get("Content-Disposition") || "";
      const match = /filename="?([^";]+)"?/i.exec(disposition);
      const fileName = match?.[1] || `nwsdb_backup_${new Date().toISOString().slice(0, 10)}.sql`;

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      setMessage({ type: "success", text: `Database backup downloaded: ${fileName}` });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setDownloading(false);
    }
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
          disabled={saving || loading}
          className="w-full md:w-auto min-h-[44px] bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold px-5 rounded-full shadow-lg shadow-blue-500/30 ring-1 ring-inset ring-white/30 flex items-center justify-center gap-2 cursor-pointer transition-all hover:-translate-y-0.5 active:translate-y-0 flex-shrink-0 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          {saving ? "Saving..." : "Save All Changes"}
        </Button>
      </div>

      {/* Feedback message: floats at the bottom on phones, inline from sm up */}
      {message && (
        <div
          role="status"
          className={`fixed bottom-4 inset-x-4 z-50 sm:static sm:inset-auto backdrop-blur-2xl border ring-1 ring-inset ring-white/30 rounded-2xl p-3 sm:p-4 text-xs flex items-start sm:items-center gap-2 shadow-lg sm:shadow-sm animate-in fade-in slide-in-from-bottom-2 sm:slide-in-from-top-1 duration-200 ${
            message.type === "success"
              ? "bg-emerald-100/90 sm:bg-emerald-400/20 border-emerald-400/40 text-emerald-900"
              : "bg-red-100/90 sm:bg-red-400/20 border-red-400/40 text-red-900"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle size={18} className="text-red-600 flex-shrink-0" />
          )}
          <span className="min-w-0 leading-relaxed">
            <span className="font-bold">{message.type === "success" ? "Success!" : "Error:"}</span> {message.text}
          </span>
        </div>
      )}

      <form onSubmit={handleSaveSettings} className="space-y-4 sm:space-y-6">
        {/* Facility Profile Section */}
        <div className={`${glass} p-4 sm:p-6 rounded-2xl sm:rounded-3xl space-y-4`}>
          <SectionTitle icon={Shield} title="Laboratory Facility Profile" />

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-600">
              <Loader2 size={18} className="animate-spin" /> Loading facility profile...
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 min-w-0">
                <label className="text-xs font-semibold text-slate-700">Region</label>
                <input
                  type="text"
                  value={facility.region}
                  onChange={setField("region")}
                  className={glassInput}
                  placeholder="e.g. Kurunegala"
                  required
                />
              </div>

              <div className="space-y-1.5 min-w-0">
                <label className="text-xs font-semibold text-slate-700">Department Name</label>
                <input
                  type="text"
                  value={facility.departmentName}
                  onChange={setField("departmentName")}
                  className={glassInput}
                  required
                />
              </div>

              <div className="space-y-1.5 min-w-0">
                <label className="text-xs font-semibold text-slate-700">Official Phone Number</label>
                <input
                  type="tel"
                  inputMode="tel"
                  value={facility.officialPhone}
                  onChange={setPhone("officialPhone")}
                  maxLength={16}
                  className={glassInput}
                  placeholder="e.g. 037 222 2222"
                  required
                />
              </div>

              <div className="space-y-1.5 min-w-0">
                <label className="text-xs font-semibold text-slate-700">Official Email</label>
                <input
                  type="email"
                  inputMode="email"
                  value={facility.officialEmail}
                  onChange={setField("officialEmail")}
                  className={glassInput}
                  required
                />
              </div>

              <div className="space-y-1.5 min-w-0">
                <label className="text-xs font-semibold text-slate-700">Department Head</label>
                <input
                  type="text"
                  value={facility.departmentHead}
                  onChange={setField("departmentHead")}
                  className={glassInput}
                  required
                />
              </div>

              <div className="space-y-1.5 min-w-0">
                <label className="text-xs font-semibold text-slate-700">Private Contact Number</label>
                <input
                  type="tel"
                  inputMode="tel"
                  value={facility.privateContact}
                  onChange={setPhone("privateContact")}
                  maxLength={16}
                  className={glassInput}
                  placeholder="e.g. 077 123 4567"
                  required
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2 min-w-0">
                <label className="text-xs font-semibold text-slate-700">Region Address</label>
                <textarea
                  value={facility.regionAddress}
                  onChange={setField("regionAddress")}
                  rows={2}
                  className={`${glassInput} resize-none`}
                  placeholder="Street, city, postal code"
                  required
                />
              </div>
            </div>
          )}
        </div>

        {/* System Maintenance & Backups */}
        <div className={`${glass} p-4 sm:p-6 rounded-2xl sm:rounded-3xl space-y-3 sm:space-y-4`}>
          <SectionTitle icon={Database} title="System Maintenance & Database" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 p-3.5 sm:p-4 bg-white/40 backdrop-blur-xl rounded-2xl border border-white/60 transition-all duration-200 hover:bg-white/60">
            <div className="min-w-0">
              <h4 className="text-sm font-bold text-slate-900">Export Full Database Backup</h4>
              <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                Download complete PostgreSQL SQL backup containing the database structure and all stored data: test logs, inventory, users and region details.
              </p>
            </div>
            <Button
              variant="outline"
              type="button"
              onClick={handleDownloadBackup}
              disabled={downloading}
              className="w-full sm:w-auto min-h-[44px] sm:min-h-0 text-slate-700 border-white/70 bg-white/60 hover:bg-white/90 backdrop-blur-xl rounded-full shadow-sm cursor-pointer transition-all hover:-translate-y-0.5 flex-shrink-0 flex items-center justify-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              {downloading ? "Preparing backup..." : "Download Backup SQL"}
            </Button>
          </div>
        </div>

        {/* Phones: a Save button at the bottom too, so you don't scroll back up */}
        <Button
          type="submit"
          disabled={saving || loading}
          className="md:hidden w-full min-h-[48px] bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-full shadow-lg shadow-blue-500/30 ring-1 ring-inset ring-white/30 flex items-center justify-center gap-2 cursor-pointer active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          {saving ? "Saving..." : "Save All Changes"}
        </Button>
      </form>
    </div>
  );
}