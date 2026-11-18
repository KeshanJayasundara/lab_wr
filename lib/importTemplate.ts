import ExcelJS from "exceljs";
import path from "path";
import { findRow, BLOCKS, SLUDGE_ROW, FLOW_ROW } from "./dailyReport";
import { evaluateStatus } from "./status";
import {
  norm,
  parseDateKey,
  cellValue,
  str,
  RowResult,
  TypeInfo,
  ConfigInfo,
} from "./importPastData";

/**
 * Reads the "Daily Wastewater quality" workbook (the same layout the report export produces):
 *   - one sheet per month (any sheet name), dates in row 3 from column D, one column per tested day
 *   - rows are identified by the labels in columns A / B / C, so shifted or deleted rows still work
 *   - the "Time" rows give the time of day of each test (8.30 = 08:30)
 *   - formula cells (MLVSS, SVI, efficiency, averages ...) are calculated values, so they are skipped
 *
 * Every value is matched to the unit + parameter that is set up in the system for the chosen category,
 * using the very same rules the report uses to place a record on a row (findRow).
 */

const TEMPLATE_PATH = path.join(process.cwd(), "templates", "daily_testing_format.xlsx");

const letter = (n: number) => {
  let s = "";
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
};

const isFormula = (v: any) => !!v && typeof v === "object" && !(v instanceof Date) && ("formula" in v || "sharedFormula" in v);
const label = (ws: ExcelJS.Worksheet, r: number, c: number) => str(cellValue(ws.getCell(r, c).value));

// ---------- find the month sheets ----------
export function templateSheets(wb: ExcelJS.Workbook): ExcelJS.Worksheet[] {
  return wb.worksheets.filter(
    (ws) => norm(label(ws, 3, 1)) === "location" && norm(label(ws, 3, 2)) === "parameter"
  );
}

// the date header: first date cell in row 3 (columns B..L) and the run of dates that follows
function dayColumns(ws: ExcelJS.Worksheet): { col: number; dateKey: string }[] {
  const out: { col: number; dateKey: string }[] = [];
  for (let c = 2; c <= 12 && out.length === 0; c++) {
    if (parseDateKey(cellValue(ws.getCell(3, c).value)) === null) continue;
    for (let k = c; k <= ws.columnCount; k++) {
      const dk = parseDateKey(cellValue(ws.getCell(3, k).value));
      if (dk === null) break; // "Monthly Average" etc. -> stop
      out.push({ col: k, dateKey: dk });
    }
  }
  return out;
}

export function templateDateRange(sheets: ExcelJS.Worksheet[]): { min: string; max: string } | null {
  const keys = sheets.flatMap((ws) => dayColumns(ws).map((d) => d.dateKey)).sort();
  return keys.length ? { min: keys[0], max: keys[keys.length - 1] } : null;
}

// ---------- standard row labels (from the official template) ----------
let stdCache: Map<string, number> | null = null;
async function standardRows() {
  if (stdCache) return stdCache;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(TEMPLATE_PATH);
  const ws = wb.getWorksheet("Formate") ?? wb.worksheets[0];
  const m = new Map<string, number>();
  for (let r = 4; r <= 63; r++) {
    const a = label(ws, r, 1), b = label(ws, r, 2), c = label(ws, r, 3);
    if (!a && !b) continue;
    m.set(`${norm(a)}|${norm(b)}|${norm(c)}`, r);
  }
  stdCache = m;
  return m;
}

function standardRowOf(std: Map<string, number>, a: string, b: string, c: string): number | null {
  const full = std.get(`${norm(a)}|${norm(b)}|${norm(c)}`);
  if (full) return full;
  const prefix = `${norm(a)}|${norm(b)}|`;
  const hits = [...std.entries()].filter(([k]) => k.startsWith(prefix));
  return hits.length === 1 ? hits[0][1] : null;
}

// ---------- which system parameter does each template row stand for? ----------
type Target = { type: TypeInfo; cfg: ConfigInfo };
function buildTargets(types: TypeInfo[], configs: ConfigInfo[], categoryId: string) {
  const map = new Map<number, Target[]>();
  for (const type of types.filter((t) => t.categoryId === categoryId)) {
    for (const cfg of configs.filter((c) => c.typeId === type.id)) {
      const row = findRow({ parameter: cfg.parameterName, value: 0, createdAt: new Date(), type: { name: type.name } });
      if (!row) continue;
      if (!map.has(row)) map.set(row, []);
      map.get(row)!.push({ type, cfg });
    }
  }
  return map;
}

const blockOfRow = (stdRow: number) => BLOCKS.find((b) => b.rows.some((r) => r.row === stdRow));
const isDataRow = (stdRow: number) => !!blockOfRow(stdRow) || stdRow === SLUDGE_ROW || stdRow === FLOW_ROW;

// 8.3 -> 08:30, 14.45 -> 14:45, 10 -> 10:00 (hours.minutes convention of the sheet). null if it does not look like a time
function toMinutes(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v >= 24) return null;
  const h = Math.floor(v);
  const m = Math.round((v - h) * 100);
  if (m > 59) return null;
  return h * 60 + m;
}

export type TemplateCtx = {
  types: TypeInfo[];
  configs: ConfigInfo[];
  categoryId: string;
  existing: Set<string>;
  todayKey: string;
};

