import ExcelJS from "exceljs";
import JSZip from "jszip";
import path from "path";
import { promises as fs } from "fs";

/**
 * Builds the "Daily Wastewater quality" workbook in the exact layout of
 * templates/daily_testing_format.xlsx (sheet "Formate"), filled from TestRecord rows.
 *
 *  - one sheet per month, named like "July - 2026"
 *  - one column per day of the month (empty days = "-"), then Monthly Average / Minimum / Maximum / No. of tests
 *  - Daily Efficiency + chart-data tables are rebuilt as live formulas for the number of days
 *  - the template's 6 charts are re-attached to every month sheet
 */

export type ReportRecord = {
  parameter: string;
  value: number;
  unit?: string | null;
  createdAt: Date | string;
  testedBy?: string | null;
  type?: { name: string; category?: { name: string } | null } | null;
};

export type ReportMonth = { year: number; month: number }; // month = 1..12

const TEMPLATE_PATH = path.join(process.cwd(), "templates", "daily_testing_format.xlsx");
const TEMPLATE_SHEET = "Formate";
const COL_FIRST_DAY = 4; // column D
const TPL_STAT_COL = 32; // AF  (Monthly Average) in the template
const TPL_DAYS = 28; // template has 28 day columns (D..AE)
const COLOMBO_OFFSET_MS = 5.5 * 60 * 60 * 1000; // lab works on Sri Lanka time
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

// ---------- name matching ----------
const SUP: Record<string, string> = {
  "₀":"0","₁":"1","₂":"2","₃":"3","₄":"4","₅":"5","₆":"6","₇":"7","₈":"8","₉":"9",
  "⁰":"0","¹":"1","²":"2","³":"3","⁴":"4","⁵":"5","⁶":"6","⁷":"7","⁸":"8","⁹":"9","ᶟ":"3",
};
const SUP_RE = new RegExp("[" + Object.keys(SUP).join("") + "]", "g");

export function normName(s: string) {
  return s.toLowerCase().replace(SUP_RE, (c) => SUP[c] || "").replace(/\([^)]*\)/g, "").replace(/[^a-z0-9]/g, "");
}

