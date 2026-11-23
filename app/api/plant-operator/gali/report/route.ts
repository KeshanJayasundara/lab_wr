import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPlantOperator } from "@/lib/plantOperatorAuth";
import { buildGaliReportPdf, colomboMonthRange, parseMonthParam } from "@/lib/galiReport";

// GET /api/plant-operator/gali/report?month=YYYY-MM
// Returns a PDF with every Gali check of the selected month.
export async function GET(request: Request) {
  const operator = await verifyPlantOperator(request);
  if (!operator) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const month = parseMonthParam(new URL(request.url).searchParams.get("month"));
  if (!month) {
    return NextResponse.json({ success: false, error: "Select a valid month" }, { status: 400 });
  }

  try {
    const { start, end } = colomboMonthRange(month);
    const checks = await prisma.galiCheck.findMany({
      where: { createdAt: { gte: start, lt: end } },
      orderBy: { createdAt: "asc" },
      select: {
        esValue: true,
        phValue: true,
        decision: true,
        checkedBy: true,
        createdAt: true,
        vehicle: { select: { vehicleNumber: true } },
      },
    });

    if (checks.length === 0) {
      return NextResponse.json(
        { success: false, error: "No Gali checks were recorded in the selected month." },
        { status: 404 }
      );
    }

    // Optional header lines (only if the facility profile has been filled in)
    const facility = await prisma.facilityProfile.findUnique({ where: { id: "singleton" } }).catch(() => null);
    const facilityLines = [facility?.departmentName, facility?.region].filter(
      (v): v is string => typeof v === "string" && v.trim() !== ""
    );

    const pdf = buildGaliReportPdf({
      month,
      facilityLines,
      rows: checks.map((c) => ({
        createdAt: c.createdAt,
        vehicleNumber: c.vehicle.vehicleNumber,
        esValue: c.esValue,
        phValue: c.phValue,
        decision: c.decision,
        checkedBy: c.checkedBy,
      })),
    });

    const fileName = `Gali-Report-${month.year}-${String(month.month).padStart(2, "0")}.pdf`;
    return new NextResponse(pdf as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("GALI REPORT ERROR:", error);
    return NextResponse.json({ success: false, error: "Failed to generate the report" }, { status: 500 });
  }
}