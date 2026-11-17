import { NextResponse, connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";
import { monthRangeUtc } from "@/lib/dailyReport";
import { evaluateStatus } from "@/lib/status";


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

const fmtLimit = (c: { standardMin: number | null; standardMax: number | null; rangeText: string | null; unit: string | null } | undefined) => {
  if (!c) return "Not configured";
  if (c.rangeText) return c.rangeText;
  const u = c.unit ? ` ${c.unit}` : "";
  if (c.standardMin !== null && c.standardMax !== null) return `${c.standardMin} - ${c.standardMax}${u}`;
  if (c.standardMax !== null) return `< ${c.standardMax}${u}`;
  if (c.standardMin !== null) return `> ${c.standardMin}${u}`;
  return "Not configured";
};

// GET /api/manager/reports/preview?month=2026-11&categoryId=all|<id>
export async function GET(request: Request) {
  await connection(); // opt out of prerendering (replaces `export const dynamic`, which cacheComponents rejects)
  const manager = await verifyManager(request);
  if (!manager) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const m = (searchParams.get("month") || "").match(/^(\d{4})-(\d{1,2})$/);
    const categoryId = searchParams.get("categoryId") || "all";
    if (!m || +m[2] < 1 || +m[2] > 12) {
      return NextResponse.json({ success: false, error: "month must look like 2026-11" }, { status: 400 });
    }
    const { start, end } = monthRangeUtc({ year: +m[1], month: +m[2] });

    const records = await prisma.testRecord.findMany({
      where: {
        createdAt: { gte: start, lt: end },
        ...(categoryId !== "all" ? { type: { categoryId } } : {}),
      },
      include: { type: { include: { category: true } } },
      orderBy: { createdAt: "asc" },
    });

    const typeIds = [...new Set(records.map((r) => r.typeId).filter(Boolean))] as string[];
    const configs = typeIds.length ? await prisma.tankParameterConfig.findMany({ where: { typeId: { in: typeIds } } }) : [];
    const cfgMap = new Map(configs.map((c) => [`${c.typeId}::${c.parameterName}`, c]));

    type Agg = { category: string; unit: string; parameter: string; measureUnit: string; standard: string; values: number[]; normal: number; warning: number; critical: number };
    const groups = new Map<string, Agg>();
    const days = new Set<string>();

    for (const r of records) {
      const cfg = r.typeId ? cfgMap.get(`${r.typeId}::${r.parameter}`) : undefined;
      const status = evaluateStatus(r.value, cfg);
      const cat = r.type?.category?.name || "Uncategorised";
      const tank = r.type?.name || "—";
      const key = `${cat}||${tank}||${r.parameter}`;
      let g = groups.get(key);
      if (!g) {
        g = { category: cat, unit: tank, parameter: r.parameter, measureUnit: r.unit, standard: fmtLimit(cfg), values: [], normal: 0, warning: 0, critical: 0 };
        groups.set(key, g);
      }
      g.values.push(r.value);
      if (status === "Critical") g.critical++;
      else if (status === "Warning") g.warning++;
      else g.normal++;
      const c = new Date(r.createdAt.getTime() + 5.5 * 3600 * 1000);
      days.add(c.toISOString().slice(0, 10));
    }

    const rows = [...groups.values()]
      .sort((a, b) => a.category.localeCompare(b.category) || a.unit.localeCompare(b.unit) || a.parameter.localeCompare(b.parameter))
      .map((g) => {
        const sum = g.values.reduce((a, b) => a + b, 0);
        return {
          category: g.category,
          unit: g.unit,
          parameter: g.parameter,
          measureUnit: g.measureUnit,
          standard: g.standard,
          tests: g.values.length,
          avg: sum / g.values.length,
          min: Math.min(...g.values),
          max: Math.max(...g.values),
          normal: g.normal,
          warning: g.warning,
          critical: g.critical,
          status: g.critical ? "Critical" : g.warning ? "Warning" : "Normal",
        };
      });

    return NextResponse.json({
      success: true,
      data: {
        rows,
        totals: {
          records: records.length,
          daysTested: days.size,
          categories: new Set(rows.map((r) => r.category)).size,
          units: new Set(rows.map((r) => `${r.category}||${r.unit}`)).size,
        },
      },
    });
  } catch (error: any) {
    console.error("Report preview error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to build preview" }, { status: 500 });
  }
}