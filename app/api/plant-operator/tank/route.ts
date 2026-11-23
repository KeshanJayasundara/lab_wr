// >>> SAVE AS: app/api/plant-operator/tank/route.ts   (REPLACE the whole file) - delete this line after saving <<<
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPlantOperator } from "@/lib/plantOperatorAuth";
import { ensureShifts, normName, shiftBoard } from "@/lib/plantConfig";

const fail = (error: string, status = 400) => NextResponse.json({ success: false, error }, { status });

// GET: tanks + parameters, the 3 shifts with their live status (RUNNING / CLOSED / UPCOMING),
// and the readings of the current shift day
export async function GET(request: Request) {
  const operator = await verifyPlantOperator(request);
  if (!operator) return fail("Unauthorized", 401);
  try {
    const shifts = await ensureShifts();
    const board = shiftBoard(shifts);
    const [tanks, readings] = await Promise.all([
      prisma.plantTank.findMany({ orderBy: { name: "asc" }, include: { parameters: { orderBy: { createdAt: "asc" } } } }),
      prisma.tankReading.findMany({ where: { date: board.date } }),
    ]);
    return NextResponse.json({
      success: true,
      data: {
        date: board.date,
        shifts: shifts.map((s) => ({
          ...s,
          status: board.statuses.find((x) => x.shiftNo === s.shiftNo)?.status ?? "CLOSED",
        })),
        operatorName: operator.name,
        tanks,
        readings,
      },
    });
  } catch (e) {
    console.error("TANK GET ERROR:", e);
    return fail("Failed to load tank data", 500);
  }
}

// POST { tankId, shiftNo, values, signName }
// Only allowed while the shift is RUNNING (any tank operator), and only when the operator typed their own name.
export async function POST(request: Request) {
  const operator = await verifyPlantOperator(request);
  if (!operator) return fail("Unauthorized", 401);
  try {
    const b = await request.json();
    if (typeof b.tankId !== "string" || ![1, 2, 3].includes(b.shiftNo) || typeof b.values !== "object" || !b.values)
      return fail("Invalid reading");

    if (typeof b.signName !== "string" || b.signName.trim() === "") return fail("Type your name before submitting");
    if (normName(b.signName) !== normName(operator.name)) return fail("The name you typed does not match your account name");

    const shifts = await ensureShifts();
    const board = shiftBoard(shifts);
    const status = board.statuses.find((s) => s.shiftNo === b.shiftNo)?.status;
    if (status === "CLOSED") return fail("This shift is closed. Ask the manager to add the data.", 403);
    if (status !== "RUNNING") return fail("This shift has not started yet.", 403);

    const tank = await prisma.plantTank.findUnique({ where: { id: b.tankId }, include: { parameters: true } });
    if (!tank) return fail("Tank not found", 404);
    if (tank.parameters.length === 0) return fail("No parameters are set for this tank yet");

    const values: Record<string, number> = {};
    for (const p of tank.parameters) {
      const raw = b.values[p.id];
      const n = typeof raw === "string" && raw.trim() === "" ? NaN : Number(raw);
      if (!Number.isFinite(n) || Math.abs(n) > 1e9) return fail(`Enter a valid value for ${p.name}`);
      values[p.id] = n;
    }

    const row = await prisma.tankReading.upsert({
      where: { tankId_date_shiftNo: { tankId: tank.id, date: board.date, shiftNo: b.shiftNo } },
      update: { values, recordedBy: operator.name },
      create: { tankId: tank.id, date: board.date, shiftNo: b.shiftNo, values, recordedBy: operator.name },
    });
    return NextResponse.json({ success: true, data: row }, { status: 201 });
  } catch (e) {
    console.error("TANK POST ERROR:", e);
    return fail("Failed to save the reading", 500);
  }
}