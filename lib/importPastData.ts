import ExcelJS from "exceljs";
import { evaluateStatus } from "./status";

/**
 * Past-data import (manager).
 *
 * Accepted file: .xlsx or .csv, ONE ROW PER RESULT, with these columns (header names are flexible):
 *
 *   Date | Category (optional) | Unit | Parameter | Value | Measure Unit (optional) | Tested By (optional)
 *
 * Dates: 2026-03-15, 15/03/2026, 15-03-2026 or a real Excel date cell.
 * Every row becomes one TestRecord whose createdAt is that date (12:00 Sri Lanka time),
 * so the monthly "Daily Testing" report picks it up exactly like a normal record.
 */

export const COLOMBO_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const MAX_ROWS = 10000;

export type RawRow = {
  line: number;
  date: unknown;
  category: string;
  unit: string;
  parameter: string;
  value: unknown;
  measureUnit: string;
  testedBy: string;
};

export type TypeInfo = {
  id: string;
  name: string;
  code: string | null;
  categoryId: string;
  categoryName: string;
  categoryCode: string | null;
};

export type ConfigInfo = {
  typeId: string;
  parameterName: string;
  unit: string | null;
  standardMin: number | null;
  standardMax: number | null;
  rangeText: string | null;
};

export type ValidationCtx = {
  types: TypeInfo[];
  configs: ConfigInfo[];
  existing: Set<string>; // `${typeId}|${norm(parameter)}|${YYYY-MM-DD}`
  todayKey: string; // YYYY-MM-DD in Sri Lanka time
  allowUnknownParams: boolean;
};

export type RowResult = {
  line: number;
  ref?: string; // where the value came from, e.g. "Row 12" or "June - 2026 · F5"
  sheet?: string; // template files only
  minutes?: number; // minutes after midnight (Sri Lanka time); default 12:00
  state: "ok" | "duplicate" | "error";
  message?: string;
  dateKey?: string;
  typeId?: string;
  categoryName?: string;
  categoryCode?: string | null;
  unitName?: string;
  unitCode?: string | null;
  parameter?: string;
  value?: number;
  measureUnit?: string;
  status?: string;
  testedBy?: string;
};

// ---------- helpers ----------
const SUB: Record<string, string> = {
  "₀": "0", "₁": "1", "₂": "2", "₃": "3", "₄": "4", "₅": "5", "₆": "6", "₇": "7", "₈": "8", "₉": "9",
  "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9",
};
const SUB_RE = new RegExp("[" + Object.keys(SUB).join("") + "]", "g");

export const norm = (s: string) =>
  (s || "").toLowerCase().replace(SUB_RE, (c) => SUB[c] || "").replace(/[^a-z0-9]/g, "");
export const normLoose = (s: string) => norm((s || "").replace(/\([^)]*\)/g, ""));

const HEADER_ALIASES: Record<keyof Omit<RawRow, "line">, string[]> = {
  date: ["date", "testdate", "sampledate", "day"],
  category: ["category", "testcategory"],
  unit: ["unit", "tank", "type", "unitname", "tankname", "tankunit", "processunit", "location"],
  parameter: ["parameter", "test", "parametername", "testparameter"],
  value: ["value", "result", "reading"],
  measureUnit: ["measureunit", "uom", "unitofmeasure", "measurementunit"],
  testedBy: ["testedby", "technician", "analyst", "tester"],
};

export function cellValue(v: any): unknown {
  if (v && typeof v === "object" && !(v instanceof Date)) {
    if ("result" in v) return cellValue(v.result);
    if ("richText" in v) return v.richText.map((t: any) => t.text).join("");
    if ("text" in v) return v.text;
  }
  return v;
}
export const str = (v: unknown) => (v === null || v === undefined ? "" : v instanceof Date ? "" : String(v).trim());

// small RFC-4180 CSV parser (we avoid exceljs' CSV reader because it guesses MM-DD-YYYY dates)
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let q = false;
  const src = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (q) {
      if (c === '"') {
        if (src[i + 1] === '"') { cur += '"'; i++; } else q = false;
      } else cur += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(cur); cur = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(cur); cur = "";
      rows.push(row); row = [];
    } else cur += c;
  }
  if (cur !== "" || row.length) { row.push(cur); rows.push(row); }
  return rows;
}

