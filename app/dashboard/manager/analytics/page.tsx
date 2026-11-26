"use client";

import { formatChem, formatUnit } from "@/lib/chemFormat";
import React, { useEffect, useRef, useState } from "react";
import { BarChart3, GitPullRequest, Sliders, Clock, ChevronDown, Check } from "lucide-react";

type ChartPoint = {
  time: string;
  sub?: string;
  fullLabel?: string;
  y1: number | null; // null = no reading in this period (gap in the line)
  y2: number | null;
  y1Min?: number | null;
  y1Max?: number | null;
  y1Count?: number;
  y2Min?: number | null;
  y2Max?: number | null;
  y2Count?: number;
  status: string;
};

type SeriesMeta = {
  typeId: string;
  parameter: string;
  unit: string | null;
  standardMin: number | null;
  standardMax: number | null;
  totalReadings: number;
};

const formatLimits = (min: number | null, max: number | null, unit: string | null) => {
  const u = unit ? ` ${formatUnit(unit)}` : "";
  if (min !== null && max !== null) return `${min} - ${max}${u}`;
  if (max !== null) return `\u2264 ${max}${u}`;
  if (min !== null) return `\u2265 ${min}${u}`;
  return "";
};

type AxisConfig = { auto: boolean; minText: string; maxText: string; stepText: string };

const glass =
  "bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_32px_rgba(15,23,42,0.10)] ring-1 ring-inset ring-white/40";

const glassFieldBase =
  "rounded-2xl border border-white/70 bg-white/60 backdrop-blur-xl font-medium text-slate-800 placeholder:text-slate-400 shadow-sm " +
  "transition-all duration-300 ease-out hover:bg-white/85 hover:border-blue-300 " +
  "focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:bg-white/90";

type Option = { value: string; label: string; disabled?: boolean };

// Shape returned by GET /api/manager/analytics/options
type OptionParam = {
  name: string;
  unit: string | null;
  standardMin: number | null;
  standardMax: number | null;
  recordCount: number;
};
type OptionUnit = {
  typeId: string;
  name: string;
  code: string | null;
  categoryName: string;
  parameters: OptionParam[];
};

