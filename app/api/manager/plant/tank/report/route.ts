import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { parseMonthParam } from "@/lib/galiReport";
import { ensureShifts } from "@/lib/plantConfig";
import { DAILY_SHIFT_NO } from "@/lib/tankModes";
import { guard, unauthorized, fail } from "../../_h";

// GET ?month=YYYY-MM[&tankId=] -> Excel workbook, one sheet per tank
// rows = day + shift ("Daily" for once-a-day parameters), columns = parameters (an In and an Out column for In & Out parameters)
export async function GET(request: Request) {
  if (!(await guard(request))) return unauthorized();
  const sp = new URL(request.url).searchParams;
  const month = parseMonthParam(sp.get("month"));
  if (!month) return fail("Select a valid month");
  const tankId = sp.get("tankId");
  try {
    const mm = `${month.year}-${String(month.month).padStart(2, "0")}`;
    const [shifts, tanks] = await Promise.all([
      ensureShifts(),
      prisma.plantTank.findMany({
        where: tankId ? { id: tankId } : {},
        orderBy: { name: "asc" },
        include: {
          parameters: { orderBy: { createdAt: "asc" } },
          readings: { where: { date: { startsWith: mm } }, orderBy: [{ date: "asc" }, { shiftNo: "asc" }] },
        },
      }),
    ]);
    const withData = tanks.filter((t) => t.readings.length > 0);
    if (withData.length === 0) return fail("No tank readings were recorded in the selected month.", 404);

    const wb = new ExcelJS.Workbook();
    for (const t of withData) {
      const ws = wb.addWorksheet(t.name.replace(/[\\/*?:\[\]]/g, "-").slice(0, 31));
      ws.addRow([`${t.name} - Monthly Report (${mm})`]).font = { bold: true, size: 14 };
      ws.addRow(["Once-a-day parameters are shown in the \"Daily\" row, the others in the shift rows."]).font = { italic: true, color: { argb: "FF666666" } };

      // one column per parameter (Single) or two per parameter (In & Out)
      const cols = t.parameters.flatMap((p) => {
        const label = p.unit ? `${p.name} (${p.unit})` : p.name;
        return p.checkMode === "IN_OUT"
          ? [{ p, set: "in" as const, title: `${label} - In` }, { p, set: "out" as const, title: `${label} - Out` }]
          : [{ p, set: "in" as const, title: label }];
      });

      const head = ws.addRow(["Date", "Shift", ...cols.map((c) => c.title), "Recorded By"]);
      head.font = { bold: true };
      head.eachCell((c) => { c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDDEBF7" } }; });

      for (const r of t.readings) {
        const vin = (r.values ?? {}) as Record<string, number>;
        const vout = (r.valuesOut ?? {}) as Record<string, number>;
        const get = (c: (typeof cols)[number]) => (c.set === "out" ? vout : vin)[c.p.id];
        const shiftLabel = r.shiftNo === DAILY_SHIFT_NO ? "Daily" : shifts.find((s) => s.shiftNo === r.shiftNo)?.label ?? `Shift ${r.shiftNo}`;
        const row = ws.addRow([r.date, shiftLabel, ...cols.map((c) => get(c) ?? ""), r.recordedBy]);
        cols.forEach((c, i) => {
          const v = get(c);
          if (typeof v === "number" && ((c.p.min !== null && v < c.p.min) || (c.p.max !== null && v > c.p.max)))
            row.getCell(i + 3).font = { color: { argb: "FFC00000" }, bold: true };
        });
      }
      ws.columns.forEach((c) => { c.width = 16; });
      ws.getColumn(2).width = 22;
      ws.addRow([]);
      ws.addRow(["Values outside the configured range are shown in red."]).font = { italic: true, color: { argb: "FF666666" } };
    }
    const buf = await wb.xlsx.writeBuffer();
    return new NextResponse(buf as ArrayBuffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="Tank-Report-${mm}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) { console.error(e); return fail("Failed to generate the report", 500); }
}