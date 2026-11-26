import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type NumMap = Record<string, number>;

// One TankReading row = one tank + one day + one shift (shift 0 = "once a day").
// A parameter is saved on its own, so the new values are MERGED into the row instead of replacing it:
// the other parameters already recorded in that row are kept.
export async function mergeTankReading(a: {
  tankId: string; date: string; shiftNo: number; values: NumMap; valuesOut: NumMap; recordedBy: string;
}) {
  const key = { tankId_date_shiftNo: { tankId: a.tankId, date: a.date, shiftNo: a.shiftNo } };
  return prisma.$transaction(async (tx) => {
    const old = await tx.tankReading.findUnique({ where: key });
    const values = { ...((old?.values ?? {}) as NumMap), ...a.values };
    const out = { ...((old?.valuesOut ?? {}) as NumMap), ...a.valuesOut };
    const extra = Object.keys(out).length > 0 ? { valuesOut: out as Prisma.InputJsonValue } : {};
    return tx.tankReading.upsert({
      where: key,
      update: { values: values as Prisma.InputJsonValue, recordedBy: a.recordedBy, ...extra },
      create: { tankId: a.tankId, date: a.date, shiftNo: a.shiftNo, values: values as Prisma.InputJsonValue, recordedBy: a.recordedBy, ...extra },
    });
  });
}