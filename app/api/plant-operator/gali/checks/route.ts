import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { verifyPlantOperator } from "@/lib/plantOperatorAuth";
import { evaluateGaliParams } from "@/lib/galiRanges";
import { getGaliParameters } from "@/lib/plantConfig";
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
        values: true,
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
// body: { vehicleId, values: { [parameterId]: "5.2", ... }, decision }
export async function POST(request: Request) {
  const operator = await verifyPlantOperator(request);
  if (!operator) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const vehicleId = typeof body.vehicleId === "string" ? body.vehicleId : "";
    const decision = body.decision;
    const rawValues: Record<string, unknown> =
      body.values && typeof body.values === "object" && !Array.isArray(body.values) ? body.values : {};

    if (!vehicleId) {
      return NextResponse.json({ success: false, error: "Select a vehicle first" }, { status: 400 });
    }
    if (decision !== "APPROVED" && decision !== "REJECTED") {
      return NextResponse.json({ success: false, error: "Invalid decision" }, { status: 400 });
    }

    // The parameters (and their ranges) come from the Manager - the server never trusts the screen
    const params = await getGaliParameters();
    if (params.length === 0) {
      return NextResponse.json({ success: false, error: "The Manager has not added any Gali parameters yet" }, { status: 400 });
    }

    const nums: Record<string, number> = {};
    for (const p of params) {
      const raw = rawValues[p.id];
      const n = typeof raw === "number" ? raw : typeof raw === "string" && raw.trim() !== "" ? Number(raw) : NaN;
      if (!Number.isFinite(n) || Math.abs(n) > 1e6) {
        return NextResponse.json({ success: false, error: `Enter a valid ${p.name} value` }, { status: 400 });
      }
      nums[p.id] = n;
    }

    const vehicle = await prisma.galiVehicle.findUnique({ where: { id: vehicleId }, select: { id: true } });
    if (!vehicle) {
      return NextResponse.json({ success: false, error: "Vehicle not found" }, { status: 404 });
    }

    const { results, approved } = evaluateGaliParams(params, nums);
    if (decision === "APPROVED" && !approved) {
      return NextResponse.json(
        { success: false, error: "Values are outside the allowed range - this can only be rejected" },
        { status: 400 }
      );
    }

    // Snapshot of what was checked (so old records stay correct even if the Manager changes a range later)
    const snapshot = results.map((r) => ({ name: r.name, unit: r.unit, min: r.min, max: r.max, value: r.value, ok: r.ok }));
    // The old ES / PH columns (used by the monthly PDF) are still filled when those parameters exist
    const pick = (n: string) => results.find((r) => r.name.trim().toUpperCase() === n)?.value ?? 0;

    const check = await prisma.galiCheck.create({
      data: {
        vehicleId,
        esValue: pick("ES"),
        phValue: pick("PH"),
        values: snapshot as unknown as Prisma.InputJsonValue,
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