export type SheetInfo = { name: string; days: number };

export async function extractTemplate(
  sheets: ExcelJS.Worksheet[],
  ctx: TemplateCtx
): Promise<{ results: RowResult[]; notes: string[]; sheets: SheetInfo[] }> {
  const std = await standardRows();
  const targets = buildTargets(ctx.types, ctx.configs, ctx.categoryId);
  const results: RowResult[] = [];
  const notes: string[] = [];
  const sheetInfos: SheetInfo[] = [];
  const seen = new Set<string>();
  const notSetUp = new Map<string, number>(); // row label -> number of skipped values (all sheets together)
  const ambiguous = new Map<string, { names: string; n: number }>();

  for (const ws of sheets) {
    const days = dayColumns(ws);
    sheetInfos.push({ name: ws.name, days: days.length });
    if (days.length === 0) { notes.push(`${ws.name}: no dates found in row 3, sheet skipped.`); continue; }

    // sheet row -> standard row (by labels) ; stop at the efficiency / chart block
    const rowStd = new Map<number, number>();
    const timeRowOfStd = new Map<number, number>(); // standard time row -> row in this sheet
    for (let r = 4; r <= ws.rowCount; r++) {
      const a = label(ws, r, 1);
      if (/^daily\s*efficiency/i.test(a)) break;
      const b = label(ws, r, 2), c = label(ws, r, 3);
      if (!a && !b) continue;
      const s = standardRowOf(std, a, b, c);
      if (!s) continue;
      rowStd.set(r, s);
      if (norm(b) === "time") timeRowOfStd.set(s, r);
    }

    for (const [r, s] of rowStd) {
      if (!isDataRow(s)) continue; // Date / Time rows

      const rowLabel = [label(ws, r, 1), label(ws, r, 2), label(ws, r, 3)]
        .filter((x, i, a) => x && a.indexOf(x) === i)
        .join(" - ");

      // cells that really hold a value
      const cells = days
        .map((d) => ({ d, v: ws.getCell(r, d.col).value as any }))
        .filter(({ v }) => {
          if (v === null || v === undefined) return false;
          if (isFormula(v)) return false;
          const t = typeof v === "string" ? v.trim() : v;
          return t !== "" && t !== "-" && t !== "–";
        });
      if (cells.length === 0) continue;

      const tg = targets.get(s) || [];
      if (tg.length === 0) {
        notSetUp.set(rowLabel, (notSetUp.get(rowLabel) || 0) + cells.length);
        continue;
      }
      if (tg.length > 1) {
        const prev = ambiguous.get(rowLabel);
        ambiguous.set(rowLabel, {
          names: tg.map((t) => `${t.type.name} / ${t.cfg.parameterName}`).join(", "),
          n: (prev?.n || 0) + cells.length,
        });
        continue;
      }
      const { type, cfg } = tg[0];
      const tRow = blockOfRow(s)?.timeRow;
      const sheetTimeRow = tRow ? timeRowOfStd.get(tRow) : undefined;

      for (const { d, v } of cells) {
        const ref = `${ws.name} · ${letter(d.col)}${r}`;
        const base = { line: r, ref, sheet: ws.name };
        const raw = cellValue(v);

        let num: number | null = null;
        if (typeof raw === "number") num = raw;
        else if (typeof raw === "string") {
          const n = Number(raw.replace(/,/g, "").trim());
          num = Number.isFinite(n) ? n : null;
        }
        const common = { ...base, dateKey: d.dateKey, unitName: type.name, categoryName: type.categoryName, parameter: cfg.parameterName };
        if (num === null || !Number.isFinite(num)) {
          results.push({ ...common, state: "error", message: `Value "${str(raw)}" is not a number` });
          continue;
        }
        if (d.dateKey > ctx.todayKey) {
          results.push({ ...common, value: num, state: "error", message: "Date is in the future" });
          continue;
        }

        const dupKey = `${type.id}|${norm(cfg.parameterName)}|${d.dateKey}`;
        if (ctx.existing.has(dupKey)) {
          results.push({ ...common, value: num, state: "duplicate", message: "Already in the system for this date" });
          continue;
        }
        if (seen.has(dupKey)) {
          results.push({ ...common, value: num, state: "duplicate", message: "Repeated in this file" });
          continue;
        }
        seen.add(dupKey);

        const minutes = sheetTimeRow ? toMinutes(cellValue(ws.getCell(sheetTimeRow, d.col).value)) : null;
        results.push({
          ...common,
          state: "ok",
          typeId: type.id,
          categoryCode: type.categoryCode,
          unitCode: type.code,
          value: num,
          measureUnit: cfg.unit || "mg/L",
          status: evaluateStatus(num, cfg),
          testedBy: "",
          minutes: minutes ?? 720,
        });
      }
    }
  }
  for (const [lbl, n] of notSetUp) {
    notes.push(`"${lbl}" is not set up in this category - ${n} value${n > 1 ? "s" : ""} skipped.`);
  }
  for (const [lbl, { names, n }] of ambiguous) {
    notes.push(`"${lbl}" matches several parameters (${names}) - ${n} value${n > 1 ? "s" : ""} skipped.`);
  }
  return { results, notes, sheets: sheetInfos };
}