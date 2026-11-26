// >>> SAVE AS: app/api/plant-operator/gali/checks/route.ts   (UPDATED - replace the whole file) - delete this line after saving <<<
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPlantOperator } from "@/lib/plantOperatorAuth";
import { evaluateGali } from "@/lib/galiRanges";
import { getGaliRanges } from "@/lib/plantConfig";
import { colomboMonthRange, currentColomboMonth } from "@/lib/galiReport";

// GET: Gali checks of the CURRENT month only (Sri Lanka time)
export async function GET(request: Request) {
  const operator = await verifyPlantOperator(request);
  if (!operator) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { start, end } = colomboMonthRange(currentColomboMonth());
    const checks = await prisma.galiCheck.findMany({
      where: { createdAt: { gte: start, lt: end } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        esValue: true,
        phValue: true,
        inRange: true,
        decision: true,
        checkedBy: true,
        createdAt: true,
        vehicle: { select: { vehicleNumber: true } },
      },
    });
    return NextResponse.json({ success: true, data: checks }, { status: 200 });
  } catch (error) {
    console.error("GALI CHECKS GET ERROR:", error);
    return NextResponse.json({ success: false, error: "Failed to load checks" }, { status: 500 });
  }
}

// POST: save a check + the operator's decision (APPROVED / REJECTED)
export async function POST(request: Request) {
  const operator = await verifyPlantOperator(request);
  if (!operator) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const vehicleId = typeof body.vehicleId === "string" ? body.vehicleId : "";
    const es = typeof body.es === "string" && body.es.trim() === "" ? NaN : Number(body.es);
    const ph = typeof body.ph === "string" && body.ph.trim() === "" ? NaN : Number(body.ph);
    const decision = body.decision;

    if (!vehicleId) {
      return NextResponse.json({ success: false, error: "Select a vehicle first" }, { status: 400 });
    }
    if (!Number.isFinite(es) || !Number.isFinite(ph) || Math.abs(es) > 1e6 || Math.abs(ph) > 1e6) {
      return NextResponse.json({ success: false, error: "Enter valid ES and PH values" }, { status: 400 });
    }
    if (decision !== "APPROVED" && decision !== "REJECTED") {
      return NextResponse.json({ success: false, error: "Invalid decision" }, { status: 400 });
    }

    const vehicle = await prisma.galiVehicle.findUnique({ where: { id: vehicleId }, select: { id: true } });
    if (!vehicle) {
      return NextResponse.json({ success: false, error: "Vehicle not found" }, { status: 404 });
    }

    // The server re-checks the range itself, so the screen can't be tricked
    const { approved } = evaluateGali(es, ph, await getGaliRanges());
    if (decision === "APPROVED" && !approved) {
      return NextResponse.json(
        { success: false, error: "Values are outside the allowed range - this can only be rejected" },
        { status: 400 }
      );
    }

    const check = await prisma.galiCheck.create({
      data: {
        vehicleId,
        esValue: es,
        phValue: ph,
        inRange: approved,
        decision,
        checkedBy: operator.name,
      },
      select: { id: true },
    });
    return NextResponse.json({ success: true, data: check }, { status: 201 });
  } catch (error) {
    console.error("GALI CHECKS POST ERROR:", error);
    return NextResponse.json({ success: false, error: "Failed to save the check" }, { status: 500 });
  }
}