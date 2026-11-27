
"use client";

import React, { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Bell, X, Pencil, ArrowRight, CheckCheck, User, Clock, FlaskConical } from "lucide-react";
import { formatChem, formatUnit } from "@/lib/chemFormat";

type NotificationData = {
  recordId?: string;
  sampleId?: string;
  categoryName?: string;
  unitName?: string;
  parameter?: string;
  unit?: string;
  oldValue?: number;
  newValue?: number;
  oldStatus?: string;
  newStatus?: string;
  editedBy?: string;
  submittedAt?: string;
  editedAt?: string;
};

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  data: NotificationData | null;
  isRead: boolean;
  createdAt: string;
};

const POLL_MS = 30000;

const statusStyle = (s?: string) =>
  s === "Normal"
    ? "text-emerald-700 bg-emerald-400/20 border-emerald-400/40"
    : s === "Critical"
    ? "text-red-700 bg-red-400/20 border-red-400/40"
    : "text-amber-700 bg-amber-400/20 border-amber-400/40";

const fmtDateTime = (iso?: string) => (iso ? new Date(iso).toLocaleString() : "-");

function timeAgo(iso: string) {
  const sec = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  return `${Math.floor(hr / 24)} d ago`;
}

export default function NotificationBell() {
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [listOpen, setListOpen] = useState(false);
  const [selected, setSelected] = useState<Notification | null>(null);

  const load = useCallback(async () => {
    if (document.visibilityState === "hidden") return;
    try {
      const res = await fetch("/api/manager/notifications", { cache: "no-store", credentials: "same-origin" });
      if (!res.ok) return;
      const json = await res.json();
      if (json.success) {
        setItems(json.data.items);
        setUnread(json.data.unreadCount);
      }
    } catch {
      // network blip: try again on the next tick
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, POLL_MS);
    window.addEventListener("focus", load);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", load);
    };
  }, [load]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (selected) setSelected(null);
      else setListOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [selected]);

  const markRead = async (body: { id: string } | { all: true }) => {
    try {
      await fetch("/api/manager/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch {
      // the next poll will correct the badge
    }
  };

  const openDetails = (n: Notification) => {
    setSelected(n);
    setListOpen(false);
    if (!n.isRead) {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
      setUnread((c) => Math.max(0, c - 1));
      markRead({ id: n.id });
    }
  };

  const markAllRead = () => {
    setItems((prev) => prev.map((x) => ({ ...x, isRead: true })));
    setUnread(0);
    markRead({ all: true });
  };

  const d = selected?.data ?? null;
  const statusChanged = d && d.oldStatus !== d.newStatus;

  return (
    <>
      <button
        type="button"
        onClick={() => setListOpen((o) => !o)}
        aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}
        className="relative p-2 text-slate-600 hover:text-blue-600 hover:bg-white/60 rounded-full transition-all cursor-pointer hover:scale-110"
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full ring-2 ring-white/80 flex items-center justify-center">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {/* Rendered in <body> so the header's blur doesn't trap the fixed panels */}
      {listOpen &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[60]" onClick={() => setListOpen(false)} />
            <div className="fixed z-[61] top-20 right-3 sm:right-6 w-[min(24rem,calc(100vw-1.5rem))] rounded-3xl bg-white/90 backdrop-blur-2xl border border-white/70 ring-1 ring-inset ring-white/50 shadow-[0_16px_40px_rgba(15,23,42,0.22)] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200/70">
                <h3 className="text-sm font-bold text-slate-900">
                  Notifications {unread > 0 && <span className="text-blue-600">({unread} new)</span>}
                </h3>
                {unread > 0 && (
                  <button
                    type="button"
                    onClick={markAllRead}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                  >
                    <CheckCheck size={13} /> Mark all as read
                  </button>
                )}
              </div>

              <div className="max-h-[60vh] overflow-y-auto">
                {items.length === 0 ? (
                  <p className="px-4 py-10 text-center text-xs text-slate-500">No notifications yet.</p>
                ) : (
                  items.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => openDetails(n)}
                      className={`w-full text-left px-4 py-3 flex gap-3 items-start border-b border-slate-100 last:border-b-0 transition-colors cursor-pointer hover:bg-blue-50/70 ${
                        n.isRead ? "" : "bg-blue-50/50"
                      }`}
                    >
                      <span className="mt-0.5 p-1.5 rounded-xl bg-amber-100 text-amber-700 shrink-0">
                        <Pencil size={13} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className={`text-xs ${n.isRead ? "font-semibold text-slate-700" : "font-bold text-slate-900"}`}>
                            {n.title}
                          </span>
                          {!n.isRead && <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />}
                        </span>
                        <span className="block text-[11px] text-slate-600 mt-0.5 line-clamp-2 break-words">{n.message}</span>
                        <span className="block text-[10px] text-slate-400 mt-1">{timeAgo(n.createdAt)}</span>
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </>,
          document.body
        )}

      {/* Details pop-up */}
      {selected &&
        createPortal(
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setSelected(null)}
          >
            <div
              className="w-full max-w-lg max-h-[90vh] flex flex-col rounded-3xl bg-white/95 backdrop-blur-2xl border border-white/70 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-200/70">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 min-w-0">
                  <span className="p-2 rounded-xl bg-amber-100 text-amber-700 shrink-0">
                    <Pencil size={16} />
                  </span>
                  <span className="truncate">{selected.title}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  aria-label="Close"
                  className="text-slate-400 hover:text-slate-700 cursor-pointer transition-transform hover:rotate-90"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-5 space-y-4 overflow-y-auto">
                {d ? (
                  <>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      <span className="font-bold text-slate-800">{d.editedBy}</span> edited a submitted test result within the 1-hour edit window.
                    </p>

                    {/* Old -> New value */}
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <FlaskConical size={13} /> {formatChem(d.parameter)}
                      </p>
                      <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                        <div className="text-center">
                          <p className="text-[10px] font-semibold text-slate-500 uppercase">Before</p>
                          <p className="text-xl font-bold text-slate-500 line-through decoration-red-400">{d.oldValue}</p>
                          <p className="text-[10px] text-slate-500">{formatUnit(d.unit)}</p>
                          <span className={`inline-block mt-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusStyle(d.oldStatus)}`}>
                            {d.oldStatus}
                          </span>
                        </div>
                        <ArrowRight size={18} className="text-blue-500" />
                        <div className="text-center">
                          <p className="text-[10px] font-semibold text-slate-500 uppercase">After</p>
                          <p className="text-xl font-bold text-slate-900">{d.newValue}</p>
                          <p className="text-[10px] text-slate-500">{formatUnit(d.unit)}</p>
                          <span className={`inline-block mt-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusStyle(d.newStatus)}`}>
                            {d.newStatus}
                          </span>
                        </div>
                      </div>
                      {statusChanged && (
                        <p className="mt-3 text-[11px] font-semibold text-amber-700 bg-amber-100/70 rounded-xl px-3 py-1.5 text-center">
                          Status changed: {d.oldStatus} → {d.newStatus}
                        </p>
                      )}
                    </div>

                    {/* Details */}
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 text-xs">
                      <div>
                        <dt className="text-[10px] font-bold uppercase text-slate-500">Sample ID</dt>
                        <dd className="font-semibold text-slate-800 break-all">{d.sampleId}</dd>
                      </div>
                      <div>
                        <dt className="text-[10px] font-bold uppercase text-slate-500">Category</dt>
                        <dd className="font-semibold text-slate-800">{d.categoryName}</dd>
                      </div>
                      <div>
                        <dt className="text-[10px] font-bold uppercase text-slate-500">Tank / Unit</dt>
                        <dd className="font-semibold text-slate-800">{d.unitName}</dd>
                      </div>
                      <div>
                        <dt className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1"><User size={11} /> Edited by</dt>
                        <dd className="font-semibold text-slate-800">{d.editedBy}</dd>
                      </div>
                      <div>
                        <dt className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1"><Clock size={11} /> Originally submitted</dt>
                        <dd className="font-semibold text-slate-800">{fmtDateTime(d.submittedAt)}</dd>
                      </div>
                      <div>
                        <dt className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1"><Clock size={11} /> Edited at</dt>
                        <dd className="font-semibold text-slate-800">{fmtDateTime(d.editedAt)}</dd>
                      </div>
                    </dl>
                  </>
                ) : (
                  <p className="text-sm text-slate-700">{selected.message}</p>
                )}
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 px-5 py-4 border-t border-slate-200/70">
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="px-5 py-2.5 rounded-full text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 cursor-pointer transition-colors"
                >
                  Close
                </button>
                <Link
                  href="/dashboard/manager/verify"
                  onClick={() => setSelected(null)}
                  className="px-5 py-2.5 rounded-full text-xs font-semibold text-white text-center bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg shadow-blue-500/30 transition-all"
                >
                  Go to Verification Queue
                </Link>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}