export async function readRows(buf: Buffer, filename: string): Promise<RawRow[]> {
  let grid: unknown[][] = [];
  if (/\.csv$/i.test(filename)) {
    grid = parseCsv(buf.toString("utf8"));
  } else if (/\.xlsx$/i.test(filename)) {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf as any);
    const ws = wb.worksheets[0];
    if (!ws) throw new Error("The Excel file has no sheets.");
    ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      const cells: unknown[] = [];
      for (let c = 1; c <= row.cellCount; c++) cells.push(cellValue(row.getCell(c).value));
      grid[rowNumber - 1] = cells;
    });
  } else {
    throw new Error("Please upload a .xlsx or .csv file.");
  }

  // header row = first row that has date + parameter + value columns
  let headerIdx = -1;
  let colOf: Partial<Record<keyof Omit<RawRow, "line">, number>> = {};
  for (let r = 0; r < Math.min(grid.length, 15); r++) {
    const cells = grid[r];
    if (!cells) continue;
    const map: typeof colOf = {};
    cells.forEach((h, idx) => {
      const n = norm(str(h));
      if (!n) return;
      (Object.keys(HEADER_ALIASES) as (keyof typeof HEADER_ALIASES)[]).forEach((k) => {
        if (map[k] === undefined && HEADER_ALIASES[k].includes(n)) map[k] = idx;
      });
    });
    if (map.date !== undefined && map.unit !== undefined && map.parameter !== undefined && map.value !== undefined) {
      headerIdx = r;
      colOf = map;
      break;
    }
  }
  if (headerIdx < 0) {
    throw new Error("Could not find the header row. The file needs these columns: Date, Unit, Parameter, Value (Category, Measure Unit and Tested By are optional).");
  }

  const out: RawRow[] = [];
  for (let r = headerIdx + 1; r < grid.length; r++) {
    const cells = grid[r];
    if (!cells || cells.every((c) => str(c) === "" && !(c instanceof Date) && typeof c !== "number")) continue;
    const get = (k: keyof typeof colOf) => (colOf[k] === undefined ? undefined : cells[colOf[k] as number]);
    out.push({
      line: r + 1,
      date: get("date"),
      category: str(get("category")),
      unit: str(get("unit")),
      parameter: str(get("parameter")),
      value: get("value"),
      measureUnit: str(get("measureUnit")),
      testedBy: str(get("testedBy")),
    });
    if (out.length > MAX_ROWS) throw new Error(`Too many rows (max ${MAX_ROWS} per import). Please split the file.`);
  }
  if (out.length === 0) throw new Error("No data rows found under the header.");
  return out;
}