// "SV30 (%) 1" / "MLSS - 2" / "SV30 Tank 2"  ->  { base: "sv30", idx: 1|2 }
function splitSample(raw: string) {
  const m = raw.trim().match(/[\s\-_(#]0?([12])\)?\s*$/);
  const idx = m ? (parseInt(m[1], 10) as 1 | 2) : undefined;
  const base = normName(m ? raw.trim().slice(0, m.index) : raw);
  return { base: base || normName(raw), idx };
}

export type RowSpec = { row: number; keys: string[]; idx?: 1 | 2 };
export type Block = { loc: RegExp; timeRow?: number; rows: RowSpec[] };

const BALANCE_DISINFECT_COMMON = (start: number): RowSpec[] => [
  { row: start + 1, keys: ["temprature", "temperature", "temp"] },
  { row: start + 2, keys: ["ph"] },
  { row: start + 3, keys: ["do", "dissolvedoxygen"] },
  { row: start + 4, keys: ["ammonia", "ammonianitrogen", "nh4n", "nh3n", "nh4"] },
  { row: start + 5, keys: ["tss", "totalsuspendedsolids"] },
  { row: start + 6, keys: ["cod"] },
  { row: start + 7, keys: ["bod5", "bod"] },
  { row: start + 8, keys: ["ec", "conductivity", "electricalconductivity"] },
];

export const BLOCKS: Block[] = [
  {
    loc: /balanc/i,
    timeRow: 4,
    rows: [
      ...BALANCE_DISINFECT_COMMON(4),
      { row: 13, keys: ["s2", "sulphide", "sulfide"] },
      { row: 14, keys: ["totaln", "tn", "totalnitrogen"] },
      { row: 15, keys: ["totalpo43", "totalpo4", "totalphosphate", "totalphosphorus"] },
      { row: 16, keys: ["oilgrease", "oilandgrease", "og"] },
    ],
  },
  {
    loc: /disinfect/i,
    timeRow: 19,
    rows: [
      ...BALANCE_DISINFECT_COMMON(19),
      { row: 28, keys: ["totalchlorine"] },
      { row: 29, keys: ["residualchlorine", "resichlorine", "freechlorine"] },
      { row: 30, keys: ["fecolifm", "fecalcoliform", "faecalcoliform", "fcoliform", "ecoli"] },
      { row: 31, keys: ["color436", "colour436"] },
      { row: 32, keys: ["color525", "colour525"] },
      { row: 33, keys: ["color620", "colour620"] },
      { row: 34, keys: ["no2", "nitrite"] },
      { row: 35, keys: ["no3", "nitrate"] },
      { row: 36, keys: ["f", "fluoride"] },
      { row: 37, keys: ["s2", "sulphide", "sulfide"] },
      { row: 38, keys: ["reactivepo43", "reactivepo4", "reactivephosphate"] },
      { row: 39, keys: ["fe", "iron"] },
    ],
  },
  {
    loc: /anoxic/i,
    rows: [
      { row: 41, keys: ["tank01", "tank1"] },
      { row: 42, keys: ["tank02", "tank2"] },
    ],
  },
  {
    loc: /aerat/i,
    rows: [
      { row: 44, keys: ["sv30"], idx: 1 }, { row: 45, keys: ["sv30"], idx: 2 },
      { row: 46, keys: ["mlss"], idx: 1 }, { row: 47, keys: ["mlss"], idx: 2 },
      { row: 48, keys: ["mlvss"], idx: 1 }, { row: 49, keys: ["mlvss"], idx: 2 },
      { row: 50, keys: ["svi"], idx: 1 }, { row: 51, keys: ["svi"], idx: 2 },
      { row: 52, keys: ["fm", "fmratio"], idx: 1 }, { row: 53, keys: ["fm", "fmratio"], idx: 2 },
      { row: 54, keys: ["hrt"] },
      { row: 55, keys: ["sludgeload"], idx: 1 }, { row: 56, keys: ["sludgeload"], idx: 2 },
    ],
  },
  {
    loc: /sediment/i,
    rows: [
      { row: 58, keys: ["tss"], idx: 1 },
      { row: 59, keys: ["tss"], idx: 2 },
    ],
  },
];
export const SLUDGE_ROW = 61;
export const FLOW_ROW = 63;

// Daily efficiency rows: (balancing row - disinfection row) / balancing row * 100  (same formula as the template)
const EFFICIENCY: { row: number; inRow: number; outRow: number }[] = [
  { row: 65, inRow: 8, outRow: 23 },
  { row: 66, inRow: 9, outRow: 24 },
  { row: 67, inRow: 10, outRow: 25 },
  { row: 68, inRow: 11, outRow: 26 },
  { row: 69, inRow: 13, outRow: 37 },
];

export function findRow(rec: ReportRecord): number | null {
  const tankName = `${rec.type?.name ?? ""}`;
  const full = normName(rec.parameter);
  const { base, idx } = splitSample(rec.parameter);

  if (/flow/.test(full)) return FLOW_ROW;

  for (const block of BLOCKS) {
    if (!block.loc.test(tankName)) continue;
    for (const spec of block.rows) {
      if (spec.idx) {
        if (spec.keys.includes(base) && (idx ?? 1) === spec.idx) return spec.row;
      } else if (spec.keys.includes(full) || spec.keys.includes(base)) {
        return spec.row;
      }
    }
    return null;
  }
  if (/sludge/i.test(tankName)) return SLUDGE_ROW;
  return null;
}

// ---------- small helpers ----------
const letter = (n: number) => {
  let s = "";
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
};
const clone = <T,>(o: T): T => JSON.parse(JSON.stringify(o));
const colombo = (d: Date | string) => new Date(new Date(d).getTime() + COLOMBO_OFFSET_MS);
const dayKey = (c: Date) => `${c.getUTCFullYear()}-${String(c.getUTCMonth() + 1).padStart(2, "0")}-${String(c.getUTCDate()).padStart(2, "0")}`;

export function monthRangeUtc({ year, month }: ReportMonth) {
  const start = new Date(Date.UTC(year, month - 1, 1) - COLOMBO_OFFSET_MS);
  const end = new Date(Date.UTC(year, month, 1) - COLOMBO_OFFSET_MS);
  return { start, end };
}

// ---------- sheet builder ----------
function fillMonthSheet(ws: ExcelJS.Worksheet, ym: ReportMonth, records: ReportRecord[], unmapped: any[]) {
  const monthKey = `${ym.year}-${String(ym.month).padStart(2, "0")}`;

  // 1) map records -> (template row, day). latest record of the day wins
  type Cell = { value: number; ts: number };
  const cells = new Map<string, Cell>(); // `${row}|${day}`
  const firstTime = new Map<string, number>(); // `${timeRow}|${day}` -> earliest ts
  const days = new Set<string>();

  for (const rec of records) {
    const c = colombo(rec.createdAt);
    const dk = dayKey(c);
    if (!dk.startsWith(monthKey)) continue;
    const row = findRow(rec);
    if (!row) {
      unmapped.push({ date: new Date(Date.UTC(c.getUTCFullYear(), c.getUTCMonth(), c.getUTCDate())), tank: rec.type?.name ?? "", parameter: rec.parameter, value: rec.value, unit: rec.unit ?? "", by: rec.testedBy ?? "" });
      continue;
    }
    days.add(dk);
    const ts = new Date(rec.createdAt).getTime();
    const key = `${row}|${dk}`;
    const prev = cells.get(key);
    if (!prev || ts >= prev.ts) cells.set(key, { value: rec.value, ts });

    const block = BLOCKS.find((b) => b.loc.test(rec.type?.name ?? ""));
    if (block?.timeRow) {
      const tk = `${block.timeRow}|${dk}`;
      const t = firstTime.get(tk);
      if (t === undefined || ts < t) firstTime.set(tk, ts);
    }
  }

  // always show the FULL month (1st .. last day); days / cells with no test are filled with "-"
  const lastDay = new Date(Date.UTC(ym.year, ym.month, 0)).getUTCDate();
  const dayList = Array.from({ length: lastDay }, (_, i) => `${monthKey}-${String(i + 1).padStart(2, "0")}`);
  const N = dayList.length;
  const firstCol = COL_FIRST_DAY;
  const lastCol = COL_FIRST_DAY + N - 1;
  const statCol = lastCol + 1;
  const colOf = (i: number) => COL_FIRST_DAY + i;
  const rangeOf = (r: number) => `${letter(firstCol)}${r}:${letter(lastCol)}${r}`;

  // 2) capture template styles before touching anything
  const MAIN_FIRST = 3, MAIN_LAST = 69;
  const dayStyle: Record<number, any> = {};
  const statStyle: Record<number, any[]> = {};
  const statHeader: any[] = [];
  const statTemplateFormula: Record<number, boolean> = {};
  const dayTplFormula: Record<number, string> = {}; // e.g. MLVSS = MLSS*0.81, SVI, F/M ... (column D of the template)
  for (let r = MAIN_FIRST; r <= MAIN_LAST; r++) {
    dayStyle[r] = clone(ws.getCell(r, COL_FIRST_DAY).style);
    statStyle[r] = [0, 1, 2, 3].map((k) => clone(ws.getCell(r, TPL_STAT_COL + k).style));
    const v: any = ws.getCell(r, TPL_STAT_COL).value;
    statTemplateFormula[r] = !!(v && typeof v === "object" && "formula" in v);
    const dv: any = ws.getCell(r, COL_FIRST_DAY).value;
    if (dv && typeof dv === "object" && "formula" in dv) dayTplFormula[r] = String(dv.formula);
  }
  for (let k = 0; k < 4; k++) statHeader.push(ws.getCell(3, TPL_STAT_COL + k).value);

  // chart-data block (rows 70+): read the pattern of the first data row (71)
  const patt: { col: number; src?: number; konst?: any; style: any }[] = [];
  for (let c = 3; c <= 48; c++) {
    const cell = ws.getCell(71, c);
    const v: any = cell.value;
    const f = v && typeof v === "object" && "formula" in v ? String(v.formula) : null;
    const m = f ? f.match(/^([A-Z]+)(\d+)$/) : null;
    if (m) patt.push({ col: c, src: parseInt(m[2], 10), style: clone(cell.style) });
    else if (v !== null && v !== undefined) patt.push({ col: c, konst: v, style: clone(cell.style) });
  }
  const bottomStyle = patt.length ? patt[0].style : {};

  // 3) clear old day/stat area + old chart-data rows
  const clearTo = Math.max(TPL_STAT_COL + 3, statCol + 3);
  for (let r = MAIN_FIRST; r <= MAIN_LAST; r++) {
    for (let c = COL_FIRST_DAY; c <= clearTo; c++) {
      const cell = ws.getCell(r, c);
      cell.value = null;
      cell.style = {};
    }
  }
  for (let r = 71; r <= Math.max(98, 70 + N); r++) {
    for (let c = 3; c <= 48; c++) {
      const cell = ws.getCell(r, c);
      cell.value = null;
      cell.style = {};
    }
  }

  for (let i = 0; i < N; i++) ws.getColumn(colOf(i)).width = 9.7;

  // 4) header row (dates + stat titles)
  ws.getRow(1).height = 36; // the merged title "Daily Wastewater quality" wraps onto 2 lines
  ws.getCell("C1").value = MONTH_NAMES[ym.month - 1];
  ws.getCell("C1").style = clone(ws.getCell("B1").style);
  dayList.forEach((dk, i) => {
    const [y, m, d] = dk.split("-").map(Number);
    const cell = ws.getCell(3, colOf(i));
    cell.value = new Date(Date.UTC(y, m - 1, d));
    cell.style = clone(dayStyle[3]);
  });
  for (let k = 0; k < 4; k++) {
    const cell = ws.getCell(3, statCol + k);
    cell.value = statHeader[k];
    cell.style = clone(statStyle[3][k]);
  }

  // 5) body rows
  const timeRows = BLOCKS.filter((b) => b.timeRow).map((b) => b.timeRow as number);
  const dataRows = new Set<number>([
    ...BLOCKS.flatMap((b) => b.rows.map((r) => r.row)),
    SLUDGE_ROW, FLOW_ROW,
  ]);
  const effRows = new Set(EFFICIENCY.map((e) => e.row));

  for (let r = 4; r <= MAIN_LAST; r++) {
    const isTime = timeRows.includes(r);
    const hasStats = dataRows.has(r) || effRows.has(r) || isTime;
    const styled = dayStyle[r] !== undefined;
    if (!styled) continue;

    for (let i = 0; i < N; i++) {
      const col = colOf(i);
      const cell = ws.getCell(r, col);
      cell.style = clone(dayStyle[r]);

      const center = () => { cell.alignment = { ...(cell.alignment || {}), horizontal: "center", vertical: "middle" }; };

      if (r === 18) {
        // "Date" row of the disinfection block: sample date = test day + 1 (same as the template)
        const [yy, mm, dd] = dayList[i].split("-").map(Number);
        cell.value = new Date(Date.UTC(yy, mm - 1, dd + 1));
        cell.numFmt = "[$-409]d\\-mmm;@";
        center();
      } else if (effRows.has(r)) {
        const e = EFFICIENCY.find((x) => x.row === r)!;
        const L = letter(col);
        cell.value = { formula: `IF(OR(NOT(ISNUMBER(${L}${e.inRow})),NOT(ISNUMBER(${L}${e.outRow}))),"-",IFERROR(((${L}${e.inRow}-${L}${e.outRow})/${L}${e.inRow})*100,"-"))` } as any;
        center();
      } else if (isTime) {
        const t = firstTime.get(`${r}|${dayList[i]}`);
        if (t !== undefined) {
          const c = colombo(new Date(t));
          cell.value = c.getUTCHours() + c.getUTCMinutes() / 100; // same convention as the sheet: 8:30 -> 8.30
        } else {
          cell.value = "-";
        }
        center();
      } else {
        const hit = cells.get(`${r}|${dayList[i]}`);
        if (hit) {
          cell.value = hit.value;
          center();
        } else if (dayTplFormula[r]) {
          // calculated rows of the template (MLVSS, SVI, F/M, HRT, sludge load): keep the live formula
          const L = letter(col);
          const f = dayTplFormula[r].replace(/\b([A-Z]{1,2})(\d+)\b/g, (_m: string, c: string, n: string) => (c === "D" ? L : c) + n);
          cell.value = { formula: `IFERROR(${f},"-")` } as any;
          center();
        } else if (dataRows.has(r)) {
          cell.value = "-";
          center();
        }
      }
    }

    for (let k = 0; k < 4; k++) {
      const cell = ws.getCell(r, statCol + k);
      cell.style = clone(statStyle[r][k]);
    }
    if (!hasStats) continue;

    const rng = rangeOf(r);
    const avg = ws.getCell(r, statCol), min = ws.getCell(r, statCol + 1), max = ws.getCell(r, statCol + 2), cnt = ws.getCell(r, statCol + 3);
    if (!isTime) avg.value = { formula: `IF(COUNT(${rng})=0,"",AVERAGE(${rng}))` } as any;
    min.value = { formula: `IF(COUNT(${rng})=0,"",MIN(${rng}))` } as any;
    max.value = { formula: `IF(COUNT(${rng})=0,"",MAX(${rng}))` } as any;
    cnt.value = { formula: `COUNT(${rng})` } as any;
    if (isTime) { min.numFmt = "0.00"; max.numFmt = "0.00"; }
    cnt.numFmt = "0";
  }

  // 6) chart-data tables (rows 71..70+N)
  for (let i = 0; i < N; i++) {
    const r = 71 + i;
    for (const p of patt) {
      const cell = ws.getCell(r, p.col);
      cell.style = clone(p.style ?? bottomStyle);
      if (p.src === 3) cell.value = { formula: `${letter(colOf(i))}${p.src}` } as any; // date
      else if (p.src) {
        // "-" (no test) must not be plotted as 0 -> #N/A (hidden below) leaves a gap in the charts
        const ref = `${letter(colOf(i))}${p.src}`;
        cell.value = { formula: `IF(ISNUMBER(${ref}),${ref},NA())` } as any;
      }
      else cell.value = p.konst;
    }
  }

  // hide the #N/A helper values in the chart-data tables
  ws.addConditionalFormatting({
    ref: `C71:AV${70 + N}`,
    rules: [{ type: "expression", formulae: ["ISNA(C71)"], priority: 1, style: { font: { color: { argb: "FFFFFFFF" } } } } as any],
  });

  return { N, rangeEndRow: 70 + N };
}

// ---------- chart re-attachment (exceljs cannot copy charts, so we graft the template's) ----------
async function graftCharts(buf: Buffer, tplBuf: Buffer, sheets: { name: string; N: number }[]) {
  const tpl = await JSZip.loadAsync(tplBuf);
  const out = await JSZip.loadAsync(buf);

  const tplDrawing = await tpl.file("xl/drawings/drawing1.xml")!.async("string");
  const tplDrawingRels = await tpl.file("xl/drawings/_rels/drawing1.xml.rels")!.async("string");
  const chartTargets = [...tplDrawingRels.matchAll(/Target="\.\.\/charts\/(chart\d+\.xml)"/g)].map((m) => m[1]);
  const tplCharts: Record<string, string> = {};
  for (const t of chartTargets) tplCharts[t] = await tpl.file(`xl/charts/${t}`)!.async("string");

  const wbXml = await out.file("xl/workbook.xml")!.async("string");
  const wbRels = await out.file("xl/_rels/workbook.xml.rels")!.async("string");
  const sheetFile = (name: string) => {
    const esc = name.replace(/&/g, "&amp;");
    const m = wbXml.match(new RegExp(`<sheet [^>]*name="${esc.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[^>]*r:id="([^"]+)"`));
    if (!m) return null;
    const t = wbRels.match(new RegExp(`<Relationship [^>]*Id="${m[1]}"[^>]*Target="([^"]+)"`)) || wbRels.match(new RegExp(`<Relationship [^>]*Target="([^"]+)"[^>]*Id="${m[1]}"`));
    if (!t) return null;
    return t[1].replace(/^\/?(xl\/)?/, "xl/");
  };

  let ct = await out.file("[Content_Types].xml")!.async("string");
  let chartCounter = 0;

  for (let s = 0; s < sheets.length; s++) {
    const { name, N } = sheets[s];
    const sf = sheetFile(name);
    if (!sf) continue;
    const delta = N - TPL_DAYS;
    const drawingName = `drawing_rep${s + 1}.xml`;

    // charts
    let drawingRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`;
    const idMap: Record<string, string> = {};
    for (const t of chartTargets) {
      chartCounter++;
      const newName = `chart_rep${chartCounter}.xml`;
      idMap[t] = newName;
      let x = tplCharts[t]
        .replace(/<c:(num|str)Cache>[\s\S]*?<\/c:\1Cache>/g, "")
        .replace(/Formate!/g, `'${name.replace(/'/g, "''")}'!`)
        .replace(/(\$[A-Z]{1,3}\$)98\b/g, `$1${70 + N}`);
      out.file(`xl/charts/${newName}`, x);
      ct = ct.replace("</Types>", `<Override PartName="/xl/charts/${newName}" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/></Types>`);
    }
    // keep original rIds of the template drawing
    for (const m of tplDrawingRels.matchAll(/<Relationship [^>]*Id="([^"]+)"[^>]*Target="\.\.\/charts\/(chart\d+\.xml)"[^>]*\/>/g)) {
      drawingRels += `<Relationship Id="${m[1]}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/${idMap[m[2]]}"/>`;
    }
    drawingRels += `</Relationships>`;

    const shifted = tplDrawing.replace(/<xdr:row>(\d+)<\/xdr:row>/g, (_, n) => `<xdr:row>${parseInt(n, 10) + delta}</xdr:row>`);
    out.file(`xl/drawings/${drawingName}`, shifted);
    out.file(`xl/drawings/_rels/${drawingName}.rels`, drawingRels);
    ct = ct.replace("</Types>", `<Override PartName="/xl/drawings/${drawingName}" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/></Types>`);

    // sheet -> drawing relationship
    const relsPath = sf.replace("worksheets/", "worksheets/_rels/") + ".rels";
    let rels = out.file(relsPath) ? await out.file(relsPath)!.async("string") : `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`;
    rels = rels.replace("</Relationships>", `<Relationship Id="rIdRepDrawing" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/${drawingName}"/></Relationships>`);
    out.file(relsPath, rels);

    let sx = await out.file(sf)!.async("string");
    if (!/<worksheet[^>]*xmlns:r=/.test(sx)) sx = sx.replace("<worksheet ", `<worksheet xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" `);
    const tag = `<drawing r:id="rIdRepDrawing"/>`;
    const m = sx.match(/<(legacyDrawing|legacyDrawingHF|drawingHF|picture|oleObjects|controls|webPublishItems|tableParts|extLst)[ >\/]/);
    sx = m ? sx.replace(m[0], tag + m[0]) : sx.replace("</worksheet>", tag + "</worksheet>");
    out.file(sf, sx);
  }

  out.file("[Content_Types].xml", ct);
  return out.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}

