// Gali monthly report: month helpers (Sri Lanka time) + a small PDF builder.
// No extra npm package is needed - the PDF is written by hand (A4, Helvetica).

const COLOMBO_OFFSET_MS = 5.5 * 60 * 60 * 1000; // lab works on Sri Lanka time (UTC+5:30, no DST)
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export type MonthKey = { year: number; month: number }; // month = 1..12

const pad = (n: number) => String(n).padStart(2, "0");

// The current month in Sri Lanka time
export function currentColomboMonth(): MonthKey {
  const d = new Date(Date.now() + COLOMBO_OFFSET_MS);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}

// "2026-11" -> { year: 2026, month: 11 } (null when invalid)
export function parseMonthParam(value: string | null): MonthKey | null {
  if (!value) return null;
  const m = value.match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (year < 2000 || year > 2100 || month < 1 || month > 12) return null;
  return { year, month };
}

// Real start / end moments (UTC Date objects) of a Sri Lanka calendar month
export function colomboMonthRange({ year, month }: MonthKey): { start: Date; end: Date } {
  return {
    start: new Date(Date.UTC(year, month - 1, 1) - COLOMBO_OFFSET_MS),
    end: new Date(Date.UTC(year, month, 1) - COLOMBO_OFFSET_MS),
  };
}

