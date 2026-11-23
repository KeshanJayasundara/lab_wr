// Gali vehicle check ranges.
// Change the numbers here and the limits change everywhere (screen + server).
export const GALI_RANGES = {
  ES: { min: 0, max: 10 },
  PH: { min: 0, max: 10 },
} as const;

export type GaliCheckResult = { esOk: boolean; phOk: boolean; approved: boolean };

export function evaluateGali(es: number, ph: number): GaliCheckResult {
  const esOk = Number.isFinite(es) && es >= GALI_RANGES.ES.min && es <= GALI_RANGES.ES.max;
  const phOk = Number.isFinite(ph) && ph >= GALI_RANGES.PH.min && ph <= GALI_RANGES.PH.max;
  return { esOk, phOk, approved: esOk && phOk };
}