// Single source of truth for test status evaluation (pure, safe for client + server).

export type RangeConfig = {
  standardMin?: number | null;
  standardMax?: number | null;
  rangeText?: string | null;
} | null | undefined;

export type TestStatus = "Normal" | "Warning" | "Critical";

const TOLERANCE = 0.15; // 15% band outside the limit = Warning, beyond = Critical

// Parse text rules such as "< 30", "<= 5", "> 2", ">=0.5", "6.5 - 8.5"
function parseRangeText(text?: string | null): { min: number | null; max: number | null } | null {
  if (!text) return null;
  const t = text.replace(/,/g, "").trim();

  const between = t.match(/^(-?\d+(?:\.\d+)?)\s*(?:-|–|to)\s*(-?\d+(?:\.\d+)?)$/i);
  if (between) return { min: parseFloat(between[1]), max: parseFloat(between[2]) };

  const lt = t.match(/^(?:<|≤|<=|max\.?)\s*(-?\d+(?:\.\d+)?)/i);
  if (lt) return { min: null, max: parseFloat(lt[1]) };

  const gt = t.match(/^(?:>|≥|>=|min\.?)\s*(-?\d+(?:\.\d+)?)/i);
  if (gt) return { min: parseFloat(gt[1]), max: null };

  return null; // non-numeric text (e.g. "Absent") cannot be auto-evaluated
}

export function resolveLimits(config: RangeConfig): { min: number | null; max: number | null } | null {
  if (!config) return null;
  const min = config.standardMin ?? null;
  const max = config.standardMax ?? null;
  if (min !== null || max !== null) return { min, max };
  return parseRangeText(config.rangeText);
}

export function evaluateStatus(value: number, config: RangeConfig): TestStatus {
  const limits = resolveLimits(config);
  if (!limits || Number.isNaN(value)) return "Normal";
  const { min, max } = limits;

  const below = min !== null && value < min;
  const above = max !== null && value > max;
  if (!below && !above) return "Normal";

  let band: number;
  if (min !== null && max !== null && max > min) band = (max - min) * TOLERANCE;
  else band = Math.abs(below ? (min as number) : (max as number)) * TOLERANCE;

  if (below && value < (min as number) - band) return "Critical";
  if (above && value > (max as number) + band) return "Critical";
  return "Warning";
}