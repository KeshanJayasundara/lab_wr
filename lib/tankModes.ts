// Per-PARAMETER check settings (set by the Manager when a parameter is added to a tank)
//   checkMode: SINGLE (one value) or IN_OUT (an In value and an Out value)
//   frequency: SHIFT (every shift) or DAILY (once a day)
export const CHECK_MODES = ["SINGLE", "IN_OUT"] as const;
export const FREQUENCIES = ["SHIFT", "DAILY"] as const;
export type CheckMode = (typeof CHECK_MODES)[number];
export type Frequency = (typeof FREQUENCIES)[number];

export const isCheckMode = (v: unknown): v is CheckMode => (CHECK_MODES as readonly unknown[]).includes(v);
export const isFrequency = (v: unknown): v is Frequency => (FREQUENCIES as readonly unknown[]).includes(v);

// "Once a day" readings are stored with this shift number (real shifts are 1..3)
export const DAILY_SHIFT_NO = 0;

// A number from a JSON body (number or numeric string), or null when it is missing / not a valid number
export function parseNumber(raw: unknown): number | null {
  const n = typeof raw === "number" ? raw : typeof raw === "string" && raw.trim() !== "" ? Number(raw) : NaN;
  return Number.isFinite(n) && Math.abs(n) <= 1e9 ? n : null;
}