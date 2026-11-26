import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPlantOperator } from "@/lib/plantOperatorAuth";
import { colomboToday, ensureShifts, normName, shiftBoard } from "@/lib/plantConfig";
import { DAILY_SHIFT_NO, parseNumber } from "@/lib/tankModes";
import { mergeTankReading } from "@/lib/tankReadings";

const fail = (error: string, status = 400) => NextResponse.json({ success: false, error }, { status });

// GET: tanks (+ parameters, each with its own reading type / check frequency), the 3 shifts with their live status (RUNNING / CLOSED / UPCOMING),
// and the readings of the current shift day (+ today's "once a day" readings)
export async function GET(request: Request) {
  const operator = await verifyPlantOperator(request);
  if (!operator) return fail("Unauthorized", 401);
  try {
    const shifts = await ensureShifts();
    const board = shiftBoard(shifts);
    const today = colomboToday();
    const dates = Array.from(new Set([board.date, today]));
    const [tanks, readings] = await Promise.all([
      prisma.plantTank.findMany({ orderBy: { name: "asc" }, include: { parameters: { orderBy: { createdAt: "asc" } } } }),
      prisma.tankReading.findMany({ where: { date: { in: dates } } }),
    ]);
    return NextResponse.json({
      success: true,
      data: {
        date: board.date,
        today,
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

// POST { tankId, shiftNo, values, valuesOut?, signName }
// `values` / `valuesOut` hold only the parameters the operator is submitting ({ "<parameterId>": number }).
// Every parameter has its own settings: "Every shift" parameters only while that shift is RUNNING,
// "Once a day" parameters any time today, "In & Out" parameters need an In and an Out value.
// Always: only when the operator typed their own name.
export async function POST(request: Request) {
  const operator = await verifyPlantOperator(request);
  if (!operator) return fail("Unauthorized", 401);
  try {
    const b = await request.json();
    if (typeof b.tankId !== "string" || typeof b.values !== "object" || !b.values) return fail("Invalid reading");

    if (typeof b.signName !== "string" || b.signName.trim() === "") return fail("Type your name before submitting");
    if (normName(b.signName) !== normName(operator.name)) return fail("The name you typed does not match your account name");

    const tank = await prisma.plantTank.findUnique({ where: { id: b.tankId }, include: { parameters: true } });
    if (!tank) return fail("Tank not found", 404);
    if (tank.parameters.length === 0) return fail("No parameters are set for this tank yet");

    const vals = b.values as Record<string, unknown>;
    const outs = (b.valuesOut && typeof b.valuesOut === "object" ? b.valuesOut : {}) as Record<string, unknown>;
    const chosen = tank.parameters.filter((p) => p.id in vals);
    if (chosen.length === 0) return fail("Enter at least one value");

    const day = { values: {} as Record<string, number>, valuesOut: {} as Record<string, number> };
    const shift = { values: {} as Record<string, number>, valuesOut: {} as Record<string, number> };
    for (const p of chosen) {
      const inOut = p.checkMode === "IN_OUT";
      const v = parseNumber(vals[p.id]);
      if (v === null) return fail(`Enter a valid ${inOut ? "In " : ""}value for ${p.name}`);
      const target = p.frequency === "DAILY" ? day : shift;
      target.values[p.id] = v;
      if (inOut) {
        const o = parseNumber(outs[p.id]);
        if (o === null) return fail(`Enter a valid Out value for ${p.name}`);
        target.valuesOut[p.id] = o;
      }
    }

    // Shift parameters: the shift must be open right now. Checked before anything is saved.
    const hasShift = Object.keys(shift.values).length > 0;
    let shiftDate = "";
    if (hasShift) {
      if (![1, 2, 3].includes(b.shiftNo)) return fail("Invalid reading");
      const board = shiftBoard(await ensureShifts());
      const status = board.statuses.find((s) => s.shiftNo === b.shiftNo)?.status;
      if (status === "CLOSED") return fail("This shift is closed. Ask the manager to add the data.", 403);
      if (status !== "RUNNING") return fail("This shift has not started yet.", 403);
      shiftDate = board.date;
    }

    if (Object.keys(day.values).length > 0) {
      await mergeTankReading({ tankId: tank.id, date: colomboToday(), shiftNo: DAILY_SHIFT_NO, ...day, recordedBy: operator.name });
    }
    if (hasShift) {
      await mergeTankReading({ tankId: tank.id, date: shiftDate, shiftNo: b.shiftNo, ...shift, recordedBy: operator.name });
    }
    return NextResponse.json({ success: true, data: { saved: chosen.length } }, { status: 201 });
  } catch (e) {
    console.error("TANK POST ERROR:", e);
    return fail("Failed to save the reading", 500);
  }
}