function validYmd(y: number, m: number, d: number) {
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}
const key = (y: number, m: number, d: number) =>
  `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

// -> "YYYY-MM-DD" or null
export function parseDateKey(v: unknown): string | null {
  if (v instanceof Date && !isNaN(v.getTime())) {
    return key(v.getUTCFullYear(), v.getUTCMonth() + 1, v.getUTCDate());
  }
  if (typeof v === "number" && v > 20000 && v < 80000) {
    const dt = new Date(Math.round((v - 25569) * 86400000)); // Excel serial date
    return key(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
  }
  if (typeof v === "string") {
    const s = v.trim();
    let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    if (m && validYmd(+m[1], +m[2], +m[3])) return key(+m[1], +m[2], +m[3]);
    m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/); // Sri Lankan style dd/mm/yyyy
    if (m && validYmd(+m[3], +m[2], +m[1])) return key(+m[3], +m[2], +m[1]);
  }
  return null;
}

export const colomboDayKey = (d: Date) => new Date(d.getTime() + COLOMBO_OFFSET_MS).toISOString().slice(0, 10);

// a given time (minutes after midnight, Sri Lanka time) on that day, as a real Date. Default 12:00
export function atColombo(dateKey: string, minutes = 720) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0) + minutes * 60000 - COLOMBO_OFFSET_MS);
}
export const noonColombo = (dateKey: string) => atColombo(dateKey, 720);

export function dateKeyRange(rows: RawRow[]): { min: string; max: string } | null {
  const keys = rows.map((r) => parseDateKey(r.date)).filter((k): k is string => !!k).sort();
  return keys.length ? { min: keys[0], max: keys[keys.length - 1] } : null;
}

// ---------- validation ----------
export function validateRows(rows: RawRow[], ctx: ValidationCtx): RowResult[] {
  const seen = new Set<string>();
  const cfgByType = new Map<string, ConfigInfo[]>();
  for (const c of ctx.configs) {
    if (!cfgByType.has(c.typeId)) cfgByType.set(c.typeId, []);
    cfgByType.get(c.typeId)!.push(c);
  }

  return rows.map((r): RowResult => {
    const ref = `Row ${r.line}`;
    const fail = (message: string): RowResult => ({ line: r.line, ref, state: "error", message });

    const dateKey = parseDateKey(r.date);
    if (!dateKey) return fail("Invalid date (use 2026-03-15 or 15/03/2026)");
    if (dateKey > ctx.todayKey) return fail("Date is in the future");

    if (!r.unit) return fail("Unit is empty");
    if (!r.parameter) return fail("Parameter is empty");

    let num: number | null = null;
    if (typeof r.value === "number") num = r.value;
    else if (typeof r.value === "string" && r.value.trim() !== "") {
      const n = Number(r.value.replace(/,/g, "").trim());
      num = Number.isFinite(n) ? n : null;
    }
    if (num === null || !Number.isFinite(num)) return fail("Value is not a number");

    // ----- category + unit -----
    let pool = ctx.types;
    if (r.category) {
      const c = norm(r.category);
      pool = pool.filter((t) => norm(t.categoryName) === c || (t.categoryCode && norm(t.categoryCode) === c));
      if (pool.length === 0) return fail(`Category "${r.category}" not found`);
    }
    const u = norm(r.unit);
    let hits = pool.filter((t) => norm(t.name) === u || (t.code && norm(t.code) === u));
    if (hits.length === 0) {
      const ul = normLoose(r.unit);
      hits = pool.filter((t) => normLoose(t.name) === ul);
    }
    if (hits.length === 0) return fail(`Unit "${r.unit}" not found${r.category ? ` in category "${r.category}"` : ""}`);
    if (hits.length > 1) return fail(`Unit "${r.unit}" exists in several categories - add a Category column`);
    const type = hits[0];

    // ----- parameter (must be set up for that unit) -----
    const cfgs = cfgByType.get(type.id) || [];
    const p = norm(r.parameter);
    let cfg = cfgs.find((c) => norm(c.parameterName) === p);
    if (!cfg) {
      const pl = normLoose(r.parameter);
      cfg = cfgs.find((c) => normLoose(c.parameterName) === pl);
    }
    if (!cfg && !ctx.allowUnknownParams) {
      return fail(`Parameter "${r.parameter}" is not set up for "${type.name}" (assign it under Parameter Assign & Add Ranges first)`);
    }
    const parameter = cfg ? cfg.parameterName : r.parameter.trim();
    const status = evaluateStatus(num, cfg);

    // ----- duplicates -----
    const dupKey = `${type.id}|${norm(parameter)}|${dateKey}`;
    if (ctx.existing.has(dupKey)) {
      return { line: r.line, ref, state: "duplicate", message: "Already in the system for this date", dateKey, unitName: type.name, categoryName: type.categoryName, parameter, value: num };
    }
    if (seen.has(dupKey)) {
      return { line: r.line, ref, state: "duplicate", message: "Repeated in this file", dateKey, unitName: type.name, categoryName: type.categoryName, parameter, value: num };
    }
    seen.add(dupKey);

    return {
      line: r.line,
      ref,
      state: "ok",
      dateKey,
      typeId: type.id,
      categoryName: type.categoryName,
      categoryCode: type.categoryCode,
      unitName: type.name,
      unitCode: type.code,
      parameter,
      value: num,
      measureUnit: r.measureUnit || cfg?.unit || "mg/L",
      status,
      testedBy: r.testedBy,
    };
  });
}