function GlassSelect({
  value,
  options,
  onChange,
  size = "md",
  placeholder = "Select...",
  disabled = false,
}: {
  value: string;
  options: Option[];
  onChange: (v: string) => void;
  size?: "md" | "sm";
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  // Keep the whole list visible when it opens near the bottom of the screen
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(
      () => listRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }),
      30
    );
    return () => clearTimeout(t);
  }, [open]);

  const selected = options.find((o) => o.value === value);
  // 16px text + 44px height on phones (no iOS zoom, easy to tap), compact from sm up
  const sizeClass =
    size === "sm"
      ? "px-3 py-2 sm:py-1.5 min-h-[44px] sm:min-h-0 text-base sm:text-xs"
      : "px-3.5 py-2.5 min-h-[44px] sm:min-h-0 text-base sm:text-sm";

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={`${glassFieldBase} ${sizeClass} w-full ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"} flex items-center justify-between gap-2 text-left hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(59,130,246,0.25)]`}
      >
        <span className={`truncate ${selected ? "" : "text-slate-400"}`}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown
          size={size === "sm" ? 14 : 16}
          className={`flex-shrink-0 text-blue-600 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && !disabled && (
        <ul
          ref={listRef}
          role="listbox"
          className="absolute z-50 mt-2 min-w-full w-max max-w-[calc(100vw-3rem)] origin-top rounded-2xl p-1.5 space-y-0.5 bg-white/85 backdrop-blur-2xl border border-white/70 ring-1 ring-inset ring-white/50 shadow-[0_16px_40px_rgba(15,23,42,0.18)] animate-in fade-in zoom-in-95 slide-in-from-top-1 duration-150"
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <li
                key={opt.value}
                role="option"
                aria-selected={isSelected}
                aria-disabled={opt.disabled}
                onClick={() => {
                  if (opt.disabled) return;
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`flex items-center justify-between gap-3 px-3 py-3 sm:py-2 rounded-xl text-sm sm:text-xs transition-all duration-200 ease-out ${
                  opt.disabled
                    ? "cursor-not-allowed opacity-40"
                    : "cursor-pointer hover:bg-blue-500/15 hover:text-blue-700 hover:translate-x-1"
                } ${isSelected ? "bg-blue-500/10 font-semibold text-blue-700" : "text-slate-700"}`}
              >
                <span className="min-w-0 break-words">{opt.label}</span>
                {isSelected && <Check size={14} className="flex-shrink-0 text-blue-600" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

const durationOptions: Option[] = [
  { value: "Past 24 Hours", label: "Past 24 Hours (Hourly)" },
  { value: "Past 7 Days", label: "Past 7 Days (Daily)" },
  { value: "Past 30 Days", label: "Past 30 Days (Day-by-Day)" },
  { value: "This Month", label: "This Month (Day-by-Day, to date)" },
  { value: "Custom Range", label: "Custom Date Range..." },
];

// "Nice" number (1, 2, 5 x 10^n) used for round axis steps
const niceNum = (range: number, round: boolean) => {
  const exp = Math.floor(Math.log10(range));
  const f = range / Math.pow(10, exp);
  let nf: number;
  if (round) nf = f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10;
  else nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
  return Number((nf * Math.pow(10, exp)).toPrecision(10));
};

const decimalsOf = (n: number) => {
  const s = n.toString();
  if (s.includes("e-")) return parseInt(s.split("e-")[1], 10);
  const d = s.split(".")[1];
  return d ? d.length : 0;
};

type AxisDomain = { lo: number; hi: number; nonNegative: boolean } | null;

// Zoom the axis onto the data (plus a little padding) so the line sits in the middle of the chart
const niceScale = (lo: number, hi: number, nonNegative: boolean) => {
  if (hi - lo < 1e-9) {
    const pad = Math.abs(hi) * 0.1 || 1;
    lo -= pad;
    hi += pad;
  } else {
    const pad = (hi - lo) * 0.12;
    lo -= pad;
    hi += pad;
  }
  if (nonNegative && lo < 0) lo = 0;

  const step = niceNum(niceNum(hi - lo, false) / 5, true);
  const min = Number((Math.floor(lo / step + 1e-9) * step).toPrecision(10));
  const max = Number((Math.ceil(hi / step - 1e-9) * step).toPrecision(10));
  return { min, max, step };
};

type ResolvedAxis = { min: number; max: number; step: number; decimals: number; ticks: number[]; warning: string };

const resolveAxis = (
  cfg: AxisConfig,
  domain: AxisDomain,
  fallback: { min: number; max: number; step: number }
): ResolvedAxis => {
  let warning = "";
  let min: number;
  let max: number;
  let step: number;

  if (cfg.auto) {
    if (domain) {
      const sc = niceScale(domain.lo, domain.hi, domain.nonNegative);
      min = sc.min;
      max = sc.max;
      step = sc.step;
    } else {
      min = 0;
      max = 1;
      step = 0.2;
    }
  } else {
    min = parseFloat(cfg.minText);
    if (!isFinite(min)) {
      warning = "Min must be a number - keeping the previous min.";
      min = fallback.min;
    }
    max = parseFloat(cfg.maxText);
    if (!isFinite(max) || max <= min) {
      warning = warning || "Max must be a number greater than Min - keeping the previous max.";
      max = fallback.max > min ? fallback.max : min + 1;
    }
    step = parseFloat(cfg.stepText);
    if (!isFinite(step) || step <= 0) {
      warning = warning || "Step must be a number greater than 0 - using an automatic step.";
      step = niceNum((max - min) / 5, true);
    }
    if (Math.ceil((max - min) / step - 1e-9) > 10) {
      const st = niceNum((max - min) / 5, true);
      warning = warning || `Step is too small (more than 10 intervals) - showing every ${st} instead.`;
      step = st;
    }
  }

  const decimals = Math.min(4, Math.max(decimalsOf(step), decimalsOf(min), decimalsOf(max)));

  const ticks: number[] = [];
  for (let i = 0; min + i * step < max - 1e-9; i++) {
    ticks.push(Number((min + i * step).toFixed(6)));
  }
  ticks.push(max);

  return { min, max, step, decimals, ticks, warning };
};

const getPos = (val: number, max: number, min = 0) =>
  max > min ? Math.max(0, Math.min(100, 100 - ((val - min) / (max - min)) * 100)) : 50;

const RANGE_KEYS: Record<string, string> = {
  "Past 24 Hours": "24h",
  "Past 7 Days": "7d",
  "Past 30 Days": "30d",
  "This Month": "month",
};

// Smooth (monotone cubic) path through one continuous run of points
const smoothRun = (pts: { x: number; y: number }[]): string => {
  const n = pts.length;
  if (n < 2) return ""; // a single reading is drawn as a dot only
  if (n === 2) return `M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y} `;

  const slopes: number[] = [];
  for (let i = 0; i < n - 1; i++) slopes.push((pts[i + 1].y - pts[i].y) / (pts[i + 1].x - pts[i].x));

  const tangents: number[] = new Array(n);
  tangents[0] = slopes[0];
  tangents[n - 1] = slopes[n - 2];
  for (let i = 1; i < n - 1; i++) {
    const a = slopes[i - 1];
    const b = slopes[i];
    tangents[i] = a * b <= 0 ? 0 : (2 * a * b) / (a + b);
  }

  let path = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[i];
    const p1 = pts[i + 1];
    const dx = (p1.x - p0.x) / 3;
    path += ` C ${p0.x + dx} ${p0.y + tangents[i] * dx}, ${p1.x - dx} ${p1.y - tangents[i + 1] * dx}, ${p1.x} ${p1.y}`;
  }
  return path + " ";
};

const statusStyle = (status: string) => {
  if (status === "No data") return "bg-slate-500/20 text-slate-300 border-slate-500/40";
  if (status === "Critical") return "bg-red-500/20 text-red-300 border-red-500/40";
  if (status === "Warning") return "bg-amber-500/20 text-amber-300 border-amber-500/40";
  return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
};

export default function ManagerAnalyticsPage() {
  // No default selections: every dropdown starts empty and shows its placeholder.
  const [timeDuration, setTimeDuration] = useState("");
  const [isCustomMode, setIsCustomMode] = useState(false);
  // Left empty on purpose: Date is read in the event handler below (Next.js cannot prerender new Date()).
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Each axis = Unit/Tank (typeId) + Parameter. Parameter list depends on the chosen unit.
  const [y1TypeId, setY1TypeId] = useState("");
  const [y2TypeId, setY2TypeId] = useState("");
  const [y1Param, setY1Param] = useState("");
  const [y2Param, setY2Param] = useState("");

  const [unitsData, setUnitsData] = useState<OptionUnit[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [optionsError, setOptionsError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/manager/analytics/options");
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error || "Failed to load options");
        if (!cancelled) setUnitsData(json.data as OptionUnit[]);
      } catch (e: any) {
        if (!cancelled) setOptionsError(e?.message || "Failed to load options");
      } finally {
        if (!cancelled) setOptionsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const unitOptions: Option[] = unitsData.map((u) => ({
    value: u.typeId,
    label: `${u.categoryName} · ${u.name}`,
  }));

  const paramOptionsFor = (typeId: string): Option[] =>
    (unitsData.find((u) => u.typeId === typeId)?.parameters ?? []).map((p) => ({
      value: p.name,
      label: `${formatChem(p.name)}${p.unit ? ` (${formatUnit(p.unit)})` : ""} · ${p.recordCount} reading${p.recordCount === 1 ? "" : "s"}`,
      disabled: p.recordCount === 0,
    }));

  const axisLabels = (typeId: string, param: string, fallback: string) => {
    const u = unitsData.find((x) => x.typeId === typeId);
    const prm = u?.parameters.find((x) => x.name === param);
    if (!u || !prm) return { short: fallback, full: fallback };
    const short = `${formatChem(prm.name)}${prm.unit ? ` (${formatUnit(prm.unit)})` : ""}`;
    return { short, full: `${short} · ${u.name}` };
  };

  const [y1Cfg, setY1Cfg] = useState<AxisConfig>({ auto: true, minText: "0", maxText: "100", stepText: "20" });
  const [y2Cfg, setY2Cfg] = useState<AxisConfig>({ auto: true, minText: "0", maxText: "50", stepText: "10" });
  const y1Last = useRef({ min: 0, max: 100, step: 20 });
  const y2Last = useRef({ min: 0, max: 50, step: 10 });

  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [pinnedIndex, setPinnedIndex] = useState<number | null>(null);

  const rangeKey = isCustomMode ? "custom" : RANGE_KEYS[timeDuration] ?? "";
  const customError = !isCustomMode
    ? ""
    : !startDate || !endDate
    ? "Pick both a start date and an end date."
    : endDate < startDate
    ? "The end date must be on or after the start date."
    : "";

  const [series, setSeries] = useState<ChartPoint[]>([]);
  const [seriesMeta, setSeriesMeta] = useState<{ y1: SeriesMeta; y2: SeriesMeta; info: string } | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState("");

  // Real data: re-fetch whenever a selection changes
  useEffect(() => {
    setSeries([]);
    setSeriesMeta(null);
    setDataError("");
    if (!y1TypeId || !y1Param || !y2TypeId || !y2Param || !rangeKey || customError) return;

    const ctrl = new AbortController();
    setDataLoading(true);

    const qs = new URLSearchParams({
      y1TypeId,
      y1Param,
      y2TypeId,
      y2Param,
      range: rangeKey,
    });
    if (rangeKey === "custom") {
      qs.set("from", startDate);
      qs.set("to", endDate);
    }

    (async () => {
      try {
        const res = await fetch(`/api/manager/analytics?${qs.toString()}`, { signal: ctrl.signal });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error || "Failed to load analytics data");
        setSeries(json.data.points as ChartPoint[]);
        setSeriesMeta({ y1: json.data.y1, y2: json.data.y2, info: json.data.info });
      } catch (e: any) {
        if (e?.name !== "AbortError") setDataError(e?.message || "Failed to load analytics data");
      } finally {
        if (!ctrl.signal.aborted) setDataLoading(false);
      }
    })();

    return () => ctrl.abort();
  }, [y1TypeId, y1Param, y2TypeId, y2Param, rangeKey, startDate, endDate, customError]);

  const currentScatterData = series;
  const hasAnyData = series.some((p) => p.y1 !== null || p.y2 !== null);
  const pointCount = currentScatterData.length;

  const domainFor = (isY1: boolean): AxisDomain => {
    const vals = currentScatterData
      .map((p) => (isY1 ? p.y1 : p.y2))
      .filter((v): v is number => v !== null);
    if (vals.length === 0) return null;

    let lo = Math.min(...vals);
    let hi = Math.max(...vals);
    const baseSpan = Math.max(hi - lo, Math.abs((hi + lo) / 2) * 0.05, 1e-6);

    // Include the standard min/max so the safe band is visible - unless that would squash the data.
    const m = isY1 ? seriesMeta?.y1 : seriesMeta?.y2;
    for (const lim of [m?.standardMin ?? null, m?.standardMax ?? null]) {
      if (lim === null) continue;
      const nlo = Math.min(lo, lim);
      const nhi = Math.max(hi, lim);
      if (nhi - nlo <= baseSpan * 3) {
        lo = nlo;
        hi = nhi;
      }
    }
    return { lo, hi, nonNegative: vals.every((v) => v >= 0) && (m?.standardMin ?? 0) >= 0 };
  };

  const y1Axis = resolveAxis(y1Cfg, domainFor(true), y1Last.current);
  const y2Axis = resolveAxis(y2Cfg, domainFor(false), y2Last.current);

  useEffect(() => {
    if (!y1Axis.warning) y1Last.current = { min: y1Axis.min, max: y1Axis.max, step: y1Axis.step };
    if (!y2Axis.warning) y2Last.current = { min: y2Axis.min, max: y2Axis.max, step: y2Axis.step };
  });

  const y1OverCount = currentScatterData.filter((p) => p.y1 !== null && p.y1 > y1Axis.max).length;
  const y2OverCount = currentScatterData.filter((p) => p.y2 !== null && p.y2 > y2Axis.max).length;

  useEffect(() => {
    setHoverIndex(null);
    setPinnedIndex(null);
  }, [timeDuration, isCustomMode, startDate, endDate, series]);

  const activeIndex = hoverIndex ?? pinnedIndex;
  const activePoint = activeIndex !== null ? currentScatterData[activeIndex] ?? null : null;

  const getXPercent = (i: number) => (pointCount > 1 ? (i / (pointCount - 1)) * 100 : 50);

  const getY1Position = (val: number) => getPos(val, y1Axis.max, y1Axis.min);
  const getY2Position = (val: number) => getPos(val, y2Axis.max, y2Axis.min);

  // Builds one continuous line through the days that have readings.
  // Days with no reading get no dot, but the line simply carries on to the next real reading.
  const generateSmoothCurvePath = (isY1: boolean) => {
    const n = currentScatterData.length;
    const run: { x: number; y: number }[] = [];
    currentScatterData.forEach((pt, i) => {
      const v = isY1 ? pt.y1 : pt.y2;
      if (v === null) return;
      run.push({ x: n > 1 ? (i / (n - 1)) * 100 : 50, y: isY1 ? getY1Position(v) : getY2Position(v) });
    });
    return smoothRun(run);
  };

  const activeLeft = activeIndex !== null ? getXPercent(activeIndex) : 0;
  // The tooltip slides with the pointer (left-aligned at 0%, centred at 50%, right-aligned at 100%)
  // so it always stays inside the plot area, even on a narrow phone screen.
  const popupShift = -activeLeft;
  const popupAtBottom =
    activePoint !== null &&
    (() => {
      const ys: number[] = [];
      if (activePoint.y1 !== null) ys.push(getY1Position(activePoint.y1));
      if (activePoint.y2 !== null) ys.push(getY2Position(activePoint.y2));
      return ys.length > 0 && ys.reduce((a, b) => a + b, 0) / ys.length < 50;
    })();

  const dotSize = pointCount > 15 ? "w-2 h-2 sm:w-2.5 sm:h-2.5" : "w-3 h-3 sm:w-3.5 sm:h-3.5";
  const verticalGridStride = Math.max(1, Math.ceil(pointCount / 8));

  // X-axis labels: fewer labels on small screens so they never overlap
  const smLabelStride = Math.max(1, Math.ceil(pointCount / 16));
  const mobileLabelStride = smLabelStride * Math.max(1, Math.ceil(pointCount / (7 * smLabelStride)));
  const labelVisibility = (i: number) =>
    i % mobileLabelStride === 0 ? "flex" : i % smLabelStride === 0 ? "hidden sm:flex" : "hidden md:flex";

  // Touch / mouse: pick the data point nearest to the pointer position
  const indexFromPointer = (e: React.PointerEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>) => {
    if (pointCount <= 1) return 0;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    return Math.max(0, Math.min(pointCount - 1, Math.round(ratio * (pointCount - 1))));
  };

  const y1Labels = axisLabels(y1TypeId, y1Param, "Y1");
  const y2Labels = axisLabels(y2TypeId, y2Param, "Y2");
  const y1Label = y1Labels.short; // short label for tooltip rows
  const y2Label = y2Labels.short;

  // ---- Summary numbers shown under the chart ----
  const fmt = (n: number) => String(Number(n.toFixed(2)));

  const seriesStats = (isY1: boolean) => {
    const m = isY1 ? seriesMeta?.y1 : seriesMeta?.y2;
    let sum = 0, count = 0, periods = 0, outPeriods = 0;
    let min = Infinity, max = -Infinity;
    let latest: number | null = null;
    for (const p of series) {
      const avg = isY1 ? p.y1 : p.y2;
      const c = (isY1 ? p.y1Count : p.y2Count) ?? 0;
      if (avg === null || c === 0) continue;
      sum += avg * c;
      count += c;
      periods += 1;
      min = Math.min(min, (isY1 ? p.y1Min : p.y2Min) ?? avg);
      max = Math.max(max, (isY1 ? p.y1Max : p.y2Max) ?? avg);
      latest = avg;
      if (m && ((m.standardMin !== null && avg < m.standardMin) || (m.standardMax !== null && avg > m.standardMax))) {
        outPeriods += 1;
      }
    }
    if (count === 0) return null;
    return { latest: latest as number, avg: sum / count, min, max, count, periods, outPeriods };
  };

  const renderSeriesCard = (isY1: boolean) => {
    const labels = isY1 ? y1Labels : y2Labels;
    const param = isY1 ? y1Param : y2Param;
    const axis = isY1 ? y1Axis : y2Axis;
    const m = isY1 ? seriesMeta?.y1 : seriesMeta?.y2;
    const st = seriesStats(isY1);
    const limits = m ? formatLimits(m.standardMin, m.standardMax, m.unit) : "";
    const box = isY1 ? "bg-blue-400/15 border-blue-400/40" : "bg-purple-400/15 border-purple-400/40";
    const dot = isY1 ? "bg-blue-500" : "bg-purple-500";
    const nameColor = isY1 ? "text-blue-700" : "text-purple-700";

    const cells: [string, string][] = st
      ? [
          ["Latest", fmt(st.latest)],
          ["Average", fmt(st.avg)],
          ["Min", fmt(st.min)],
          ["Max", fmt(st.max)],
          ["Readings", String(st.count)],
          ["Out of std", limits ? `${st.outPeriods}/${st.periods}` : "-"],
        ]
      : [];

    return (
      <div className={`p-3.5 sm:p-4 rounded-2xl backdrop-blur-xl border text-slate-700 ${box}`}>
        <div className="flex items-start gap-2.5">
          <div className={`w-3 h-3 mt-0.5 rounded-full flex-shrink-0 ${dot}`} />
          <div className="min-w-0">
            <div className="text-xs font-bold">
              {isY1 ? "Y1 (Blue)" : "Y2 (Purple)"}:{" "}
              <span className={`${nameColor} font-semibold break-words`}>{param ? labels.full : "Not selected"}</span>
            </div>
            <div className="text-[11px] text-slate-600 mt-0.5">
              {isY1 ? "Left" : "Right"} scale {axis.min} - {axis.max} (step {axis.step})
              {limits && <> · Standard: {limits}</>}
            </div>
          </div>
        </div>
        {st ? (
          <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-3 gap-2 mt-3">
            {cells.map(([label, value]) => (
              <div
                key={label}
                title={label === "Out of std" ? "Periods whose average is outside the standard range" : undefined}
                className="rounded-xl bg-white/50 border border-white/70 px-2 py-1.5 text-center"
              >
                <div className="text-[9px] uppercase tracking-wide text-slate-500">{label}</div>
                <div className="text-sm font-bold text-slate-800">{value}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-slate-500 mt-3">
            {dataLoading ? "Loading..." : param ? "No readings in this period." : "Select a unit and parameter."}
          </p>
        )}
      </div>
    );
  };

  // Dashed lines on the chart at the standard min / max so good vs bad is visible at a glance
  const limitLines = (m: SeriesMeta | undefined, axis: ResolvedAxis, color: string, tag: string) =>
    m
      ? ([["min", m.standardMin], ["max", m.standardMax]] as const).map(([k, v]) =>
          v !== null && v >= axis.min && v <= axis.max ? (
            <div
              key={`${tag}-${k}`}
              className="absolute inset-x-0 border-t border-dashed z-[5]"
              style={{ top: `${getPos(v, axis.max, axis.min)}%`, borderColor: color }}
            >
              <span
                className={`absolute ${tag === "Y1" ? "left-1" : "right-1"} -top-3 text-[9px] font-mono leading-none`}
                style={{ color }}
              >
                {tag} {k} {v}
              </span>
            </div>
          ) : null
        )
      : null;

  const renderAxisControls = (opts: {
    title: string;
    titleColor: string;
    unitId: string;
    setUnitId: (v: string) => void;
    param: string;
    setParam: (v: string) => void;
    paramOptions: Option[];
    placeholder: string;
    cfg: AxisConfig;
    setCfg: React.Dispatch<React.SetStateAction<AxisConfig>>;
    axis: ResolvedAxis;
    overCount: number;
  }) => {
    const { title, titleColor, unitId, setUnitId, param, setParam, paramOptions, placeholder, cfg, setCfg, axis, overCount } = opts;
    const inputClass = `${glassFieldBase} w-24 sm:w-20 px-2 py-2 sm:py-1.5 min-h-[44px] sm:min-h-0 text-base sm:text-xs disabled:bg-white/30 disabled:text-slate-400`;

    return (
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
          <div className={`flex items-center gap-2 text-xs font-bold ${titleColor}`}>
            <Sliders size={14} />
            <span className="whitespace-nowrap">{title}</span>
          </div>
          <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-2">
            <GlassSelect
              size="sm"
              value={unitId}
              onChange={(v) => {
                setUnitId(v);
                setParam(""); // parameter list changes with the unit
              }}
              options={unitOptions}
              placeholder={optionsLoading ? "Loading units..." : "Select unit / tank..."}
              disabled={optionsLoading || unitOptions.length === 0}
            />
            <GlassSelect
              size="sm"
              value={param}
              onChange={setParam}
              options={paramOptions}
              placeholder={unitId ? placeholder : "Select a unit first"}
              disabled={!unitId}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() =>
              cfg.auto
                ? setCfg({ auto: false, minText: String(axis.min), maxText: String(axis.max), stepText: String(axis.step) })
                : setCfg({ ...cfg, auto: true })
            }
            className={`px-4 sm:px-3.5 py-2.5 sm:py-1.5 min-h-[44px] sm:min-h-0 rounded-full border text-xs font-semibold cursor-pointer transition-all hover:-translate-y-0.5 ${
              cfg.auto
                ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white border-white/30 shadow-md shadow-blue-500/30"
                : "bg-white/60 text-slate-700 border-white/70 hover:bg-white/90 backdrop-blur-xl"
            }`}
          >
            Auto
          </button>

          <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
            Min
            <input
              type="number"
              inputMode="decimal"
              step="any"
              disabled={cfg.auto}
              value={cfg.auto ? String(axis.min) : cfg.minText}
              onChange={(e) => setCfg({ ...cfg, minText: e.target.value })}
              className={inputClass}
            />
          </label>

          <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
            Max
            <input
              type="number"
              inputMode="decimal"
              step="any"
              min="0"
              disabled={cfg.auto}
              value={cfg.auto ? String(axis.max) : cfg.maxText}
              onChange={(e) => setCfg({ ...cfg, maxText: e.target.value })}
              className={inputClass}
            />
          </label>

          <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
            Step
            <input
              type="number"
              inputMode="decimal"
              step="any"
              min="0"
              disabled={cfg.auto}
              value={cfg.auto ? String(axis.step) : cfg.stepText}
              onChange={(e) => setCfg({ ...cfg, stepText: e.target.value })}
              className={inputClass}
            />
          </label>
        </div>

        {axis.warning && <p className="text-[11px] font-medium text-amber-700">{axis.warning}</p>}
        {overCount > 0 && (
          <p className="text-[11px] font-medium text-amber-700">
            {overCount} value{overCount > 1 ? "s are" : " is"} above the max and shown at the top edge (▲). Increase Max to see {overCount > 1 ? "them" : "it"}.
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Page Header */}
      <div className={`${glass} p-4 sm:p-6 rounded-3xl`}>
        <h1 className="text-lg sm:text-2xl font-semibold tracking-tight text-slate-900 flex items-start sm:items-center gap-3 leading-tight">
          <span className="p-2 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow-lg shadow-blue-500/30 ring-1 ring-inset ring-white/40 shrink-0">
            <BarChart3 size={22} />
          </span>
          <span className="mt-1 sm:mt-0">Analytics & Water Quality Trends</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 mt-2">
          Dual-axis analytics with sleek single-line curved trend paths passing directly through data points.
        </p>
      </div>

      {/* 📊 Advanced Dual-Axis Scatter Diagram */}
      <div className={`${glass} relative z-20 p-4 sm:p-6 rounded-3xl space-y-4 sm:space-y-6`}>
        <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 pb-4 border-b border-white/50">
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-semibold tracking-tight text-slate-900 flex items-start sm:items-center gap-2 leading-snug">
              <GitPullRequest className="text-blue-600 shrink-0 mt-0.5 sm:mt-0" size={20} />
              Dual-Axis Time-Series Scatter & Trendline Analysis
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              Clean single-line curved paths aligned seamlessly across all data nodes.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 w-full lg:w-auto">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
              <Clock size={14} className="text-blue-600" />
              <span>Duration:</span>
            </div>
            <div className="w-full sm:w-64">
              <GlassSelect
                size="sm"
                value={isCustomMode ? "Custom Range" : timeDuration}
                options={durationOptions}
                placeholder="Select duration..."
                onChange={(v) => {
                  if (v === "Custom Range") {
                    // Default the custom range to "this month so far" the first time it is opened
                    if (!startDate || !endDate) {
                      const d = new Date();
                      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
                      if (!startDate) setStartDate(`${ym}-01`);
                      if (!endDate) setEndDate(`${ym}-${String(d.getDate()).padStart(2, "0")}`);
                    }
                    setIsCustomMode(true);
                  } else {
                    setIsCustomMode(false);
                    setTimeDuration(v);
                  }
                }}
              />
            </div>
          </div>
        </div>

        {isCustomMode && (
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap sm:items-center gap-3 sm:gap-4 bg-blue-400/15 backdrop-blur-xl p-3.5 rounded-2xl border border-blue-400/40 animate-in fade-in duration-200">
            <span className="col-span-2 text-xs font-bold text-blue-900">Custom Date Filter:</span>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0">
              <label htmlFor="range-from" className="text-xs font-medium text-slate-700">From:</label>
              <input
                id="range-from"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={`${glassFieldBase} w-full min-w-0 px-2.5 py-2 sm:py-1 min-h-[44px] sm:min-h-0 text-base sm:text-xs`}
              />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0">
              <label htmlFor="range-to" className="text-xs font-medium text-slate-700">To:</label>
              <input
                id="range-to"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={`${glassFieldBase} w-full min-w-0 px-2.5 py-2 sm:py-1 min-h-[44px] sm:min-h-0 text-base sm:text-xs`}
              />
            </div>
            {customError ? (
              <span className="col-span-2 text-xs font-semibold text-red-600">{customError}</span>
            ) : (
              <span className="col-span-2 text-xs font-medium text-blue-800">{seriesMeta?.info ?? ""}</span>
            )}
          </div>
        )}

        {optionsError && (
          <p className="text-xs font-semibold text-red-600">Could not load units/parameters: {optionsError}</p>
        )}

        {/* Axis controls */}
        <div className="relative z-20 grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-4 bg-white/30 backdrop-blur-xl p-3 sm:p-4 rounded-2xl border border-white/60">
          {renderAxisControls({
            title: "Y1 Axis (Left):",
            titleColor: "text-blue-700",
            unitId: y1TypeId,
            setUnitId: setY1TypeId,
            param: y1Param,
            setParam: setY1Param,
            paramOptions: paramOptionsFor(y1TypeId),
            placeholder: "Select Y1 parameter...",
            cfg: y1Cfg,
            setCfg: setY1Cfg,
            axis: y1Axis,
            overCount: y1OverCount,
          })}
          {renderAxisControls({
            title: "Y2 Axis (Right):",
            titleColor: "text-purple-700",
            unitId: y2TypeId,
            setUnitId: setY2TypeId,
            param: y2Param,
            setParam: setY2Param,
            paramOptions: paramOptionsFor(y2TypeId),
            placeholder: "Select Y2 parameter...",
            cfg: y2Cfg,
            setCfg: setY2Cfg,
            axis: y2Axis,
            overCount: y2OverCount,
          })}
        </div>

        {/* Dual-Axis Visual Board */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_20rem] gap-4 sm:gap-5 w-full items-stretch">
          <div className="w-full bg-slate-900/85 backdrop-blur-2xl rounded-3xl p-3 sm:p-6 relative h-[24rem] sm:h-[21rem] lg:h-auto lg:min-h-[21rem] flex flex-col justify-between text-slate-300 border border-white/10 ring-1 ring-inset ring-white/10 overflow-hidden shadow-[0_20px_60px_rgba(15,23,42,0.35)]">

            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-0.5 text-[10px] sm:text-[11px] font-mono text-slate-400 z-10 px-1 sm:px-6">
              <span className="text-blue-400 font-bold break-words">Y1: {y1Param ? y1Labels.full : "Not selected"} (Blue Series)</span>
              <span className="text-purple-400 font-bold break-words">Y2: {y2Param ? y2Labels.full : "Not selected"} (Purple Series)</span>
            </div>

            <div className="relative flex-1 flex items-center px-8 sm:px-10 my-2">
              <div className="absolute left-0 w-8 sm:w-10 inset-y-2 pointer-events-none">
                {y1Axis.ticks.map((t, idx) => (
                  <span
                    key={idx}
                    className="absolute right-1 -translate-y-1/2 text-[9px] sm:text-[10px] font-mono text-blue-400/80 leading-none"
                    style={{ top: `${getPos(t, y1Axis.max, y1Axis.min)}%` }}
                  >
                    {t.toFixed(y1Axis.decimals)}
                  </span>
                ))}
              </div>

              <div className="absolute right-0 w-8 sm:w-10 inset-y-2 pointer-events-none">
                {y2Axis.ticks.map((t, idx) => (
                  <span
                    key={idx}
                    className="absolute left-1 -translate-y-1/2 text-[9px] sm:text-[10px] font-mono text-purple-400/80 leading-none"
                    style={{ top: `${getPos(t, y2Axis.max, y2Axis.min)}%` }}
                  >
                    {t.toFixed(y2Axis.decimals)}
                  </span>
                ))}
              </div>

              <div className="absolute inset-x-8 sm:inset-x-10 inset-y-2 pointer-events-none">
                {y1Axis.ticks.map((t, idx) => (
                  <div
                    key={`hg-${idx}`}
                    className="absolute inset-x-0 h-px bg-white/15"
                    style={{ top: `${getPos(t, y1Axis.max, y1Axis.min)}%` }}
                  >
                    <div className="absolute -left-1.5 w-1.5 h-px bg-blue-400/70" />
                  </div>
                ))}
                {y2Axis.ticks.map((t, idx) => (
                  <div
                    key={`rt-${idx}`}
                    className="absolute -right-1.5 w-1.5 h-px bg-purple-400/70"
                    style={{ top: `${getPos(t, y2Axis.max, y2Axis.min)}%` }}
                  />
                ))}

                {pointCount > 0 && limitLines(seriesMeta?.y1, y1Axis, "rgba(96,165,250,0.85)", "Y1")}
                {pointCount > 0 && limitLines(seriesMeta?.y2, y2Axis, "rgba(192,132,252,0.85)", "Y2")}

                {currentScatterData.map((_, i) =>
                  i % verticalGridStride === 0 ? (
                    <div
                      key={`vg-${i}`}
                      className="absolute top-0 bottom-0 w-px bg-white/10"
                      style={{ left: `${getXPercent(i)}%` }}
                    />
                  ) : null
                )}

                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full overflow-visible">
                  <path
                    d={generateSmoothCurvePath(true)}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                  />
                  <path
                    d={generateSmoothCurvePath(false)}
                    fill="none"
                    stroke="#a855f7"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>

                {pointCount === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center text-center px-2 text-xs font-medium text-slate-500">
                    {!y1Param && !y2Param
                      ? "Select Y1 and Y2 parameters to see the chart"
                      : !y1Param
                      ? "Select a Y1 parameter to see the chart"
                      : !y2Param
                      ? "Select a Y2 parameter to see the chart"
                      : !isCustomMode && !timeDuration
                      ? "Select a duration to see the chart"
                      : customError
                      ? customError
                      : dataLoading
                      ? "Loading data..."
                      : dataError
                      ? dataError
                      : "Select a valid date range to see the chart"}
                  </div>
                )}

                {pointCount > 0 && !hasAnyData && (
                  <div className="absolute inset-0 flex items-center justify-center text-center px-2 text-xs font-medium text-slate-400 z-10">
                    No verified readings found for this selection in the chosen period
                  </div>
                )}

                {activeIndex !== null && activePoint && (
                  <div
                    className="absolute top-0 bottom-0 w-px bg-white/30 z-10"
                    style={{ left: `${activeLeft}%` }}
                  />
                )}

                {/* One touch-friendly layer: finds the nearest data point from the finger / mouse position.
                    touch-pan-y keeps normal vertical page scrolling working on phones. */}
                {pointCount > 0 && (
                  <div
                    className="absolute inset-0 z-20 pointer-events-auto cursor-pointer touch-pan-y"
                    onPointerDown={(e) => setHoverIndex(indexFromPointer(e))}
                    onPointerMove={(e) => setHoverIndex(indexFromPointer(e))}
                    onPointerUp={(e) => {
                      if (e.pointerType !== "mouse") setHoverIndex(null);
                    }}
                    onPointerCancel={() => setHoverIndex(null)}
                    onPointerLeave={() => setHoverIndex(null)}
                    onClick={(e) => {
                      const i = indexFromPointer(e);
                      setPinnedIndex((prev) => (prev === i ? null : i));
                    }}
                  />
                )}

                {currentScatterData.map((pt, i) => {
                  const leftPercentage = getXPercent(i);
                  const y1Pos = pt.y1 !== null ? getY1Position(pt.y1) : 0;
                  const y2Pos = pt.y2 !== null ? getY2Position(pt.y2) : 0;
                  const isActive = activeIndex === i;

                  return (
                    <React.Fragment key={i}>
                      {pt.y1 !== null && (
                      <div
                        className="absolute pointer-events-none -translate-x-1/2 -translate-y-1/2 transition-all duration-300 z-30"
                        style={{ left: `${leftPercentage}%`, top: `${y1Pos}%` }}
                      >
                        <div className={`${dotSize} rounded-full bg-blue-500 border sm:border-2 border-white shadow-lg shadow-blue-500/80 transition-transform ${isActive ? "scale-150" : ""}`} />
                        {pt.y1 > y1Axis.max && (
                          <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-[9px] leading-none text-blue-300">▲</span>
                        )}
                      </div>
                      )}

                      {pt.y2 !== null && (
                      <div
                        className="absolute pointer-events-none -translate-x-1/2 -translate-y-1/2 transition-all duration-300 z-30"
                        style={{ left: `${leftPercentage}%`, top: `${y2Pos}%` }}
                      >
                        <div className={`${dotSize} rounded-full bg-purple-500 border sm:border-2 border-white shadow-lg shadow-purple-500/80 transition-transform ${isActive ? "scale-150" : ""}`} />
                        {pt.y2 > y2Axis.max && (
                          <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-[9px] leading-none text-purple-300">▲</span>
                        )}
                      </div>
                      )}
                    </React.Fragment>
                  );
                })}

                {activeIndex !== null && activePoint && (
                  <div
                    className={`absolute z-50 pointer-events-none ${popupAtBottom ? "bottom-0" : "top-0"}`}
                    style={{ left: `${activeLeft}%`, transform: `translateX(${popupShift}%)` }}
                  >
                    <div className="w-max max-w-[11.5rem] sm:max-w-[18rem] bg-slate-800/95 backdrop-blur-xl border border-white/20 rounded-xl shadow-xl px-3 py-2 text-[11px] text-white space-y-1.5">
                      <div className="font-bold text-slate-100 break-words">{activePoint.fullLabel ?? activePoint.time}</div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                        <span className="text-blue-300">{y1Label}:</span>
                        <span className="font-semibold">{activePoint.y1 ?? "No data"}</span>
                        {activePoint.y1 !== null && (activePoint.y1Count ?? 0) > 0 && (
                          <span className="text-slate-400 text-[10px]">
                            n={activePoint.y1Count}
                            {(activePoint.y1Count ?? 0) > 1 ? ` · min ${activePoint.y1Min} · max ${activePoint.y1Max}` : ""}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
                        <span className="text-purple-300">{y2Label}:</span>
                        <span className="font-semibold">{activePoint.y2 ?? "No data"}</span>
                        {activePoint.y2 !== null && (activePoint.y2Count ?? 0) > 0 && (
                          <span className="text-slate-400 text-[10px]">
                            n={activePoint.y2Count}
                            {(activePoint.y2Count ?? 0) > 1 ? ` · min ${activePoint.y2Min} · max ${activePoint.y2Max}` : ""}
                          </span>
                        )}
                      </div>
                      <div>
                        <span className={`inline-block px-2 py-0.5 rounded-full border text-[10px] font-semibold ${statusStyle(activePoint.status)}`}>
                          {activePoint.status}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="relative h-8 mx-8 sm:mx-10 z-10">
              {currentScatterData.map((pt, i) => (
                <button
                  key={i}
                  type="button"
                  onMouseEnter={() => setHoverIndex(i)}
                  onMouseLeave={() => setHoverIndex(null)}
                  onClick={() => setPinnedIndex((prev) => (prev === i ? null : i))}
                  className={`absolute top-0 -translate-x-1/2 flex-col items-center leading-tight whitespace-nowrap text-[9px] sm:text-[10px] font-mono cursor-pointer transition-colors ${labelVisibility(i)} ${
                    activeIndex === i ? "text-white font-bold" : "text-slate-400"
                  }`}
                  style={{ left: `${getXPercent(i)}%` }}
                >
                  <span>{pt.time}</span>
                  {pt.sub && <span className="text-[8px] text-slate-500">{pt.sub}</span>}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap justify-between items-center gap-x-4 gap-y-1 text-[10px] font-mono text-slate-500 pt-3 border-t border-white/10 z-10 px-1 sm:px-4">
              <span className="break-words">
                Timeline: {isCustomMode ? `${startDate} → ${endDate}` : timeDuration || "Not selected"}
              </span>
              <span className="text-blue-400 font-bold">Touch / hover a date for details</span>
              <span className="hidden sm:inline">{dataLoading ? "Loading..." : seriesMeta ? "Live data" : ""}</span>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">Series Summary</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-3 text-xs">
              {renderSeriesCard(true)}
              {renderSeriesCard(false)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}