"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, Check, CheckCircle2, ChevronDown, Loader2, Search, X } from "lucide-react";

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

// Bottom-of-screen toast (replaces the inline banner). Auto-hides; errors stay a little longer.
export function Toast({ notice, onClose }: { notice: Notice; onClose: () => void }) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => closeRef.current(), notice.type === "error" ? 6000 : 3500);
    return () => clearTimeout(t);
  }, [notice]);

  if (!notice || typeof document === "undefined") return null;
  const good = notice.type === "success";
  return createPortal(
    <div className="fixed inset-x-0 bottom-0 z-[200] flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-6 pointer-events-none">
      <div
        role={good ? "status" : "alert"}
        className={`pointer-events-auto flex w-full sm:w-auto sm:min-w-[320px] max-w-md items-start gap-3 rounded-2xl border px-4 py-3 text-sm font-medium backdrop-blur-2xl shadow-[0_16px_48px_rgba(15,23,42,0.25)] animate-in fade-in slide-in-from-bottom-4 duration-300 ${
          good ? "bg-emerald-50/90 border-emerald-300/70 text-emerald-800" : "bg-red-50/90 border-red-300/70 text-red-800"
        }`}
      >
        {good ? <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600" /> : <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-600" />}
        <span className="flex-1 min-w-0 break-words">{notice.text}</span>
        <button type="button" aria-label="Dismiss" onClick={onClose} className="shrink-0 -mr-1 p-1 rounded-lg opacity-60 hover:opacity-100 hover:bg-black/5 cursor-pointer">
          <X size={14} />
        </button>
      </div>
    </div>,
    document.body
  );
}

export type DropdownOption = { id: string; label: string; sub?: string };

// Same glass dropdown style as the "Analytics & Trends" page (frosted field, blue hover / selected row).
// The list is rendered in a portal, so it is never hidden behind other cards.
export function GlassDropdown({
  options, value, onChange, placeholder = "Select...", icon: Icon, disabled = false, searchable, size = "md",
}: {
  options: DropdownOption[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  icon?: React.ElementType;
  disabled?: boolean;
  searchable?: boolean;
  size?: "md" | "sm";
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [pos, setPos] = useState<{ left: number; minWidth: number; maxWidth: number; top?: number; bottom?: number; maxH: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const showSearch = searchable ?? options.length > 7;
  const selected = options.find((o) => o.id === value);
  const term = q.trim().toLowerCase();
  const list = term ? options.filter((o) => o.label.toLowerCase().includes(term) || o.sub?.toLowerCase().includes(term)) : options;

  const close = useCallback(() => { setOpen(false); setQ(""); }, []);

  const place = useCallback(() => {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    const below = window.innerHeight - r.bottom - 12;
    const above = r.top - 12;
    const flip = below < 220 && above > below;
    const maxH = Math.max(160, Math.min(320, flip ? above : below));
    setPos({
      left: r.left, minWidth: r.width, maxWidth: Math.max(r.width, window.innerWidth - r.left - 12), maxH,
      ...(flip ? { bottom: window.innerHeight - r.top + 8 } : { top: r.bottom + 8 }),
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    place();
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      close();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, place, close]);

  // 16px text + 44px height on phones (no iOS zoom, easy to tap), compact from sm up
  const sizeClass =
    size === "sm"
      ? "px-3 py-2 sm:py-1.5 min-h-[44px] sm:min-h-0 text-base sm:text-xs"
      : "px-3.5 py-2.5 min-h-[44px] sm:min-h-0 text-base sm:text-sm";

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => !disabled && (open ? close() : setOpen(true))}
        className={`w-full rounded-2xl border border-white/70 bg-white/60 backdrop-blur-xl font-medium text-slate-800 shadow-sm transition-all duration-300 ease-out hover:bg-white/85 hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:bg-white/90 ${sizeClass} ${
          disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(59,130,246,0.25)]"
        } flex items-center justify-between gap-2 text-left`}
      >
        <span className="flex items-center gap-2 min-w-0">
          {Icon && <Icon size={size === "sm" ? 14 : 16} className="text-blue-600 shrink-0" />}
          <span className={`truncate ${selected ? "" : "text-slate-400"}`}>{selected ? selected.label : placeholder}</span>
        </span>
        <ChevronDown size={size === "sm" ? 14 : 16} className={`flex-shrink-0 text-blue-600 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && !disabled && pos && typeof document !== "undefined" && createPortal(
        <div
          ref={panelRef}
          role="listbox"
          style={{ position: "fixed", left: pos.left, minWidth: pos.minWidth, maxWidth: pos.maxWidth, width: "max-content", top: pos.top, bottom: pos.bottom, maxHeight: pos.maxH }}
          className="z-[100] flex flex-col origin-top rounded-2xl p-1.5 gap-1 bg-white/85 backdrop-blur-2xl border border-white/70 ring-1 ring-inset ring-white/50 shadow-[0_16px_40px_rgba(15,23,42,0.18)] animate-in fade-in zoom-in-95 slide-in-from-top-1 duration-150"
        >
          {showSearch && (
            <div className="relative shrink-0">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); if (list[0]) { onChange(list[0].id); close(); } }
                }}
                placeholder="Search..."
                className="w-full h-9 pl-8 pr-3 rounded-xl border border-white/70 bg-white/70 text-base sm:text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-500/60"
              />
            </div>
          )}
          <ul className="overflow-y-auto overscroll-contain space-y-0.5">
            {list.map((o) => {
              const active = o.id === value;
              return (
                <li
                  key={o.id}
                  role="option"
                  aria-selected={active}
                  onClick={() => { onChange(o.id); close(); }}
                  className={`flex items-center justify-between gap-3 px-3 py-3 sm:py-2 rounded-xl text-sm sm:text-xs cursor-pointer transition-all duration-200 ease-out hover:bg-blue-500/15 hover:text-blue-700 hover:translate-x-1 ${
                    active ? "bg-blue-500/10 font-semibold text-blue-700" : "text-slate-700"
                  }`}
                >
                  <div className="min-w-0">
                    <p className="break-words">{o.label}</p>
                    {o.sub && <p className={`text-[10px] font-normal ${active ? "text-blue-600/80" : "text-slate-500"}`}>{o.sub}</p>}
                  </div>
                  {active && <Check size={14} className="flex-shrink-0 text-blue-600" />}
                </li>
              );
            })}
            {list.length === 0 && <li className="text-center py-4 text-xs text-slate-500 list-none">No results found</li>}
          </ul>
        </div>,
        document.body
      )}
    </>
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