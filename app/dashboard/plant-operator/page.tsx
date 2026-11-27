"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Truck,
  Droplets,
  ArrowRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Activity,
  Clock,
  RefreshCw,
  ListChecks,
  BellRing,
  CalendarClock,
  ClipboardCheck,
  Gauge,
} from "lucide-react";

// Shared "frosted glass" look (same as the other pages)
const glass =
  "bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_32px_rgba(15,23,42,0.10)] ring-1 ring-inset ring-white/40";

const TZ = "Asia/Colombo";
const GALI_HREF = "/dashboard/plant-operator/gali";
const TANK_HREF = "/dashboard/plant-operator/tank-operator";

/* ------------------------------------------------------------------ */
/* Types (same shapes the Tank / Gali pages already use)               */
/* ------------------------------------------------------------------ */
type Param = {
  id: string;
  name: string;
  unit: string | null;
  min: number | null;
  max: number | null;
  checkMode: "SINGLE" | "IN_OUT";
  frequency: "SHIFT" | "DAILY";
};
type Tank = { id: string; name: string; parameters: Param[] };
type Shift = {
  shiftNo: number;
  label: string;
  startTime: string;
  endTime: string;
  status: "RUNNING" | "CLOSED" | "UPCOMING";
};
// shiftNo 0 = the "once a day" row of that date
type Reading = {
  tankId: string;
  date: string;
  shiftNo: number;
  values: Record<string, number>;
  valuesOut: Record<string, number> | null;
  recordedBy: string;
  createdAt: string;
};
type TankData = { date: string; today: string; shifts: Shift[]; operatorName: string; tanks: Tank[]; readings: Reading[] };

type SnapshotItem = { name: string; unit?: string | null; min?: number; max?: number; value: number; ok?: boolean };
type GaliCheck = {
  id: string;
  esValue: number;
  phValue: number;
  values: SnapshotItem[] | null;
  inRange: boolean;
  decision: "APPROVED" | "REJECTED";
  checkedBy: string;
  createdAt: string;
  vehicle: { vehicleNumber: string };
};

type AlertItem = { id: string; kind: "gali" | "tank"; title: string; detail: string; meta: string };

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */
const dayKey = (iso: string | Date) => new Date(iso).toLocaleDateString("en-CA", { timeZone: TZ });
const fmtTime = (iso: string | Date) =>
  new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: TZ });
const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const unitOf = (u?: string | null) => (u ? ` ${u}` : "");
const outOfRange = (p: Param, v: number) => (p.min !== null && v < p.min) || (p.max !== null && v > p.max);
const rangeLabel = (p: Param) =>
  p.min !== null && p.max !== null ? `${p.min} - ${p.max}` : p.min !== null ? `Min ${p.min}` : p.max !== null ? `Max ${p.max}` : "";

// Safe JSON fetch: says WHICH url failed when the server answers with something that is not JSON
async function getJson<T = any>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store", credentials: "same-origin" });
  const text = await res.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`${url} returned ${res.status} (not JSON)`);
  }
  if (!res.ok || !json.success) throw new Error(json.error || `Error ${res.status}`);
  return json.data as T;
}

// A ticking "now" (null until the page has mounted, so server and browser never disagree)
function useNow(ms: number) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const first = setTimeout(() => setNow(new Date()), 0);
    const timer = setInterval(() => setNow(new Date()), ms);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [ms]);
  return now;
}

// Number that counts up smoothly when it changes
function CountUp({ value }: { value: number }) {
  const current = useRef(0);
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const from = current.current;
    const to = value;
    if (from === to) return;
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const duration = reduce ? 1 : 600;
    const t0 = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / duration);
      const v = Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3)));
      current.current = v;
      setShown(v);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{shown}</>;
}

/* ------------------------------------------------------------------ */
/* Header pieces                                                       */
/* ------------------------------------------------------------------ */
function Greeting({ name }: { name: string }) {
  const now = useNow(60000);
  let hello = "Welcome back";
  if (now) {
    const h = Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone: TZ }).format(now));
    hello = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  }
  return <>{name ? `${hello}, ${name}` : hello}</>;
}

function DateAndClock() {
  const now = useNow(1000);
  if (!now) return <span className="inline-block h-4 w-56 rounded bg-white/10 animate-pulse" />;
  return (
    <>
      <span className="inline-flex items-center gap-1.5">
        <CalendarClock size={14} className="text-blue-200" />
        {now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: TZ })}
      </span>
      <span className="inline-flex items-center gap-1.5 tabular-nums">
        <Clock size={14} className="text-blue-200" />
        {now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true, timeZone: TZ })}
      </span>
    </>
  );
}

