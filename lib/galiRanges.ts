// Gali vehicle check ranges.
// Change the numbers here and the limits change everywhere (screen + server).
export const GALI_RANGES = {
  ES: { min: 0, max: 10 },
  PH: { min: 0, max: 10 },
} as const;

export type GaliCheckResult = { esOk: boolean; phOk: boolean; approved: boolean };

export type GaliRangeSet = { ES: { min: number; max: number }; PH: { min: number; max: number } };

// `ranges` lets the Manager-defined limits (database) replace the built-in defaults.
export function evaluateGali(es: number, ph: number, ranges: GaliRangeSet = GALI_RANGES): GaliCheckResult {
  const esOk = Number.isFinite(es) && es >= ranges.ES.min && es <= ranges.ES.max;
  const phOk = Number.isFinite(ph) && ph >= ranges.PH.min && ph <= ranges.PH.max;
  return { esOk, phOk, approved: esOk && phOk };
}