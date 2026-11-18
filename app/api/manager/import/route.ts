import { NextResponse, connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";
import ExcelJS from "exceljs";
import {
  readRows,
  validateRows,
  dateKeyRange,
  atColombo,
  colomboDayKey,
  norm,
  RowResult,
} from "@/lib/importPastData";
import { templateSheets, templateDateRange, extractTemplate, SheetInfo } from "@/lib/importTemplate";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "nwsdb_lims_super_secret_key_2026"
);
const MAX_FILE_BYTES = 5 * 1024 * 1024;

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

// POST multipart/form-data:
//   file, mode = "preview" | "commit", markVerified = "true"|"false", allowUnknownParams = "true"|"false"
//   categoryId  (needed for the Daily Testing template layout)
//   sheets      (optional JSON array of sheet names to import - template layout only)
export async function POST(request: Request) {
  await connection();
  const manager = await verifyManager(request);
  if (!manager) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  try {
    const form = await request.formData();
    const file = form.get("file");
    const mode = form.get("mode") === "commit" ? "commit" : "preview";
    const markVerified = form.get("markVerified") !== "false";
    const allowUnknownParams = form.get("allowUnknownParams") === "true";

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: "Please choose a file." }, { status: 400 });
    }
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ success: false, error: "File is too large (max 5 MB)." }, { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const categoryId = String(form.get("categoryId") || "");
    let selectedSheets: string[] | null = null;
    try {
      const raw = form.get("sheets");
      if (typeof raw === "string" && raw) selectedSheets = JSON.parse(raw);
    } catch { /* ignore */ }

    // is it the Daily Testing template (one sheet per month, one column per day)?
    let wb: ExcelJS.Workbook | null = null;
    let tSheets: ExcelJS.Worksheet[] = [];
    if (/\.xlsx$/i.test(file.name)) {
      try {
        wb = new ExcelJS.Workbook();
        await wb.xlsx.load(buf as any);
        tSheets = templateSheets(wb);
      } catch {
        return NextResponse.json({ success: false, error: "Could not read the Excel file." }, { status: 400 });
      }
    }
    const isTemplate = tSheets.length > 0;
    if (isTemplate && !categoryId) {
      return NextResponse.json({ success: false, error: "Choose the test category (for example Daily Testing) for this template file." }, { status: 400 });
    }

    let rows: Awaited<ReturnType<typeof readRows>> = [];
    if (!isTemplate) {
      try {
        rows = await readRows(buf, file.name);
      } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message || "Could not read the file." }, { status: 400 });
      }
    }

    // ---- reference data ----
    const [types, configs] = await Promise.all([
      prisma.testType.findMany({ include: { category: true } }),
      prisma.tankParameterConfig.findMany(),
    ]);
    const typeInfos = types.map((t) => ({
      id: t.id,
      name: t.name,
      code: t.code,
      categoryId: t.categoryId,
      categoryName: t.category.name,
      categoryCode: t.category.code,
    }));
    const configInfos = configs.map((c) => ({
      typeId: c.typeId,
      parameterName: c.parameterName,
      unit: c.unit,
      standardMin: c.standardMin,
      standardMax: c.standardMax,
      rangeText: c.rangeText,
    }));

    // ---- records already stored for the same dates (duplicate check) ----
    const range = isTemplate ? templateDateRange(tSheets) : dateKeyRange(rows);
    const existing = new Set<string>();
    if (range) {
      const found = await prisma.testRecord.findMany({
        where: {
          createdAt: {
            gte: new Date(atColombo(range.min, 0).getTime()),
            lt: new Date(atColombo(range.max, 0).getTime() + 24 * 60 * 60 * 1000),
          },
          typeId: { not: null },
        },
        select: { typeId: true, parameter: true, createdAt: true },
      });
      for (const f of found) existing.add(`${f.typeId}|${norm(f.parameter)}|${colomboDayKey(f.createdAt)}`);
    }
    const todayKey = colomboDayKey(new Date());

    let results: RowResult[];
    let notes: string[] = [];
    let sheetInfos: SheetInfo[] = [];
    if (isTemplate) {
      const t = await extractTemplate(tSheets, { types: typeInfos, configs: configInfos, categoryId, existing, todayKey });
      results = t.results;
      notes = t.notes;
      sheetInfos = t.sheets;
      if (mode === "commit" && selectedSheets) results = results.filter((r) => !r.sheet || selectedSheets!.includes(r.sheet));
    } else {
      results = validateRows(rows, { types: typeInfos, configs: configInfos, existing, todayKey, allowUnknownParams });
    }

    const ok = results.filter((r) => r.state === "ok");
    const summary = {
      total: results.length,
      ok: ok.length,
      duplicate: results.filter((r) => r.state === "duplicate").length,
      error: results.filter((r) => r.state === "error").length,
      months: Object.entries(
        ok.reduce<Record<string, number>>((acc, r) => {
          const m = (r.dateKey as string).slice(0, 7);
          acc[m] = (acc[m] || 0) + 1;
          return acc;
        }, {})
      )
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, count]) => ({ month, count })),
    };

    if (mode === "preview") {
      const sheets = sheetInfos.map((si) => ({
        ...si,
        ok: results.filter((r) => r.sheet === si.name && r.state === "ok").length,
        duplicate: results.filter((r) => r.sheet === si.name && r.state === "duplicate").length,
        error: results.filter((r) => r.sheet === si.name && r.state === "error").length,
      }));
      return NextResponse.json({
        success: true,
        format: isTemplate ? "template" : "table",
        summary,
        sheets,
        notes,
        rows: results.slice(0, 6000),
      });
    }

    // ---- commit: only the valid, non-duplicate rows ----
    if (ok.length === 0) {
      return NextResponse.json({ success: false, error: "There are no valid rows to import." }, { status: 400 });
    }

    const sampleIds = new Map<string, string>(); // one sample ID per unit + day
    const importedBy = manager.name || manager.email || "Manager";
    const data = ok.map((r) => {
      const sk = `${r.typeId}|${r.dateKey}`;
      if (!sampleIds.has(sk)) {
        const rand = Math.floor(100 + Math.random() * 900);
        sampleIds.set(sk, `SMP-${r.categoryCode || "NA"}-${r.unitCode || "NA"}-${r.dateKey}-${rand}`);
      }
      const at = atColombo(r.dateKey as string, r.minutes ?? 720);
      return {
        sampleId: sampleIds.get(sk) as string,
        typeId: r.typeId as string,
        parameter: r.parameter as string,
        value: r.value as number,
        unit: r.measureUnit as string,
        status: r.status as string,
        testedBy: r.testedBy || `Imported by ${importedBy}`,
        verifiedBy: markVerified ? importedBy : null,
        isVerified: markVerified,
        createdAt: at,
        updatedAt: at,
      };
    });

    const CHUNK = 500;
    const ops = [];
    for (let i = 0; i < data.length; i += CHUNK) {
      ops.push(prisma.testRecord.createMany({ data: data.slice(i, i + CHUNK) }));
    }
    await prisma.$transaction(ops); // all-or-nothing

    return NextResponse.json({ success: true, imported: data.length, summary });
  } catch (error: any) {
    console.error("Past data import error:", error);
    return NextResponse.json({ success: false, error: error.message || "Import failed" }, { status: 500 });
  }
}