function ShiftEnds({ endTime }: { endTime: string }) {
  const now = useNow(30000);
  if (!now) return null;
  const [hh, mm] = now
    .toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: TZ })
    .split(":")
    .map(Number);
  const left = (toMin(endTime) - (hh * 60 + mm) + 1440) % 1440;
  const h = Math.floor(left / 60);
  const m = left % 60;
  return <span className="text-xs text-slate-300 tabular-nums">Ends in {h > 0 ? `${h}h ${m}m` : `${m}m`}</span>;
}

/* ------------------------------------------------------------------ */
/* Reusable cards                                                      */
/* ------------------------------------------------------------------ */
function Panel({
  icon,
  title,
  right,
  className = "",
  children,
}: {
  icon: React.ReactNode;
  title: string;
  right?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`${glass} min-w-0 rounded-2xl sm:rounded-3xl p-4 sm:p-5 ${className}`}>
      <div className="flex items-center justify-between gap-3 mb-3.5">
        <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2 min-w-0">
          <span className="shrink-0">{icon}</span>
          <span className="truncate">{title}</span>
        </h2>
        {right}
      </div>
      {children}
    </section>
  );
}

function Kpi({
  icon,
  tile,
  label,
  value,
  sub,
  bar,
}: {
  icon: React.ReactNode;
  tile: string;
  label: string;
  value: React.ReactNode;
  sub: string;
  bar?: { pct: number; cls: string };
}) {
  return (
    <div className={`${glass} min-w-0 rounded-2xl p-4`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">{label}</p>
        <div className={`w-9 h-9 shrink-0 rounded-xl bg-gradient-to-br ${tile} text-white flex items-center justify-center shadow-lg`}>{icon}</div>
      </div>
      <p className="mt-1 text-3xl font-bold text-slate-900 tabular-nums leading-tight">{value}</p>
      {bar && (
        <div className="mt-2 h-1.5 rounded-full bg-white/70 overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-700 ${bar.cls}`} style={{ width: `${bar.pct}%` }} />
        </div>
      )}
      <p className="mt-1.5 text-xs text-slate-600 truncate">{sub}</p>
    </div>
  );
}

const Skeleton = ({ className }: { className: string }) => <div className={`rounded-xl bg-white/50 animate-pulse ${className}`} />;

function EmptyState({ tone, title, text }: { tone: "good" | "neutral"; title: string; text: string }) {
  return (
    <div
      className={`rounded-2xl border px-4 py-6 text-center ${
        tone === "good" ? "border-emerald-400/40 bg-emerald-500/10" : "border-white/60 bg-white/40"
      }`}
    >
      <div
        className={`mx-auto w-10 h-10 rounded-full flex items-center justify-center ${
          tone === "good" ? "bg-emerald-500/15 text-emerald-600" : "bg-white/70 text-slate-500"
        }`}
      >
        {tone === "good" ? <CheckCircle2 size={20} /> : <Activity size={20} />}
      </div>
      <p className={`mt-2 text-sm font-semibold ${tone === "good" ? "text-emerald-700" : "text-slate-700"}`}>{title}</p>
      <p className={`text-xs mt-0.5 ${tone === "good" ? "text-emerald-700/80" : "text-slate-500"}`}>{text}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */
export default function PlantOperatorDashboard() {
  const [tank, setTank] = useState<TankData | null>(null);
  const [checks, setChecks] = useState<GaliCheck[]>([]);
  const [galiLoaded, setGaliLoaded] = useState(false);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  // Today's date for the browser. It is set AFTER the page has mounted (never during render),
  // because Next.js 16 does not allow `new Date()` while a Client Component renders.
  const [clientToday, setClientToday] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setClientToday(dayKey(new Date())), 0);
    return () => clearTimeout(t);
  }, []);

  const load = useCallback(async () => {
    const [t, g] = await Promise.allSettled([
      getJson<TankData>("/api/plant-operator/tank"),
      getJson<GaliCheck[]>("/api/plant-operator/gali/checks"),
    ]);
    const errs: string[] = [];
    if (t.status === "fulfilled") setTank(t.value);
    else errs.push(`Tank data: ${t.reason instanceof Error ? t.reason.message : String(t.reason)}`);
    if (g.status === "fulfilled") {
      setChecks(g.value);
      setGaliLoaded(true);
    } else errs.push(`Gali checks: ${g.reason instanceof Error ? g.reason.message : String(g.reason)}`);
    if (errs.length > 0) console.error("Dashboard load failed:", errs.join(" | "));
    setErrors(errs);
    setLoadedOnce(true);
  }, []);

  // Load now, refresh every 30 seconds and when the operator comes back to the tab
  useEffect(() => {
    load();
    const timer = setInterval(load, 30000);
    window.addEventListener("focus", load);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", load);
    };
  }, [load]);

  const activeShift = tank?.shifts.find((s) => s.status === "RUNNING") ?? null;
  const today = tank?.today ?? clientToday;
  const firstName = tank?.operatorName?.trim().split(/\s+/)[0] ?? "";

  /* ---- Gali numbers (today) ---- */
  const gali = useMemo(() => {
    const list = checks.filter((c) => dayKey(c.createdAt) === today);
    const approved = list.filter((c) => c.decision === "APPROVED").length;
    return { total: list.length, approved, rejected: list.length - approved, month: checks.length };
  }, [checks, today]);

  /* ---- Tank readings: what is done / pending for this shift + today's "once a day" parameters ---- */
  const tankStatus = useMemo(() => {
    if (!tank) return [];
    const rowFor = (tankId: string, p: Param) =>
      p.frequency === "DAILY"
        ? tank.readings.find((r) => r.tankId === tankId && r.date === tank.today && r.shiftNo === 0)
        : tank.readings.find((r) => r.tankId === tankId && r.date === tank.date && r.shiftNo === activeShift?.shiftNo);
    const isDone = (tankId: string, p: Param) => {
      const r = rowFor(tankId, p);
      if (!r || r.values?.[p.id] == null) return false;
      return p.checkMode !== "IN_OUT" || r.valuesOut?.[p.id] != null;
    };
    return tank.tanks
      .map((t) => {
        // "Every shift" parameters only count while a shift is running; "once a day" parameters always count
        const required = t.parameters.filter((p) => p.frequency === "DAILY" || !!activeShift);
        const pending = required.filter((p) => !isDone(t.id, p));
        return { tank: t, total: required.length, done: required.length - pending.length, pending };
      })
      .filter((x) => x.total > 0)
      .sort((a, b) => b.pending.length - a.pending.length);
  }, [tank, activeShift]);

  const totalRequired = tankStatus.reduce((n, x) => n + x.total, 0);
  const totalDone = tankStatus.reduce((n, x) => n + x.done, 0);
  const totalPct = totalRequired > 0 ? Math.round((totalDone / totalRequired) * 100) : 0;

  /* ---- Alerts: rejected Gali checks today + tank readings outside their range ---- */
  const alerts = useMemo(() => {
    const list: AlertItem[] = [];
    checks
      .filter((c) => c.decision === "REJECTED" && dayKey(c.createdAt) === today)
      .forEach((c) => {
        const bad = (Array.isArray(c.values) ? c.values : []).filter((r) => r.ok === false);
        const detail =
          bad.length > 0
            ? bad
                .map(
                  (r) =>
                    `${r.name} ${r.value}${unitOf(r.unit)}${r.min !== undefined && r.max !== undefined ? ` (range ${r.min} - ${r.max})` : ""}`
                )
                .join(" | ")
            : "Rejected by the operator";
        list.push({ id: `g-${c.id}`, kind: "gali", title: `${c.vehicle.vehicleNumber} rejected`, detail, meta: fmtTime(c.createdAt) });
      });
    if (tank) {
      for (const r of tank.readings) {
        const t = tank.tanks.find((x) => x.id === r.tankId);
        if (!t) continue;
        for (const p of t.parameters) {
          const inOut = p.checkMode === "IN_OUT";
          const check = (v: number | null | undefined, tag: string) => {
            if (v == null || !outOfRange(p, v)) return;
            list.push({
              id: `t-${r.tankId}-${r.date}-${r.shiftNo}-${p.id}-${tag}`,
              kind: "tank",
              title: `${t.name} - ${p.name}${tag ? ` (${tag})` : ""}`,
              detail: `${v}${unitOf(p.unit)} (range ${rangeLabel(p)})`,
              meta: r.shiftNo === 0 ? "Daily" : `Shift ${r.shiftNo}`,
            });
          };
          check(r.values?.[p.id], inOut ? "In" : "");
          if (inOut) check(r.valuesOut?.[p.id], "Out");
        }
      }
    }
    return list;
  }, [checks, tank, today]);

  const loading = !loadedOnce;
  const shownAlerts = alerts.slice(0, 6);

  return (
    <div className="w-full min-w-0 space-y-4 sm:space-y-6">
      {/* ---------------- Header banner ---------------- */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl p-4 sm:p-8 text-white bg-gradient-to-br from-slate-900/85 via-blue-950/80 to-indigo-950/80 backdrop-blur-2xl border border-white/20 ring-1 ring-inset ring-white/10 shadow-[0_20px_60px_rgba(30,58,138,0.35)]">
        <div aria-hidden className="pointer-events-none absolute -top-20 -right-10 h-56 w-56 rounded-full bg-blue-500/30 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-24 left-10 h-48 w-48 rounded-full bg-fuchsia-500/20 blur-3xl" />

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="space-y-3 min-w-0">
            <span className="inline-block max-w-full bg-white/10 backdrop-blur-xl text-blue-100 text-[11px] sm:text-xs font-semibold px-3 py-1 rounded-full border border-white/20">
              Kurunegala Water Reclamation Plant
            </span>
            <h1 className="text-xl sm:text-3xl font-semibold tracking-tight leading-snug">
              <Greeting name={firstName} />
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 flex flex-wrap items-center gap-x-4 gap-y-1">
              <DateAndClock />
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Link
                href={GALI_HREF}
                className="inline-flex items-center gap-2 min-h-[42px] px-4 rounded-xl bg-white text-slate-900 text-sm font-semibold shadow-lg shadow-black/20 transition-all hover:-translate-y-0.5 active:scale-[0.98]"
              >
                <Truck size={16} className="text-emerald-600" /> New Gali check
              </Link>
              <Link
                href={TANK_HREF}
                className="inline-flex items-center gap-2 min-h-[42px] px-4 rounded-xl bg-white/10 border border-white/25 text-white text-sm font-semibold backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:bg-white/20 active:scale-[0.98]"
              >
                <Droplets size={16} className="text-sky-300" /> Record tank reading
              </Link>
            </div>
          </div>

          {/* Current shift */}
          <div className="w-full lg:w-72 shrink-0 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-200">Current shift</p>
            {loading ? (
              <div className="mt-2 space-y-2">
                <div className="h-5 w-40 rounded bg-white/15 animate-pulse" />
                <div className="h-3.5 w-28 rounded bg-white/10 animate-pulse" />
              </div>
            ) : activeShift ? (
              <>
                <p className="mt-1 text-base font-semibold">{activeShift.label}</p>
                <p className="text-xs text-slate-300 tabular-nums">
                  {activeShift.startTime} - {activeShift.endTime}
                </p>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/20 border border-emerald-300/40 px-2.5 py-0.5 text-xs font-semibold text-emerald-200">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                    </span>
                    Running
                  </span>
                  <ShiftEnds endTime={activeShift.endTime} />
                </div>
              </>
            ) : (
              <p className="mt-2 text-sm text-slate-300">No shift is running right now.</p>
            )}
          </div>
        </div>
      </div>

      {/* Load errors */}
      {errors.length > 0 && (
        <div className="flex flex-wrap items-start gap-3 rounded-xl px-3 py-2.5 text-sm border bg-red-500/10 text-red-700 border-red-400/40">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span className="min-w-0 flex-1 break-words">Could not load some data. {errors.join(" | ")}</span>
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white/70 border border-white/80 px-3 py-1 text-xs font-semibold text-red-700 cursor-pointer hover:bg-white"
          >
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      )}

      {/* ---------------- KPI cards ---------------- */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[118px] rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Kpi
            icon={<ClipboardCheck size={18} />}
            tile="from-blue-400 to-indigo-600 shadow-blue-500/30"
            label="Gali checks today"
            value={galiLoaded ? <CountUp value={gali.total} /> : "-"}
            sub={galiLoaded ? `${gali.month} this month` : "Not available"}
          />
          <Kpi
            icon={<CheckCircle2 size={18} />}
            tile="from-emerald-400 to-teal-500 shadow-emerald-500/30"
            label="Approved"
            value={galiLoaded ? <CountUp value={gali.approved} /> : "-"}
            sub={galiLoaded ? (gali.total > 0 ? `${Math.round((gali.approved / gali.total) * 100)}% approval rate` : "No checks yet today") : "Not available"}
          />
          <Kpi
            icon={<XCircle size={18} />}
            tile="from-rose-400 to-red-600 shadow-red-500/30"
            label="Rejected"
            value={galiLoaded ? <CountUp value={gali.rejected} /> : "-"}
            sub={galiLoaded ? (gali.rejected > 0 ? "Needs attention" : "None today") : "Not available"}
          />
          <Kpi
            icon={<Gauge size={18} />}
            tile="from-sky-400 to-cyan-600 shadow-cyan-500/30"
            label="Tank readings"
            value={
              tank ? (
                <>
                  <CountUp value={totalDone} />
                  <span className="text-xl text-slate-500 font-semibold">/{totalRequired}</span>
                </>
              ) : (
                "-"
              )
            }
            sub={tank ? (totalRequired === 0 ? "Nothing to record" : totalDone === totalRequired ? "All recorded" : `${totalRequired - totalDone} pending`) : "Not available"}
            bar={tank && totalRequired > 0 ? { pct: totalPct, cls: totalPct === 100 ? "bg-emerald-500" : "bg-sky-500" } : undefined}
          />
        </div>
      )}

      {/* ---------------- Pending checklist + Alerts ---------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <Panel
          className="lg:col-span-2"
          icon={<ListChecks size={18} className="text-sky-600" />}
          title="Pending this shift"
          right={
            tank && totalRequired > 0 ? (
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border whitespace-nowrap ${
                  totalDone === totalRequired
                    ? "bg-emerald-400/20 text-emerald-700 border-emerald-400/40"
                    : "bg-amber-400/20 text-amber-700 border-amber-400/50"
                }`}
              >
                {totalDone} of {totalRequired} recorded
              </span>
            ) : undefined
          }
        >
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-[76px]" />
              <Skeleton className="h-[76px]" />
            </div>
          ) : !tank ? (
            <EmptyState tone="neutral" title="Tank data is not available" text="Check your connection and try again." />
          ) : tankStatus.length === 0 ? (
            <EmptyState tone="neutral" title="Nothing to record right now" text="No tanks with parameters are set up yet. Ask the manager to add them." />
          ) : (
            <div className="space-y-2.5 max-h-[24rem] overflow-y-auto pr-1">
              {tankStatus.map(({ tank: t, total, done, pending }) => {
                const complete = pending.length === 0;
                const names = pending.slice(0, 3).map((p) => p.name).join(", ");
                const more = pending.length > 3 ? ` +${pending.length - 3} more` : "";
                return (
                  <div key={t.id} className="rounded-2xl border border-white/60 bg-white/50 p-3.5 flex items-center gap-3">
                    <div
                      className={`w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br text-white flex items-center justify-center shadow-md ${
                        complete ? "from-emerald-400 to-teal-500 shadow-emerald-500/30" : "from-sky-400 to-blue-600 shadow-blue-500/30"
                      }`}
                    >
                      {complete ? <CheckCircle2 size={18} /> : <Droplets size={18} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-slate-800 truncate">{t.name}</p>
                        <span className="text-xs font-semibold text-slate-600 tabular-nums whitespace-nowrap">
                          {done}/{total}
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 rounded-full bg-white/80 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${complete ? "bg-emerald-500" : "bg-sky-500"}`}
                          style={{ width: `${Math.round((done / total) * 100)}%` }}
                        />
                      </div>
                      <p className={`mt-1.5 text-xs truncate ${complete ? "text-emerald-700" : "text-slate-600"}`}>
                        {complete ? "All readings recorded" : `Pending: ${names}${more}`}
                      </p>
                    </div>
                    {complete ? null : (
                      <Link
                        href={TANK_HREF}
                        className="shrink-0 inline-flex items-center gap-1.5 min-h-[38px] px-3.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-white text-xs font-semibold shadow-md shadow-blue-500/30 transition-all hover:-translate-y-0.5 active:scale-[0.98]"
                      >
                        Record <ArrowRight size={14} />
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Panel>

        <Panel
          icon={<BellRing size={18} className={alerts.length > 0 ? "text-red-600" : "text-emerald-600"} />}
          title="Alerts"
          right={
            !loading && alerts.length > 0 ? (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-red-400/20 text-red-700 border-red-400/40">
                {alerts.length}
              </span>
            ) : undefined
          }
        >
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-14" />
              <Skeleton className="h-14" />
            </div>
          ) : alerts.length === 0 ? (
            <EmptyState tone="good" title="No alerts" text="All checks and readings are within range." />
          ) : (
            <>
              <ul className="space-y-2">
                {shownAlerts.map((a) => (
                  <li key={a.id} className="flex items-start gap-3 rounded-xl border border-red-300/50 bg-red-500/10 px-3 py-2.5">
                    <span className="mt-0.5 shrink-0 text-red-600">{a.kind === "gali" ? <Truck size={16} /> : <Droplets size={16} />}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-red-800 break-words">{a.title}</p>
                      <p className="text-xs text-red-700/90 break-words">{a.detail}</p>
                    </div>
                    <span className="text-[11px] text-red-700/80 whitespace-nowrap">{a.meta}</span>
                  </li>
                ))}
              </ul>
              {alerts.length > shownAlerts.length && (
                <p className="mt-2 text-xs text-slate-600">+{alerts.length - shownAlerts.length} more alert(s)</p>
              )}
            </>
          )}
        </Panel>
      </div>
    </div>
  );
}