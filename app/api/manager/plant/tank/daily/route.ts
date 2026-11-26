import { prisma } from "@/lib/prisma";
import { colomboToday, dayEnded, ensureShifts, isDateStr, shiftEnded } from "@/lib/plantConfig";
import { DAILY_SHIFT_NO, parseNumber } from "@/lib/tankModes";
import { mergeTankReading } from "@/lib/tankReadings";
import { guard, unauthorized, fail, ok } from "../../_h";

// GET ?date= -> all tanks with their parameters and settings, the shifts, and every reading of that day
// ("once a day" parameters are stored with shiftNo 0)
export async function GET(request: Request) {
  if (!(await guard(request))) return unauthorized();
  const date = new URL(request.url).searchParams.get("date") || colomboToday();
  if (!isDateStr(date)) return fail("Invalid date");
  try {
    const [shifts, tanks, readings] = await Promise.all([
      ensureShifts(),
      prisma.plantTank.findMany({ orderBy: { name: "asc" }, include: { parameters: { orderBy: { createdAt: "asc" } } } }),
      prisma.tankReading.findMany({ where: { date } }),
    ]);
    return ok({ date, shifts, tanks, readings });
  } catch (e) { console.error(e); return fail("Failed to load daily data", 500); }
}

// POST { tankId, parameterId, date, shiftNo, value, valueOut? } -> the Manager adds / corrects ONE parameter's reading
// for a day / shift that is already OVER (used when the operator could not enter the data in time).
// The parameter decides what is needed: "Once a day" parameters ignore shiftNo, "In & Out" parameters need value + valueOut.
export async function POST(request: Request) {
  const manager = await guard(request);
  if (!manager) return unauthorized();
  try {
    const b = await request.json();
    if (typeof b.tankId !== "string" || typeof b.parameterId !== "string" || !isDateStr(b.date)) return fail("Invalid reading");
    if (b.date > colomboToday()) return fail("You cannot add data for a future date");
    const param = await prisma.tankParameter.findUnique({ where: { id: b.parameterId } });
    if (!param || param.tankId !== b.tankId) return fail("Parameter not found in this tank", 404);

    const daily = param.frequency === "DAILY";
    const inOut = param.checkMode === "IN_OUT";
    if (!daily && ![1, 2, 3].includes(b.shiftNo)) return fail("Select a shift");
    const shiftNo: number = daily ? DAILY_SHIFT_NO : b.shiftNo;

    // The Manager can add data only AFTER the time is over: a shift after it has finished, a "once a day" parameter after that day is over.
    // (Before that the operator enters it. Checked here so it cannot be bypassed from the browser.)
    if (daily) {
      if (!dayEnded(b.date)) return fail("Once-a-day data can be added only after that day is over.", 403);
    } else if (!shiftEnded(await ensureShifts(), b.date, shiftNo)) {
      return fail("This shift is not finished yet. You can add its data after the shift ends.", 403);
    }

    const v = parseNumber(b.value);
    if (v === null) return fail(`Enter a valid ${inOut ? "In " : ""}value for ${param.name}`);
    const values = { [param.id]: v };
    const valuesOut: Record<string, number> = {};
    if (inOut) {
      const o = parseNumber(b.valueOut);
      if (o === null) return fail(`Enter a valid Out value for ${param.name}`);
      valuesOut[param.id] = o;
    }

    const row = await mergeTankReading({ tankId: b.tankId, date: b.date, shiftNo, values, valuesOut, recordedBy: `${manager.name} (Manager)` });
    return ok(row, 201);
  } catch (e) { console.error(e); return fail("Failed to save the reading", 500); }
}