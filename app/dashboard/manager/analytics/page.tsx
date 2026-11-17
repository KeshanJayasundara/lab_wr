"use client";

import React, { useEffect, useRef, useState } from "react";
import { BarChart3, GitPullRequest, Sliders, Clock, ChevronDown, Check } from "lucide-react";

type ChartPoint = {
  time: string;
  sub?: string;
  fullLabel?: string;
  y1: number;
  y2: number;
  status: string;
};

type AxisConfig = { auto: boolean; maxText: string; stepText: string };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const glass =
  "bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_32px_rgba(15,23,42,0.10)] ring-1 ring-inset ring-white/40";

const glassFieldBase =
  "rounded-2xl border border-white/70 bg-white/60 backdrop-blur-xl font-medium text-slate-800 placeholder:text-slate-400 shadow-sm " +
  "transition-all duration-300 ease-out hover:bg-white/85 hover:border-blue-300 " +
  "focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:bg-white/90";

type Option = { value: string; label: string };

function GlassSelect({
  value,
  options,
  onChange,
  size = "md",
  placeholder = "Select...",
}: {
  value: string;
  options: Option[];
  onChange: (v: string) => void;
  size?: "md" | "sm";
  placeholder?: string;
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
        onClick={() => setOpen((o) => !o)}
        className={`${glassFieldBase} ${sizeClass} w-full cursor-pointer flex items-center justify-between gap-2 text-left hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(59,130,246,0.25)]`}
      >
        <span className={`truncate ${selected ? "" : "text-slate-400"}`}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown
          size={size === "sm" ? 14 : 16}
          className={`flex-shrink-0 text-blue-600 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
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
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`flex items-center justify-between gap-3 px-3 py-3 sm:py-2 rounded-xl text-sm sm:text-xs cursor-pointer transition-all duration-200 ease-out hover:bg-blue-500/15 hover:text-blue-700 hover:translate-x-1 ${
                  isSelected ? "bg-blue-500/10 font-semibold text-blue-700" : "text-slate-700"
                }`}
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

const toOptions = (labels: string[]): Option[] => labels.map((l) => ({ value: l, label: l }));

const durationOptions: Option[] = [
  { value: "Past 24 Hours", label: "Past 24 Hours (Hourly)" },
  { value: "Past 7 Days", label: "Past 7 Days (Daily)" },
  { value: "Past 30 Days", label: "Past 30 Days (Day-by-Day)" },
  { value: "This Month", label: "This Month - Nov 2026 (Day-by-Day)" },
  { value: "Custom Range", label: "Custom Date Range..." },
];

const NICE_MAX = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
const NICE_STEP = [1, 2, 2.5, 5, 10];

const niceCeil = (v: number) => {
  if (!isFinite(v) || v <= 0) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(v)));
  const f = v / exp;
  const nf = NICE_MAX.find((n) => n >= f - 1e-9) ?? 10;
  return Number((nf * exp).toPrecision(6));
};

const niceStep = (max: number) => {
  const raw = max / 5;
  const exp = Math.pow(10, Math.floor(Math.log10(raw)));
  const f = raw / exp;
  const nf = NICE_STEP.find((n) => n >= f - 1e-9) ?? 10;
  return Number((nf * exp).toPrecision(6));
};

const decimalsOf = (n: number) => {
  const s = n.toString();
  if (s.includes("e-")) return parseInt(s.split("e-")[1], 10);
  const d = s.split(".")[1];
  return d ? d.length : 0;
};

type ResolvedAxis = { max: number; step: number; decimals: number; ticks: number[]; warning: string };

const resolveAxis = (cfg: AxisConfig, dataMax: number, fallback: { max: number; step: number }): ResolvedAxis => {
  let warning = "";

  let max = cfg.auto ? niceCeil(dataMax * 1.02) : parseFloat(cfg.maxText);
  if (!isFinite(max) || max <= 0) {
    warning = "Max must be a number greater than 0 - keeping the previous max.";
    max = fallback.max;
  }

  let step = cfg.auto ? niceStep(max) : parseFloat(cfg.stepText);
  if (!isFinite(step) || step <= 0) {
    warning = warning || "Step must be a number greater than 0 - using an automatic step.";
    step = niceStep(max);
  }

  if (Math.ceil(max / step - 1e-9) > 10) {
    const s = niceStep(max);
    warning = warning || `Step is too small (more than 10 intervals) - showing every ${s} instead.`;
    step = s;
  }

  const decimals = Math.min(4, Math.max(decimalsOf(step), decimalsOf(max)));

  const ticks: number[] = [];
  for (let i = 0; i * step < max - 1e-9; i++) {
    ticks.push(Number((i * step).toFixed(6)));
  }
  ticks.push(max);

  return { max, step, decimals, ticks, warning };
};

const getPos = (val: number, max: number) => Math.max(0, Math.min(100, 100 - (val / max) * 100));

const buildDailySeries = (start: Date, days: number): ChartPoint[] =>
  Array.from({ length: days }, (_, i) => {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const seed = d.getMonth() * 31 + d.getDate();
    const y1 = Math.max(25, Math.min(98, Math.round(52 + 22 * Math.sin(seed * 0.55) + 12 * Math.sin(seed * 1.7))));
    const y2 = Math.max(6, Math.min(48, Math.round(y1 * 0.42 + 6 * Math.cos(seed * 0.9) - 4)));
    const status = y1 >= 80 ? "Critical" : y1 >= 65 ? "Warning" : "Normal";
    const dd = String(d.getDate()).padStart(2, "0");
    return {
      time: dd,
      sub: i === 0 || d.getDate() === 1 ? MONTHS[d.getMonth()] : undefined,
      fullLabel: `${WEEKDAYS[d.getDay()]}, ${dd} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`,
      y1,
      y2,
      status,
    };
  });

const MAX_RANGE_DAYS = 366;
const MAX_POINTS = 31;

const parseLocalDate = (s: string): Date | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return isNaN(d.getTime()) ? null : d;
};

const formatDay = (d: Date) =>
  `${String(d.getDate()).padStart(2, "0")} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;

type CustomSeries = { data: ChartPoint[]; error: string; info: string };

const buildCustomSeries = (startStr: string, endStr: string): CustomSeries => {
  const start = parseLocalDate(startStr);
  const end = parseLocalDate(endStr);
  if (!start || !end) return { data: [], error: "Pick both a start date and an end date.", info: "" };

  let days = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
  if (days < 1) return { data: [], error: "The end date must be on or after the start date.", info: "" };

  let limitNote = "";
  if (days > MAX_RANGE_DAYS) {
    days = MAX_RANGE_DAYS;
    limitNote = ` (limited to the first ${MAX_RANGE_DAYS} days)`;
  }

  const daily = buildDailySeries(start, days);
  if (days <= MAX_POINTS) {
    return { data: daily, error: "", info: `${days} day${days > 1 ? "s" : ""} selected${limitNote}` };
  }

  const bucket = Math.ceil(days / MAX_POINTS);
  const data: ChartPoint[] = [];
  let prevMonth = -1;
  for (let s = 0; s < days; s += bucket) {
    const chunk = daily.slice(s, s + bucket);
    const first = new Date(start.getFullYear(), start.getMonth(), start.getDate() + s);
    const last = new Date(start.getFullYear(), start.getMonth(), start.getDate() + s + chunk.length - 1);
    const y1 = Math.round(chunk.reduce((a, p) => a + p.y1, 0) / chunk.length);
    const y2 = Math.round(chunk.reduce((a, p) => a + p.y2, 0) / chunk.length);
    data.push({
      time: String(first.getDate()).padStart(2, "0"),
      sub: first.getMonth() !== prevMonth ? MONTHS[first.getMonth()] : undefined,
      fullLabel: `${formatDay(first)} - ${formatDay(last)} (average of ${chunk.length} days)`,
      y1,
      y2,
      status: y1 >= 80 ? "Critical" : y1 >= 65 ? "Warning" : "Normal",
    });
    prevMonth = first.getMonth();
  }
  return {
    data,
    error: "",
    info: `${days} days selected${limitNote} - each point is the average of ${bucket} days`,
  };
};

const statusStyle = (status: string) => {
  if (status === "Critical") return "bg-red-500/20 text-red-300 border-red-500/40";
  if (status === "Warning") return "bg-amber-500/20 text-amber-300 border-amber-500/40";
  return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
};

export default function ManagerAnalyticsPage() {
  // No default selections: every dropdown starts empty and shows its placeholder.
  const [timeDuration, setTimeDuration] = useState("");
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [startDate, setStartDate] = useState("2026-11-01");
  const [endDate, setEndDate] = useState("2026-11-30");

  const [y1Param, setY1Param] = useState("");
  const [y2Param, setY2Param] = useState("");

  const [y1Cfg, setY1Cfg] = useState<AxisConfig>({ auto: true, maxText: "100", stepText: "20" });
  const [y2Cfg, setY2Cfg] = useState<AxisConfig>({ auto: true, maxText: "50", stepText: "10" });
  const y1Last = useRef({ max: 100, step: 20 });
  const y2Last = useRef({ max: 50, step: 10 });

  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [pinnedIndex, setPinnedIndex] = useState<number | null>(null);

  const customSeries: CustomSeries = isCustomMode
    ? buildCustomSeries(startDate, endDate)
    : { data: [], error: "", info: "" };

  const getDataset = (): ChartPoint[] => {
    // Chart stays hidden until both Y1 and Y2 parameters are selected
    if (!y1Param || !y2Param) return [];

    if (isCustomMode) return customSeries.data;

    if (timeDuration === "Past 24 Hours") {
      return [
        { time: "00:00", y1: 35, y2: 10, status: "Normal" },
        { time: "04:00", y1: 42, y2: 12, status: "Normal" },
        { time: "08:00", y1: 65, y2: 22, status: "Warning" },
        { time: "12:00", y1: 88, y2: 35, status: "Critical" },
        { time: "16:00", y1: 50, y2: 15, status: "Normal" },
        { time: "20:00", y1: 38, y2: 11, status: "Normal" },
      ];
    }
    if (timeDuration === "Past 7 Days") {
      return [
        { time: "Day 01", y1: 45, y2: 18, status: "Normal" },
        { time: "Day 02", y1: 52, y2: 22, status: "Normal" },
        { time: "Day 03", y1: 78, y2: 45, status: "Warning" },
        { time: "Day 04", y1: 30, y2: 12, status: "Normal" },
        { time: "Day 05", y1: 48, y2: 20, status: "Normal" },
        { time: "Day 06", y1: 95, y2: 68, status: "Critical" },
        { time: "Day 07", y1: 40, y2: 16, status: "Normal" },
      ];
    }
    if (timeDuration === "Past 30 Days") {
      const start = new Date();
      start.setDate(start.getDate() - 29);
      return buildDailySeries(start, 30);
    }
    if (timeDuration === "This Month") {
      return buildDailySeries(new Date(2026, 10, 1), 30);
    }

    // Nothing selected yet
    return [];
  };

  const currentScatterData = getDataset();
  const pointCount = currentScatterData.length;

  const y1DataMax = Math.max(0, ...currentScatterData.map((p) => p.y1));
  const y2DataMax = Math.max(0, ...currentScatterData.map((p) => p.y2));
  const y1Axis = resolveAxis(y1Cfg, y1DataMax, y1Last.current);
  const y2Axis = resolveAxis(y2Cfg, y2DataMax, y2Last.current);

  useEffect(() => {
    if (!y1Axis.warning) y1Last.current = { max: y1Axis.max, step: y1Axis.step };
    if (!y2Axis.warning) y2Last.current = { max: y2Axis.max, step: y2Axis.step };
  });

  const y1OverCount = currentScatterData.filter((p) => p.y1 > y1Axis.max).length;
  const y2OverCount = currentScatterData.filter((p) => p.y2 > y2Axis.max).length;

  useEffect(() => {
    setHoverIndex(null);
    setPinnedIndex(null);
  }, [timeDuration, isCustomMode, startDate, endDate]);

  const activeIndex = hoverIndex ?? pinnedIndex;
  const activePoint = activeIndex !== null ? currentScatterData[activeIndex] ?? null : null;

  const getXPercent = (i: number) => (pointCount > 1 ? (i / (pointCount - 1)) * 100 : 50);

  const getY1Position = (val: number) => getPos(val, y1Axis.max);
  const getY2Position = (val: number) => getPos(val, y2Axis.max);

  const generateSmoothCurvePath = (isY1: boolean) => {
    const n = currentScatterData.length;
    if (n === 0) return "";

    const points = currentScatterData.map((pt, i) => {
      const x = n > 1 ? (i / (n - 1)) * 100 : 50;
      const y = isY1 ? getY1Position(pt.y1) : getY2Position(pt.y2);
      return { x, y };
    });

    if (n === 1) return `M ${points[0].x} ${points[0].y}`;
    if (n === 2) return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;

    const slopes: number[] = [];
    for (let i = 0; i < n - 1; i++) {
      slopes.push((points[i + 1].y - points[i].y) / (points[i + 1].x - points[i].x));
    }

    const tangents: number[] = new Array(n);
    tangents[0] = slopes[0];
    tangents[n - 1] = slopes[n - 2];
    for (let i = 1; i < n - 1; i++) {
      const a = slopes[i - 1];
      const b = slopes[i];
      tangents[i] = a * b <= 0 ? 0 : (2 * a * b) / (a + b);
    }

    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < n - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const dx = (p1.x - p0.x) / 3;
      path += ` C ${p0.x + dx} ${p0.y + tangents[i] * dx}, ${p1.x - dx} ${p1.y - tangents[i + 1] * dx}, ${p1.x} ${p1.y}`;
    }
    return path;
  };

  const activeLeft = activeIndex !== null ? getXPercent(activeIndex) : 0;
  // The tooltip slides with the pointer (left-aligned at 0%, centred at 50%, right-aligned at 100%)
  // so it always stays inside the plot area, even on a narrow phone screen.
  const popupShift = -activeLeft;
  const popupAtBottom =
    activePoint !== null &&
    (getY1Position(activePoint.y1) + getY2Position(activePoint.y2)) / 2 < 50;

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

  const y1Label = y1Param || "Y1";
  const y2Label = y2Param || "Y2";

  const renderAxisControls = (opts: {
    title: string;
    titleColor: string;
    param: string;
    setParam: (v: string) => void;
    options: string[];
    placeholder: string;
    cfg: AxisConfig;
    setCfg: React.Dispatch<React.SetStateAction<AxisConfig>>;
    axis: ResolvedAxis;
    overCount: number;
  }) => {
    const { title, titleColor, param, setParam, options, placeholder, cfg, setCfg, axis, overCount } = opts;
    const inputClass = `${glassFieldBase} w-24 sm:w-20 px-2 py-2 sm:py-1.5 min-h-[44px] sm:min-h-0 text-base sm:text-xs disabled:bg-white/30 disabled:text-slate-400`;

    return (
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
          <div className={`flex items-center gap-2 text-xs font-bold ${titleColor}`}>
            <Sliders size={14} />
            <span className="whitespace-nowrap">{title}</span>
          </div>
          <div className="flex-1 w-full">
            <GlassSelect
              size="sm"
              value={param}
              onChange={setParam}
              options={toOptions(options)}
              placeholder={placeholder}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() =>
              cfg.auto
                ? setCfg({ auto: false, maxText: String(axis.max), stepText: String(axis.step) })
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
            {customSeries.error ? (
              <span className="col-span-2 text-xs font-semibold text-red-600">{customSeries.error}</span>
            ) : (
              <span className="col-span-2 text-xs font-medium text-blue-800">{customSeries.info}</span>
            )}
          </div>
        )}

        {/* Axis controls */}
        <div className="relative z-20 grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-4 bg-white/30 backdrop-blur-xl p-3 sm:p-4 rounded-2xl border border-white/60">
          {renderAxisControls({
            title: "Y1 Axis (Left):",
            titleColor: "text-blue-700",
            param: y1Param,
            setParam: setY1Param,
            options: ["COD Value (mg/L)", "BOD Value (mg/L)", "Suspended Solids (mg/L)"],
            placeholder: "Select Y1 parameter...",
            cfg: y1Cfg,
            setCfg: setY1Cfg,
            axis: y1Axis,
            overCount: y1OverCount,
          })}
          {renderAxisControls({
            title: "Y2 Axis (Right):",
            titleColor: "text-purple-700",
            param: y2Param,
            setParam: setY2Param,
            options: ["Turbidity (NTU)", "pH Level", "Temperature (°C)"],
            placeholder: "Select Y2 parameter...",
            cfg: y2Cfg,
            setCfg: setY2Cfg,
            axis: y2Axis,
            overCount: y2OverCount,
          })}
        </div>

        {/* Dual-Axis Visual Board */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6 items-center">
          <div className="lg:col-span-3 bg-slate-900/85 backdrop-blur-2xl rounded-3xl p-3 sm:p-6 relative h-[26rem] sm:h-80 flex flex-col justify-between text-slate-300 border border-white/10 ring-1 ring-inset ring-white/10 overflow-hidden shadow-[0_20px_60px_rgba(15,23,42,0.35)]">

            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-0.5 text-[10px] sm:text-[11px] font-mono text-slate-400 z-10 px-1 sm:px-6">
              <span className="text-blue-400 font-bold break-words">Y1: {y1Param || "Not selected"} (Blue Series)</span>
              <span className="text-purple-400 font-bold break-words">Y2: {y2Param || "Not selected"} (Purple Series)</span>
            </div>

            <div className="relative flex-1 flex items-center px-8 sm:px-10 my-2">
              <div className="absolute left-0 w-8 sm:w-10 inset-y-2 pointer-events-none">
                {y1Axis.ticks.map((t, idx) => (
                  <span
                    key={idx}
                    className="absolute right-1 -translate-y-1/2 text-[9px] sm:text-[10px] font-mono text-blue-400/80 leading-none"
                    style={{ top: `${getPos(t, y1Axis.max)}%` }}
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
                    style={{ top: `${getPos(t, y2Axis.max)}%` }}
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
                    style={{ top: `${getPos(t, y1Axis.max)}%` }}
                  >
                    <div className="absolute -left-1.5 w-1.5 h-px bg-blue-400/70" />
                  </div>
                ))}
                {y2Axis.ticks.map((t, idx) => (
                  <div
                    key={`rt-${idx}`}
                    className="absolute -right-1.5 w-1.5 h-px bg-purple-400/70"
                    style={{ top: `${getPos(t, y2Axis.max)}%` }}
                  />
                ))}

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
                      : "Select a valid date range to see the chart"}
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
                  const y1Pos = getY1Position(pt.y1);
                  const y2Pos = getY2Position(pt.y2);
                  const isActive = activeIndex === i;

                  return (
                    <React.Fragment key={i}>
                      <div
                        className="absolute pointer-events-none -translate-x-1/2 -translate-y-1/2 transition-all duration-300 z-30"
                        style={{ left: `${leftPercentage}%`, top: `${y1Pos}%` }}
                      >
                        <div className={`${dotSize} rounded-full bg-blue-500 border sm:border-2 border-white shadow-lg shadow-blue-500/80 transition-transform ${isActive ? "scale-150" : ""}`} />
                        {pt.y1 > y1Axis.max && (
                          <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-[9px] leading-none text-blue-300">▲</span>
                        )}
                      </div>

                      <div
                        className="absolute pointer-events-none -translate-x-1/2 -translate-y-1/2 transition-all duration-300 z-30"
                        style={{ left: `${leftPercentage}%`, top: `${y2Pos}%` }}
                      >
                        <div className={`${dotSize} rounded-full bg-purple-500 border sm:border-2 border-white shadow-lg shadow-purple-500/80 transition-transform ${isActive ? "scale-150" : ""}`} />
                        {pt.y2 > y2Axis.max && (
                          <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-[9px] leading-none text-purple-300">▲</span>
                        )}
                      </div>
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
                        <span className="font-semibold">{activePoint.y1}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
                        <span className="text-purple-300">{y2Label}:</span>
                        <span className="font-semibold">{activePoint.y2}</span>
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
              <span className="hidden sm:inline">Synced</span>
            </div>
          </div>

          <div className="space-y-3 sm:space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">Series Color Legend</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3 text-xs">
              <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-blue-400/15 backdrop-blur-xl border border-blue-400/40 text-slate-700">
                <div className="w-3 h-3 mt-0.5 rounded-full bg-blue-500 flex-shrink-0"></div>
                <div className="min-w-0">
                  <span className="font-bold">Y1 Series (Blue):</span> Represents <span className="text-blue-700 font-semibold">{y1Param || "Not selected"}</span> values mapped on the left scale.
                  <div className="text-[11px] text-slate-600 mt-1">
                    Scale: 0 - {y1Axis.max} (step {y1Axis.step})
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-purple-400/15 backdrop-blur-xl border border-purple-400/40 text-slate-700">
                <div className="w-3 h-3 mt-0.5 rounded-full bg-purple-500 flex-shrink-0"></div>
                <div className="min-w-0">
                  <span className="font-bold">Y2 Series (Purple):</span> Represents <span className="text-purple-700 font-semibold">{y2Param || "Not selected"}</span> values mapped on the right scale.
                  <div className="text-[11px] text-slate-600 mt-1">
                    Scale: 0 - {y2Axis.max} (step {y2Axis.step})
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}