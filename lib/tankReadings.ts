import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type NumMap = Record<string, number>;

// Thrown when a plant operator tries to save a parameter that already has a value (readings are write-once for operators)
export class AlreadyRecordedError extends Error {
  constructor(public names: string[]) {
    super("already recorded");
  }
}

// One TankReading row = one tank + one day + one shift (shift 0 = "once a day").
// A parameter is saved on its own, so the new values are MERGED into the row instead of replacing it:
// the other parameters already recorded in that row are kept.
export async function mergeTankReading(a: {
  tankId: string; date: string; shiftNo: number; values: NumMap; valuesOut: NumMap; recordedBy: string;
  // true = the operator flow: a parameter that already has a value is NOT overwritten (throws AlreadyRecordedError).
  // false/undefined = the manager flow: values may be corrected.
  onlyNew?: boolean;
  // parameterId -> name, used for the error message
  names?: Record<string, string>;
}) {
  const key = { tankId_date_shiftNo: { tankId: a.tankId, date: a.date, shiftNo: a.shiftNo } };
  return prisma.$transaction(async (tx) => {
    const old = await tx.tankReading.findUnique({ where: key });
    if (a.onlyNew) {
      const had = Object.keys(a.values).filter((id) => ((old?.values ?? {}) as NumMap)[id] !== undefined);
      if (had.length > 0) throw new AlreadyRecordedError(had.map((id) => a.names?.[id] ?? id));
    }
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