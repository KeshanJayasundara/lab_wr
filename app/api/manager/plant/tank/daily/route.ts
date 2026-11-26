// >>> SAVE AS: app/api/manager/plant/tank/daily/route.ts   (REPLACE the whole file) - delete this line after saving <<<
import { prisma } from "@/lib/prisma";
import { colomboToday, ensureShifts, isDateStr } from "@/lib/plantConfig";
import { guard, unauthorized, fail, ok } from "../../_h";

// GET ?date= -> all tanks with their parameters and the 3 shift readings of that day
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

// POST { tankId, date, shiftNo, values } -> the Manager adds / corrects a reading for ANY day and shift
// (used when the operator could not enter the data in time)
export async function POST(request: Request) {
  const manager = await guard(request);
  if (!manager) return unauthorized();
  try {
    const b = await request.json();
    if (typeof b.tankId !== "string" || !isDateStr(b.date) || ![1, 2, 3].includes(b.shiftNo) || typeof b.values !== "object" || !b.values)
      return fail("Invalid reading");
    if (b.date > colomboToday()) return fail("You cannot add data for a future date");
    const tank = await prisma.plantTank.findUnique({ where: { id: b.tankId }, include: { parameters: true } });
    if (!tank) return fail("Tank not found", 404);
    if (tank.parameters.length === 0) return fail("This tank has no parameters yet");
    const values: Record<string, number> = {};
    for (const p of tank.parameters) {
      const raw = b.values[p.id];
      const n = typeof raw === "string" && raw.trim() === "" ? NaN : Number(raw);
      if (!Number.isFinite(n) || Math.abs(n) > 1e9) return fail(`Enter a valid value for ${p.name}`);
      values[p.id] = n;
    }
    const recordedBy = `${manager.name} (Manager)`;
    const row = await prisma.tankReading.upsert({
      where: { tankId_date_shiftNo: { tankId: tank.id, date: b.date, shiftNo: b.shiftNo } },
      update: { values, recordedBy },
      create: { tankId: tank.id, date: b.date, shiftNo: b.shiftNo, values, recordedBy },
    });
    return ok(row, 201);
  } catch (e) { console.error(e); return fail("Failed to save the reading", 500); }
}