// ---------- public API ----------
export async function buildDailyReport(records: ReportRecord[], months: ReportMonth[]): Promise<Buffer> {
  const tplBuf = await fs.readFile(TEMPLATE_PATH);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(tplBuf as any);

  const tpl = wb.getWorksheet(TEMPLATE_SHEET);
  if (!tpl) throw new Error(`Template sheet "${TEMPLATE_SHEET}" not found in daily_testing_format.xlsx`);

  // keep a copy of the blank template sheet, then drop every original tab (they may share names with the new ones)
  const tplModel: any = clone(tpl.model);
  const tplMerges = tpl.model.merges;
  const colNum = (l: string) => l.split("").reduce((a, ch) => a * 26 + ch.charCodeAt(0) - 64, 0);
  const slaveStyles: { r: number; c: number; style: any }[] = [];
  for (const rng of tplMerges) {
    const mm = rng.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/);
    if (!mm) continue;
    for (let r = +mm[2]; r <= +mm[4]; r++)
      for (let c = colNum(mm[1]); c <= colNum(mm[3]); c++)
        if (r !== +mm[2] || c !== colNum(mm[1])) slaveStyles.push({ r, c, style: clone(tpl.getCell(r, c).style) });
  }
  [...wb.worksheets].forEach((w) => wb.removeWorksheet(w.id));

  const made: { ws: ExcelJS.Worksheet; ym: ReportMonth; name: string }[] = [];
  for (const ym of months) {
    const name = `${MONTH_NAMES[ym.month - 1]} - ${ym.year}`;
    const ws = wb.addWorksheet(name);
    const model: any = clone(tplModel);
    model.name = name;
    model.mergeCells = tplMerges;
    ws.model = model;
    slaveStyles.forEach(({ r, c, style }) => { ws.getCell(r, c).style = clone(style); });
    ws.name = name;
    made.push({ ws, ym, name });
  }

  const unmapped: any[] = [];
  const sizes: { name: string; N: number }[] = [];
  for (const m of made) {
    const { N } = fillMonthSheet(m.ws, m.ym, records, unmapped);
    sizes.push({ name: m.name, N });
  }

  if (unmapped.length) {
    const u = wb.addWorksheet("Unmapped Records");
    u.addRow(["Date", "Tank / Unit", "Parameter", "Value", "Unit", "Tested By"]).font = { bold: true };
    unmapped.forEach((x) => u.addRow([x.date, x.tank, x.parameter, x.value, x.unit, x.by]));
    u.getColumn(1).numFmt = "yyyy-mm-dd";
    [14, 24, 28, 12, 12, 20].forEach((w, i) => (u.getColumn(i + 1).width = w));
  }

  wb.views = [{ x: 0, y: 0, width: 14805, height: 8010, firstSheet: 0, activeTab: 0, visibility: "visible" } as any];
  const raw = Buffer.from(await wb.xlsx.writeBuffer());
  return graftCharts(raw, tplBuf, sizes);
}