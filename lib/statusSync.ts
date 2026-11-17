import { prisma } from "@/lib/prisma";
import { evaluateStatus } from "@/lib/status";

// Load config for one tank/unit + parameter and evaluate a value.
export async function evaluateFromDb(typeId: string | null | undefined, parameter: string, value: number) {
  if (!typeId) return "Normal";
  const config = await prisma.tankParameterConfig.findUnique({
    where: { typeId_parameterName: { typeId, parameterName: parameter.trim() } },
  });
  return evaluateStatus(value, config);
}

// Re-evaluate every saved test record of a tank/unit + parameter after the manager changes (or deletes) its range.
export async function resyncRecordStatuses(typeId: string, parameterName: string) {
  const config = await prisma.tankParameterConfig.findUnique({
    where: { typeId_parameterName: { typeId, parameterName: parameterName.trim() } },
  });
  const records = await prisma.testRecord.findMany({ where: { typeId, parameter: parameterName.trim() } });
  for (const r of records) {
    const status = evaluateStatus(r.value, config);
    if (status !== r.status) {
      await prisma.testRecord.update({ where: { id: r.id }, data: { status } });
    }
  }
}

// Attach always-current status to records being listed (covers old data saved before a range change).
export async function withLiveStatus<T extends { typeId: string | null; parameter: string; value: number; status: string }>(records: T[]): Promise<T[]> {
  const configs = await prisma.tankParameterConfig.findMany();
  const map = new Map(configs.map((c) => [`${c.typeId}::${c.parameterName}`, c]));
  return records.map((r) => {
    if (!r.typeId) return r;
    const cfg = map.get(`${r.typeId}::${r.parameter}`);
    return { ...r, status: evaluateStatus(r.value, cfg) };
  });
}