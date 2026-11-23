import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildGaliReportPdf, colomboMonthRange, parseMonthParam } from "@/lib/galiReport";
import { guard, unauthorized, fail } from "../../_h";

// GET ?month=YYYY-MM -> monthly Gali PDF (same layout the operator gets)
export async function GET(request: Request) {
  if (!(await guard(request))) return unauthorized();
  const month = parseMonthParam(new URL(request.url).searchParams.get("month"));
  if (!month) return fail("Select a valid month");
  try {
    const { start, end } = colomboMonthRange(month);
    const checks = await prisma.galiCheck.findMany({
      where: { createdAt: { gte: start, lt: end } },
      orderBy: { createdAt: "asc" },
      select: { esValue: true, phValue: true, decision: true, checkedBy: true, createdAt: true, vehicle: { select: { vehicleNumber: true } } },
    });
    if (checks.length === 0) return fail("No Gali checks were recorded in the selected month.", 404);
    const facility = await prisma.facilityProfile.findUnique({ where: { id: "singleton" } }).catch(() => null);
    const facilityLines = [facility?.departmentName, facility?.region].filter((v): v is string => !!v && v.trim() !== "");
    const pdf = buildGaliReportPdf({
      month, facilityLines,
      rows: checks.map((c) => ({ createdAt: c.createdAt, vehicleNumber: c.vehicle.vehicleNumber, esValue: c.esValue, phValue: c.phValue, decision: c.decision, checkedBy: c.checkedBy })),
    });
    return new NextResponse(pdf as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Gali-Report-${month.year}-${String(month.month).padStart(2, "0")}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) { console.error(e); return fail("Failed to generate the report", 500); }
}