export function monthLabel({ year, month }: MonthKey) {
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

// "2026-11-20 14:35" in Sri Lanka time
function formatColombo(value: Date | string) {
  const d = new Date(new Date(value).getTime() + COLOMBO_OFFSET_MS);
  return (
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ` +
    `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`
  );
}

// ---------------------------------------------------------------- PDF ----

export type GaliReportRow = {
  createdAt: Date | string;
  vehicleNumber: string;
  esValue: number;
  phValue: number;
  decision: "APPROVED" | "REJECTED" | string;
  checkedBy: string;
};

type Color = [number, number, number];

const PAGE_W = 595.28; // A4 (points)
const PAGE_H = 841.89;
const MARGIN = 40;
const ROW_H = 20;
const FOOTER_Y = 24;

const COLS = [
  { title: "Date / Time", x: MARGIN + 6, width: 100 },
  { title: "Vehicle", x: MARGIN + 116, width: 100 },
  { title: "ES", x: MARGIN + 226, width: 55 },
  { title: "PH", x: MARGIN + 286, width: 55 },
  { title: "Decision", x: MARGIN + 346, width: 70 },
  { title: "Checked By", x: MARGIN + 426, width: 89 },
];

const GREEN: Color = [0.02, 0.49, 0.33];
const RED: Color = [0.75, 0.1, 0.1];
const DARK: Color = [0.1, 0.13, 0.18];
const GRAY: Color = [0.4, 0.45, 0.5];

// The built-in PDF font only knows Latin-1 characters - anything else becomes "?"
function clean(text: string) {
  return String(text ?? "")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, "?");
}

function esc(text: string) {
  return clean(text).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

// Cut text that is too long for its column (approximate Helvetica width)
function fit(text: string, width: number, size: number) {
  const t = clean(text);
  const maxChars = Math.max(1, Math.floor((width - 6) / (size * 0.6)));
  return t.length > maxChars ? t.slice(0, Math.max(1, maxChars - 1)) + "." : t;
}

const num = (n: number) => (Math.round(n * 100) / 100).toString();
const rgb = (c: Color) => `${c[0]} ${c[1]} ${c[2]}`;

class Page {
  ops: string[] = [];
  text(x: number, y: number, str: string, opts: { size?: number; bold?: boolean; color?: Color } = {}) {
    const { size = 9, bold = false, color = DARK } = opts;
    this.ops.push(`BT /${bold ? "F2" : "F1"} ${size} Tf ${rgb(color)} rg ${num(x)} ${num(y)} Td (${esc(str)}) Tj ET`);
  }
  rect(x: number, y: number, w: number, h: number, color: Color) {
    this.ops.push(`${rgb(color)} rg ${num(x)} ${num(y)} ${num(w)} ${num(h)} re f`);
  }
  line(x1: number, y1: number, x2: number, y2: number, color: Color, width = 0.5) {
    this.ops.push(`${rgb(color)} RG ${width} w ${num(x1)} ${num(y1)} m ${num(x2)} ${num(y2)} l S`);
  }
}

export function buildGaliReportPdf(opts: {
  month: MonthKey;
  rows: GaliReportRow[];
  facilityLines?: string[]; // e.g. department name / region (optional)
  generatedAt?: Date;
}): Uint8Array {
  const { month, rows, facilityLines = [], generatedAt = new Date() } = opts;
  const approved = rows.filter((r) => r.decision === "APPROVED").length;
  const rejected = rows.filter((r) => r.decision === "REJECTED").length;

  const pages: Page[] = [];

  const drawTableHeader = (p: Page, topY: number) => {
    p.rect(MARGIN, topY - ROW_H, PAGE_W - MARGIN * 2, ROW_H, [0.9, 0.95, 0.93]);
    COLS.forEach((c) => p.text(c.x, topY - 13.5, c.title, { size: 9, bold: true }));
    p.line(MARGIN, topY - ROW_H, PAGE_W - MARGIN, topY - ROW_H, [0.6, 0.7, 0.66], 0.8);
  };

  // ---- first page: title + summary ----
  let page = new Page();
  pages.push(page);
  let y = PAGE_H - MARGIN;

  page.text(MARGIN, y - 14, "Gali Vehicle Check Report", { size: 18, bold: true, color: GREEN });
  y -= 22;
  facilityLines.filter(Boolean).forEach((l) => {
    page.text(MARGIN, y - 12, l, { size: 10, color: GRAY });
    y -= 14;
  });
  page.text(MARGIN, y - 14, `Month: ${monthLabel(month)}`, { size: 12, bold: true });
  y -= 18;
  page.text(MARGIN, y - 12, `Generated: ${formatColombo(generatedAt)} (Sri Lanka time)`, { size: 8.5, color: GRAY });
  y -= 22;

  // summary boxes
  const boxW = (PAGE_W - MARGIN * 2 - 20) / 3;
  const boxes: { label: string; value: number; color: Color }[] = [
    { label: "Total checks", value: rows.length, color: DARK },
    { label: "Approved", value: approved, color: GREEN },
    { label: "Rejected", value: rejected, color: RED },
  ];
  boxes.forEach((b, i) => {
    const bx = MARGIN + i * (boxW + 10);
    page.rect(bx, y - 44, boxW, 44, [0.96, 0.97, 0.97]);
    page.text(bx + 10, y - 16, b.label, { size: 9, color: GRAY });
    page.text(bx + 10, y - 36, String(b.value), { size: 16, bold: true, color: b.color });
  });
  y -= 62;

  drawTableHeader(page, y);
  y -= ROW_H;

  // ---- rows (oldest first) ----
  const sorted = [...rows].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  sorted.forEach((r, i) => {
    if (y - ROW_H < MARGIN + 20) {
      page = new Page();
      pages.push(page);
      y = PAGE_H - MARGIN;
      drawTableHeader(page, y);
      y -= ROW_H;
    }
    if (i % 2 === 1) page.rect(MARGIN, y - ROW_H, PAGE_W - MARGIN * 2, ROW_H, [0.975, 0.98, 0.98]);
    const ty = y - 13.5;
    const isApproved = r.decision === "APPROVED";
    page.text(COLS[0].x, ty, formatColombo(r.createdAt), { size: 9 });
    page.text(COLS[1].x, ty, fit(r.vehicleNumber, COLS[1].width, 9), { size: 9, bold: true });
    page.text(COLS[2].x, ty, String(r.esValue), { size: 9 });
    page.text(COLS[3].x, ty, String(r.phValue), { size: 9 });
    page.text(COLS[4].x, ty, isApproved ? "Approved" : "Rejected", { size: 9, bold: true, color: isApproved ? GREEN : RED });
    page.text(COLS[5].x, ty, fit(r.checkedBy, COLS[5].width, 9), { size: 9 });
    page.line(MARGIN, y - ROW_H, PAGE_W - MARGIN, y - ROW_H, [0.88, 0.9, 0.9], 0.4);
    y -= ROW_H;
  });

  if (sorted.length === 0) {
    page.text(MARGIN + 6, y - 14, "No Gali checks were recorded in this month.", { size: 10, color: GRAY });
  }

  // ---- footer on every page ----
  pages.forEach((p, i) => {
    p.line(MARGIN, FOOTER_Y + 12, PAGE_W - MARGIN, FOOTER_Y + 12, [0.85, 0.87, 0.87], 0.5);
    p.text(MARGIN, FOOTER_Y, `Gali Vehicle Check Report - ${monthLabel(month)}`, { size: 8, color: GRAY });
    p.text(PAGE_W - MARGIN - 50, FOOTER_Y, `Page ${i + 1} of ${pages.length}`, { size: 8, color: GRAY });
  });

  // ---- assemble the PDF file ----
  // object layout: 1 catalog, 2 pages, 3 font, 4 bold font, then (page, content) pairs
  const objects: string[] = [];
  const pageObjIds = pages.map((_, i) => 5 + i * 2);
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = `<< /Type /Pages /Kids [${pageObjIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`;
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
  objects[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";
  pages.forEach((p, i) => {
    const pageId = 5 + i * 2;
    const contentId = pageId + 1;
    const stream = p.ops.join("\n");
    objects[pageId] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] ` +
      `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`;
    objects[contentId] = `<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`;
  });

  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  for (let id = 1; id < objects.length; id++) {
    offsets[id] = Buffer.byteLength(out, "latin1");
    out += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }
  const xrefAt = Buffer.byteLength(out, "latin1");
  out += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let id = 1; id < objects.length; id++) {
    out += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  }
  out += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`;

  return new Uint8Array(Buffer.from(out, "latin1"));
}