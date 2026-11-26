"use client";

import React from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

export const glass =
  "bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_32px_rgba(15,23,42,0.10)] ring-1 ring-inset ring-white/40";
export const inputClass =
  "w-full h-11 rounded-xl border border-white/70 bg-white/70 px-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400/40";
export const btnPrimary =
  "min-h-[44px] px-5 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-semibold shadow-lg shadow-blue-500/30 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 cursor-pointer inline-flex items-center justify-center gap-2";
export const btnGhost =
  "min-h-[36px] px-3 rounded-lg bg-white/70 border border-white/70 text-xs font-semibold text-slate-700 hover:bg-white cursor-pointer inline-flex items-center gap-1.5";
export const btnDanger =
  "min-h-[36px] px-3 rounded-lg bg-red-500/10 border border-red-400/40 text-xs font-semibold text-red-700 hover:bg-red-500/20 cursor-pointer inline-flex items-center gap-1.5";

export type Notice = { type: "success" | "error"; text: string } | null;

// fetch + JSON with a readable error
export async function api<T = any>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    cache: "no-store",
    credentials: "same-origin",
    ...init,
    headers: init?.body ? { "Content-Type": "application/json", ...(init.headers || {}) } : init?.headers,
  });
  const text = await res.text();
  let json: any;
  try { json = JSON.parse(text); } catch { throw new Error(`${url} returned ${res.status} (not JSON)`); }
  if (!res.ok || !json.success) throw new Error(json?.error || `Error ${res.status}`);
  return json.data as T;
}

export const send = (url: string, method: string, body?: unknown) =>
  api(url, { method, body: body === undefined ? undefined : JSON.stringify(body) });

export function NoticeBox({ notice }: { notice: Notice }) {
  if (!notice) return null;
  const good = notice.type === "success";
  return (
    <div className={`flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm border ${good ? "bg-emerald-500/10 text-emerald-700 border-emerald-400/40" : "bg-red-500/10 text-red-700 border-red-400/40"}`}>
      {good ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> : <AlertCircle size={16} className="mt-0.5 shrink-0" />}
      <span>{notice.text}</span>
    </div>
  );
}

export function Spinner() {
  return <Loader2 size={16} className="animate-spin" />;
}

export function PageTitle({ icon, title, sub, tile }: { icon: React.ReactNode; title: string; sub: string; tile: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${tile} text-white flex items-center justify-center shadow-lg`}>{icon}</div>
      <div>
        <h1 className="text-lg sm:text-xl font-semibold text-slate-800 tracking-tight">{title}</h1>
        <p className="text-xs text-slate-600">{sub}</p>
      </div>
    </div>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className={`${glass} rounded-2xl p-1.5 flex flex-wrap gap-1`}>
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={`px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer transition-all ${value === t.id ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md shadow-blue-500/30" : "text-slate-700 hover:bg-white/60"}`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export const colomboToday = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Colombo" });

// Download a file from an API URL (shows the server's error message when it fails)
export async function downloadFile(url: string, fallbackName: string) {
  const res = await fetch(url, { cache: "no-store", credentials: "same-origin" });
  if (!res.ok) {
    const j = await res.json().catch(() => null);
    throw new Error(j?.error || `Server error (${res.status})`);
  }
  const blob = await res.blob();
  const cd = res.headers.get("content-disposition") || "";
  const name = cd.match(/filename="([^"]+)"/)?.[1] || fallbackName;
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
}