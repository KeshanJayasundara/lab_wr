import { NextResponse, connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";
import JSZip from "jszip";
import { buildDailyReport, monthRangeUtc, ReportMonth, ReportRecord } from "@/lib/dailyReport";


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

// GET /api/manager/reports/export?month=2026-11&categoryId=<id>   -> one .xlsx for that category
// GET /api/manager/reports/export?month=2026-11&categoryId=all    -> .zip with one .xlsx per category
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
    const ym: ReportMonth = { year: +m[1], month: +m[2] };
    const label = `${ym.year}_${String(ym.month).padStart(2, "0")}`;
    const { start, end } = monthRangeUtc(ym);

    const records = await prisma.testRecord.findMany({
      where: {
        createdAt: { gte: start, lt: end },
        ...(categoryId !== "all" ? { type: { categoryId } } : {}),
      },
      include: { type: { include: { category: true } } },
      orderBy: { createdAt: "asc" },
    });

    if (records.length === 0) {
      return NextResponse.json({ success: false, error: "No test records found for the selected month / category." }, { status: 404 });
    }

    // group by category
    const byCat = new Map<string, { name: string; recs: ReportRecord[] }>();
    for (const r of records) {
      const id = r.type?.category?.id || "none";
      const name = r.type?.category?.name || "Uncategorised";
      if (!byCat.has(id)) byCat.set(id, { name, recs: [] });
      byCat.get(id)!.recs.push({
        parameter: r.parameter,
        value: r.value,
        unit: r.unit,
        createdAt: r.createdAt,
        testedBy: r.testedBy,
        type: r.type ? { name: r.type.name, category: r.type.category ? { name: r.type.category.name } : null } : null,
      });
    }

    const safe = (t: string) => t.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "Category";

    // one category -> plain Excel file
    if (categoryId !== "all") {
      const only = [...byCat.values()][0];
      const buffer = await buildDailyReport(only.recs, [ym]);
      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="Daily_testing_records_${safe(only.name)}_${label}.xlsx"`,
          "Cache-Control": "no-store",
        },
      });
    }

    // all categories -> zip of Excel files
    const zip = new JSZip();
    const used = new Set<string>();
    for (const { name, recs } of byCat.values()) {
      const buffer = await buildDailyReport(recs, [ym]);
      let file = `Daily_testing_records_${safe(name)}_${label}.xlsx`;
      for (let i = 2; used.has(file); i++) file = `Daily_testing_records_${safe(name)}_${i}_${label}.xlsx`;
      used.add(file);
      zip.file(file, buffer);
    }
    const zipBuf = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
    return new NextResponse(new Uint8Array(zipBuf), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="Daily_testing_reports_${label}.zip"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    console.error("Report export error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to generate report" }, { status: 500 });
  }
}