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

// ---------------------------------------------------------------------------
// Manager-defined parameters (Manager > Plant Operator > Gali Operator > Parameters & Ranges)
// ---------------------------------------------------------------------------
export type GaliParam = { id: string; name: string; unit: string | null; min: number; max: number };

export type GaliParamResult = GaliParam & { value: number; ok: boolean };

// Checks every parameter against its own range. Approved only when ALL of them are inside the range.
export function evaluateGaliParams(params: GaliParam[], values: Record<string, number>) {
  const results: GaliParamResult[] = params.map((p) => {
    const value = values[p.id];
    const ok = Number.isFinite(value) && value >= p.min && value <= p.max;
    return { ...p, value, ok };
  });
  return { results, approved: results.length > 0 && results.every((r) => r.ok) };
}