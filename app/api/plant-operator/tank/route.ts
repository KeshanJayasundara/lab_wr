import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPlantOperator } from "@/lib/plantOperatorAuth";
import { colomboToday, ensureShifts, shiftBoard } from "@/lib/plantConfig";
import { DAILY_SHIFT_NO, parseNumber } from "@/lib/tankModes";
import { AlreadyRecordedError, mergeTankReading } from "@/lib/tankReadings";

const fail = (error: string, status = 400) => NextResponse.json({ success: false, error }, { status });

const alreadyRecorded = (names: string[]) =>
  fail(`${names.join(", ")} ${names.length === 1 ? "is" : "are"} already recorded and can't be changed. Ask the manager if it needs a correction.`, 409);

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
// A parameter can be saved ONCE only (per shift, or once per day). After that the operator can't change it - the manager can.
// Always: the operator must type a name (any name) - it is saved as "recorded by".
export async function POST(request: Request) {
  const operator = await verifyPlantOperator(request);
  if (!operator) return fail("Unauthorized", 401);
  try {
    const b = await request.json();
    if (typeof b.tankId !== "string" || typeof b.values !== "object" || !b.values) return fail("Invalid reading");

    if (typeof b.signName !== "string" || b.signName.trim() === "") return fail("Type your name before submitting");
    const signedBy = b.signName.trim().replace(/\s+/g, " ").slice(0, 100);

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

    // Write-once: refuse (before saving anything) if any chosen parameter already has a value
    const names = Object.fromEntries(tank.parameters.map((p) => [p.id, p.name]));
    const hasDay = Object.keys(day.values).length > 0;
    const [oldDay, oldShift] = await Promise.all([
      hasDay ? prisma.tankReading.findUnique({ where: { tankId_date_shiftNo: { tankId: tank.id, date: colomboToday(), shiftNo: DAILY_SHIFT_NO } } }) : null,
      hasShift ? prisma.tankReading.findUnique({ where: { tankId_date_shiftNo: { tankId: tank.id, date: shiftDate, shiftNo: b.shiftNo } } }) : null,
    ]);
    const taken = [
      ...Object.keys(day.values).filter((id) => ((oldDay?.values ?? {}) as Record<string, number>)[id] !== undefined),
      ...Object.keys(shift.values).filter((id) => ((oldShift?.values ?? {}) as Record<string, number>)[id] !== undefined),
    ].map((id) => names[id]);
    if (taken.length > 0) return alreadyRecorded(taken);

    if (hasDay) {
      await mergeTankReading({ tankId: tank.id, date: colomboToday(), shiftNo: DAILY_SHIFT_NO, ...day, recordedBy: signedBy, onlyNew: true, names });
    }
    if (hasShift) {
      await mergeTankReading({ tankId: tank.id, date: shiftDate, shiftNo: b.shiftNo, ...shift, recordedBy: signedBy, onlyNew: true, names });
    }
    return NextResponse.json({ success: true, data: { saved: chosen.length } }, { status: 201 });
  } catch (e) {
    if (e instanceof AlreadyRecordedError) return alreadyRecorded(e.names);
    console.error("TANK POST ERROR:", e);
    return fail("Failed to save the reading", 500);
  }
}