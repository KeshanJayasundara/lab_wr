import { prisma } from "@/lib/prisma";
import { colomboToday, isDateStr } from "@/lib/plantConfig";
import { guard, unauthorized, fail, ok } from "../../_h";

// GET ?date=YYYY-MM-DD -> every Gali check of that Sri Lanka day
export async function GET(request: Request) {
  if (!(await guard(request))) return unauthorized();
  const d = new URL(request.url).searchParams.get("date") || colomboToday();
  if (!isDateStr(d)) return fail("Invalid date");
  try {
    const start = new Date(`${d}T00:00:00+05:30`);
    const end = new Date(start.getTime() + 24 * 3600 * 1000);
    const rows = await prisma.galiCheck.findMany({
      where: { createdAt: { gte: start, lt: end } },
      orderBy: { createdAt: "asc" },
      select: { id: true, esValue: true, phValue: true, decision: true, checkedBy: true, createdAt: true, vehicle: { select: { vehicleNumber: true } } },
    });
    return ok({ date: d, rows });
  } catch (e) { console.error(e); return fail("Failed to load daily data", 500); }
}