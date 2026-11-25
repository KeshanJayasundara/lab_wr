import { prisma } from "@/lib/prisma";
import { GALI_RANGES } from "@/lib/galiRanges";

export const DEFAULT_SHIFTS = [
  { shiftNo: 1, label: "Shift 1 (Morning)", startTime: "06:00", endTime: "14:00" },
  { shiftNo: 2, label: "Shift 2 (Evening)", startTime: "14:00", endTime: "22:00" },
  { shiftNo: 3, label: "Shift 3 (Night)", startTime: "22:00", endTime: "06:00" },
];

export const DEFAULT_DUTIES = [
  { name: "Gali Operator", kind: "GALI" },
  { name: "Tank Operator", kind: "TANK" },
];

// Today's date (Sri Lanka) as YYYY-MM-DD
export function colomboToday() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Colombo" });
}

export const isDateStr = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

export async function ensureShifts() {
  const count = await prisma.tankShift.count();
  if (count === 0) await prisma.tankShift.createMany({ data: DEFAULT_SHIFTS, skipDuplicates: true });
  return prisma.tankShift.findMany({ orderBy: { shiftNo: "asc" } });
}

export async function ensureDuties() {
  const count = await prisma.plantDuty.count();
  if (count === 0) await prisma.plantDuty.createMany({ data: DEFAULT_DUTIES, skipDuplicates: true });
  return prisma.plantDuty.findMany({ orderBy: { createdAt: "asc" } });
}

// Gali ranges: Manager-defined values (parameters named ES / PH) win, otherwise the built-in defaults.
export async function getGaliRanges() {
  const rows = await prisma.galiParameter.findMany({ where: { name: { in: ["ES", "PH"], mode: "insensitive" } } });
  const find = (n: string) => rows.find((r) => r.name.toUpperCase() === n);
  const es = find("ES");
  const ph = find("PH");
  return {
    ES: es ? { min: es.min, max: es.max } : { ...GALI_RANGES.ES },
    PH: ph ? { min: ph.min, max: ph.max } : { ...GALI_RANGES.PH },
  };
}

// Every Gali parameter + range the Manager has set. ES and PH are created with the defaults on first use.
export async function getGaliParameters() {
  if ((await prisma.galiParameter.count()) === 0) {
    await prisma.galiParameter.createMany({
      data: [
        { name: "ES", min: GALI_RANGES.ES.min, max: GALI_RANGES.ES.max },
        { name: "PH", unit: "pH", min: GALI_RANGES.PH.min, max: GALI_RANGES.PH.max },
      ],
      skipDuplicates: true,
    });
  }
  return prisma.galiParameter.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, unit: true, min: true, max: true },
  });
}

type ShiftDef = { shiftNo: number; startTime: string; endTime: string };
const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

function colomboNow() {
  const d = new Date(Date.now() + 5.5 * 3600 * 1000);
  return { minutes: d.getUTCHours() * 60 + d.getUTCMinutes(), today: colomboToday(), yesterday: new Date(d.getTime() - 24 * 3600 * 1000).toISOString().slice(0, 10) };
}

// Which shift is running right now (Sri Lanka time) and which "shift date" it belongs to.
// A night shift that passes midnight (22:00-06:00) still belongs to the day it started on.
export function currentShift(shifts: ShiftDef[]) {
  const now = colomboNow();
  for (const s of shifts) {
    const a = toMin(s.startTime), b = toMin(s.endTime);
    if (a < b ? now.minutes >= a && now.minutes < b : now.minutes >= a || now.minutes < b) {
      return { shiftNo: s.shiftNo, date: a >= b && now.minutes < b ? now.yesterday : now.today };
    }
  }
  return { shiftNo: null as number | null, date: now.today };
}

// The date a reading for `shiftNo` made right now should be stored under
export function dateForShiftNow(shifts: ShiftDef[], shiftNo: number) {
  const s = shifts.find((x) => x.shiftNo === shiftNo);
  const now = colomboNow();
  if (s && toMin(s.startTime) >= toMin(s.endTime) && now.minutes < toMin(s.endTime)) return now.yesterday;
  return now.today;
}

export type ShiftStatus = "RUNNING" | "CLOSED" | "UPCOMING";

// Status of every shift for the current "shift day" (Sri Lanka time).
// RUNNING = time is open, CLOSED = time is over (blocked), UPCOMING = not started yet (blocked).
export function shiftBoard(shifts: ShiftDef[]) {
  const now = colomboNow();
  const cur = currentShift(shifts);
  const date = cur.date; // today, or yesterday while the post-midnight part of a night shift is running
  const nowOff = date === now.today ? now.minutes : now.minutes + 1440;
  const statuses = shifts.map((s) => {
    const a = toMin(s.startTime);
    let b = toMin(s.endTime);
    if (b <= a) b += 1440;
    const status: ShiftStatus = nowOff >= b ? "CLOSED" : nowOff < a ? "UPCOMING" : "RUNNING";
    return { shiftNo: s.shiftNo, status };
  });
  return { date, statuses };
}

// Has the shift that belongs to `date` already finished (Sri Lanka time)?
// A night shift (22:00-06:00) belongs to the day it started on, so on that date it only ends the next morning.
export function shiftEnded(shifts: ShiftDef[], date: string, shiftNo: number) {
  const s = shifts.find((x) => x.shiftNo === shiftNo);
  if (!s) return false;
  const now = colomboNow();
  const daysAgo = Math.round((Date.parse(`${now.today}T00:00:00Z`) - Date.parse(`${date}T00:00:00Z`)) / 86400000);
  if (daysAgo < 0) return false; // a future date
  const a = toMin(s.startTime);
  let b = toMin(s.endTime);
  if (b <= a) b += 1440;
  return now.minutes + daysAgo * 1440 >= b;
}

// Is the whole day over (Sri Lanka time)? Today is still running, so only earlier dates count.
export const dayEnded = (date: string) => date < colomboToday();

// "  John   Silva " -> "john silva" (for comparing a typed name with the account name)
export const normName = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();