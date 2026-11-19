import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";
import { evaluateStatus, resolveLimits, type TestStatus } from "@/lib/status";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "nwsdb_lims_super_secret_key_2026"
);

async function verifyManager(request: Request) {
  try {
    const cookieHeader = request.headers.get("cookie");
    const tokenCookie = cookieHeader
      ?.split("; ")
      .find((row) => row.startsWith("token="))
      ?.split("=")[1];

    if (!tokenCookie) return null;
    const verified = await jwtVerify(tokenCookie, JWT_SECRET);
    const payload = verified.payload as any;
    if (payload.role !== "MANAGER" && payload.role !== "ADMIN") return null;
    return payload;
  } catch {
    return null;
  }
}

// ---- Time helpers -------------------------------------------------------
// Sri Lanka is UTC+5:30 all year (no DST). The server may run in UTC (Vercel), so every
// day/hour bucket is computed in "Colombo local time" to keep a test on the right day.
const TZ_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const MAX_POINTS = 31;
const MAX_RANGE_DAYS = 366;

// Analytics only uses readings a manager has verified. Set to false to include unverified readings too.
const VERIFIED_ONLY = true;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const pad = (n: number) => String(n).padStart(2, "0");

// "local ms" = a timestamp shifted by +5:30 so that the UTC getters return Colombo wall-clock values.
const nowLocal = () => Date.now() + TZ_OFFSET_MS;
const localToUtc = (ms: number) => new Date(ms - TZ_OFFSET_MS);
const dayLabel = (ms: number) => {
  const d = new Date(ms);
  return `${pad(d.getUTCDate())} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};

const parseYmd = (s: string | null): number | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s ?? "");
  if (!m) return null;
  const ms = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return isNaN(ms) ? null : ms;
};

type Bucket = { time: string; sub?: string; fullLabel: string };
type Plan = { startLocal: number; bucketMs: number; buckets: Bucket[]; info: string };

function planHourly(): Plan {
  const thisHour = Math.floor(nowLocal() / HOUR) * HOUR;
  const startLocal = thisHour - 23 * HOUR;
  const buckets: Bucket[] = Array.from({ length: 24 }, (_, i) => {
    const d = new Date(startLocal + i * HOUR);
    const h = d.getUTCHours();
    return {
      time: `${pad(h)}:00`,
      sub: i === 0 || h === 0 ? `${pad(d.getUTCDate())} ${MONTHS[d.getUTCMonth()]}` : undefined,
      fullLabel: `${WEEKDAYS[d.getUTCDay()]}, ${dayLabel(d.getTime())} · ${pad(h)}:00 - ${pad((h + 1) % 24)}:00`,
    };
  });
  return { startLocal, bucketMs: HOUR, buckets, info: "Last 24 hours, one point per hour" };
}

function planDaily(startLocal: number, days: number, infoPrefix: string): Plan {
  const bucketDays = days <= MAX_POINTS ? 1 : Math.ceil(days / MAX_POINTS);
  const count = Math.ceil(days / bucketDays);
  let prevMonth = -1;

  const buckets: Bucket[] = Array.from({ length: count }, (_, i) => {
    const first = startLocal + i * bucketDays * DAY;
    const spanDays = Math.min(bucketDays, days - i * bucketDays);
    const last = first + (spanDays - 1) * DAY;
    const d = new Date(first);
    const month = d.getUTCMonth();
    const sub = month !== prevMonth ? MONTHS[month] : undefined;
    prevMonth = month;
    return {
      time: pad(d.getUTCDate()),
      sub,
      fullLabel:
        spanDays === 1
          ? `${WEEKDAYS[d.getUTCDay()]}, ${dayLabel(first)}`
          : `${dayLabel(first)} - ${dayLabel(last)} (average of ${spanDays} days)`,
    };
  });

  const info =
    bucketDays === 1
      ? `${infoPrefix}, one point per day`
      : `${infoPrefix} - each point is the average of ${bucketDays} days`;
  return { startLocal, bucketMs: bucketDays * DAY, buckets, info };
}

// ---- Aggregation helpers -------------------------------------------------
const norm = (s: string) => s.trim().toLowerCase();
const RANK: Record<TestStatus, number> = { Normal: 0, Warning: 1, Critical: 2 };
const worst = (a: TestStatus, b: TestStatus): TestStatus => (RANK[b] > RANK[a] ? b : a);
const round = (n: number) => Math.round(n * 1000) / 1000;

type Agg = { sum: number; min: number; max: number; count: number; status: TestStatus };
const emptyAgg = (): Agg => ({ sum: 0, min: Infinity, max: -Infinity, count: 0, status: "Normal" });

// GET /api/manager/analytics?y1TypeId&y1Param&y2TypeId&y2Param&range=24h|7d|30d|month|custom[&from&to][&verified=0]
export async function GET(request: Request) {
  const manager = await verifyManager(request);
  if (!manager) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const y1TypeId = searchParams.get("y1TypeId");
    const y2TypeId = searchParams.get("y2TypeId");
    const y1Param = searchParams.get("y1Param")?.trim();
    const y2Param = searchParams.get("y2Param")?.trim();
    const range = searchParams.get("range");
    const verifiedOnly = VERIFIED_ONLY;

    if (!y1TypeId || !y2TypeId || !y1Param || !y2Param || !range) {
      return NextResponse.json(
        { success: false, error: "y1TypeId, y1Param, y2TypeId, y2Param and range are required" },
        { status: 400 }
      );
    }

    // 1) Decide the time buckets
    const todayLocal = Math.floor(nowLocal() / DAY) * DAY;
    let plan: Plan;
    if (range === "24h") {
      plan = planHourly();
    } else if (range === "7d") {
      plan = planDaily(todayLocal - 6 * DAY, 7, "Last 7 days");
    } else if (range === "30d") {
      plan = planDaily(todayLocal - 29 * DAY, 30, "Last 30 days");
    } else if (range === "month") {
      const t = new Date(todayLocal);
      const first = Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), 1);
      const days = Math.round((todayLocal - first) / DAY) + 1; // up to today
      plan = planDaily(first, days, `${MONTHS[t.getUTCMonth()]} ${t.getUTCFullYear()} (to date)`);
    } else if (range === "custom") {
      const from = parseYmd(searchParams.get("from"));
      const to = parseYmd(searchParams.get("to"));
      if (from === null || to === null) {
        return NextResponse.json({ success: false, error: "Pick both a start date and an end date." }, { status: 400 });
      }
      let days = Math.round((to - from) / DAY) + 1;
      if (days < 1) {
        return NextResponse.json({ success: false, error: "The end date must be on or after the start date." }, { status: 400 });
      }
      let note = `${days} day${days > 1 ? "s" : ""} selected`;
      if (days > MAX_RANGE_DAYS) {
        days = MAX_RANGE_DAYS;
        note = `${MAX_RANGE_DAYS} days (limited to the first ${MAX_RANGE_DAYS} days)`;
      }
      plan = planDaily(from, days, note);
    } else {
      return NextResponse.json({ success: false, error: "Invalid range" }, { status: 400 });
    }

    const endLocal = plan.startLocal + plan.buckets.length * plan.bucketMs;

    // 2) Load what we need: the two units' range configs + readings inside the window
    const typeIds = [...new Set([y1TypeId, y2TypeId])];
    const [configs, masterParams, records] = await Promise.all([
      prisma.tankParameterConfig.findMany({ where: { typeId: { in: typeIds } } }),
      prisma.testParameter.findMany({ select: { name: true, unit: true } }),
      prisma.testRecord.findMany({
        where: {
          typeId: { in: typeIds },
          createdAt: { gte: localToUtc(plan.startLocal), lt: localToUtc(endLocal) },
          ...(verifiedOnly ? { isVerified: true } : {}),
        },
        select: { typeId: true, parameter: true, value: true, createdAt: true },
      }),
    ]);

    const masterUnit = new Map(masterParams.map((p) => [norm(p.name), p.unit]));
    const configFor = (typeId: string, param: string) =>
      configs.find((c) => c.typeId === typeId && norm(c.parameterName) === norm(param)) ?? null;

    const series = [
      { typeId: y1TypeId, param: y1Param },
      { typeId: y2TypeId, param: y2Param },
    ].map((s) => {
      const cfg = configFor(s.typeId, s.param);
      const limits = resolveLimits(cfg);
      return {
        ...s,
        cfg,
        unit: cfg?.unit ?? masterUnit.get(norm(s.param)) ?? null,
        standardMin: limits?.min ?? null,
        standardMax: limits?.max ?? null,
        aggs: plan.buckets.map(emptyAgg),
        total: 0,
      };
    });

    // 3) Drop every reading into its bucket (Colombo time)
    for (const r of records) {
      const idx = Math.floor((r.createdAt.getTime() + TZ_OFFSET_MS - plan.startLocal) / plan.bucketMs);
      if (idx < 0 || idx >= plan.buckets.length) continue;
      for (const s of series) {
        if (r.typeId !== s.typeId || norm(r.parameter) !== norm(s.param)) continue;
        const a = s.aggs[idx];
        a.sum += r.value;
        a.min = Math.min(a.min, r.value);
        a.max = Math.max(a.max, r.value);
        a.count += 1;
        a.status = worst(a.status, evaluateStatus(r.value, s.cfg)); // live status vs current ranges
        s.total += 1;
      }
    }

    // 4) Shape the response like the chart's ChartPoint
    const [s1, s2] = series;
    const points = plan.buckets.map((b, i) => {
      const a1 = s1.aggs[i];
      const a2 = s2.aggs[i];
      const has1 = a1.count > 0;
      const has2 = a2.count > 0;
      let status: string = "No data";
      if (has1 || has2) {
        status = worst(has1 ? a1.status : "Normal", has2 ? a2.status : "Normal");
      }
      return {
        time: b.time,
        sub: b.sub,
        fullLabel: b.fullLabel,
        y1: has1 ? round(a1.sum / a1.count) : null,
        y2: has2 ? round(a2.sum / a2.count) : null,
        y1Min: has1 ? a1.min : null,
        y1Max: has1 ? a1.max : null,
        y1Count: a1.count,
        y2Min: has2 ? a2.min : null,
        y2Max: has2 ? a2.max : null,
        y2Count: a2.count,
        status,
      };
    });

    const meta = (s: (typeof series)[number]) => ({
      typeId: s.typeId,
      parameter: s.param,
      unit: s.unit,
      standardMin: s.standardMin,
      standardMax: s.standardMax,
      totalReadings: s.total,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          points,
          y1: meta(s1),
          y2: meta(s2),
          verifiedOnly,
          info: `${plan.info} · ${s1.total} Y1 / ${s2.total} Y2 readings${verifiedOnly ? " (verified only)" : ""}`,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("GET analytics error:", error);
    return NextResponse.json({ success: false, error: "Failed to load analytics data" }, { status: 500 });
  }
}