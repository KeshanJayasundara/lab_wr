// >>> SAVE AS: app/api/manager/plant/shifts/route.ts   (REPLACE the whole file) - delete this line after saving <<<
import { prisma } from "@/lib/prisma";
import { ensureShifts } from "@/lib/plantConfig";
import { guard, unauthorized, fail, ok } from "../_h";

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

// GET -> the 3 shift definitions
export async function GET(request: Request) {
  if (!(await guard(request))) return unauthorized();
  try {
    return ok({ shifts: await ensureShifts() });
  } catch (e) { console.error(e); return fail("Failed to load shifts", 500); }
}

// PUT { shifts: [{shiftNo,label,startTime,endTime}] } -> edit the 3 shift definitions
export async function PUT(request: Request) {
  if (!(await guard(request))) return unauthorized();
  try {
    const b = await request.json();
    if (!Array.isArray(b.shifts)) return fail("Invalid shifts");
    for (const s of b.shifts) {
      if (![1, 2, 3].includes(s.shiftNo) || !s.label?.trim() || !HHMM.test(s.startTime) || !HHMM.test(s.endTime))
        return fail("Each shift needs a name and valid start / end times (HH:mm)");
    }
    await prisma.$transaction(
      b.shifts.map((s: any) =>
        prisma.tankShift.upsert({
          where: { shiftNo: s.shiftNo },
          update: { label: s.label.trim(), startTime: s.startTime, endTime: s.endTime },
          create: { shiftNo: s.shiftNo, label: s.label.trim(), startTime: s.startTime, endTime: s.endTime },
        })
      )
    );
    return ok(await ensureShifts());
  } catch (e) { console.error(e); return fail("Failed to save shifts", 500); }
}