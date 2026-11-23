/**
 * Private-sample billing helpers.
 *
 * A parameter (e.g. "Calcium") may be listed under several sub-categories of the
 * same category. When a bill is built, it must be charged ONCE per category,
 * no matter how many sub-categories it appears in.
 */

export type PriceLike = {
  parameterId: string;
  price: number;
  categoryId?: string;
};

/**
 * Keep one row per parameter (per category if categoryId is present).
 * If prices differ between sub-categories, the first row wins (rows should be
 * ordered by createdAt asc). Change `pick` to use "lowest" or "highest" instead.
 */
export function uniqueByParameter<T extends PriceLike>(
  rows: T[],
  pick: (existing: T, next: T) => T = (existing) => existing
): T[] {
  const map = new Map<string, T>();
  for (const r of rows) {
    const k = `${r.categoryId ?? ""}::${r.parameterId}`;
    const cur = map.get(k);
    map.set(k, cur ? pick(cur, r) : r);
  }
  return [...map.values()];
}

/** Total of the rows with duplicates (same parameter) counted only once. */
export function billableTotal<T extends PriceLike>(rows: T[]): number {
  const total = uniqueByParameter(rows).reduce((a, r) => a + r.price, 0);
  return Math.round(total * 100) / 100;
}

/** Use this when building an invoice from the parameters the customer selected. */
export function buildInvoice<T extends PriceLike>(selected: T[]) {
  const lines = uniqueByParameter(selected);
  return { lines, total: billableTotal(selected) };
}

/* ───────────── Quotation totals (NWSDB format) ─────────────
 *  SSCL  = Subtotal x rate / (100 - rate)      (levy is `rate`% of the levy-inclusive amount)
 *  VAT   = (Subtotal + SSCL) x vatRate / 100
 *  Total = Subtotal + SSCL + VAT
 *  e.g. 8340 @ 2.5% / 18%  ->  SSCL 213.85, VAT 1539.69, Total 10093.54
 */
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function calcQuotation(subtotal: number, ssclRate: number, vatRate: number) {
  const sub = round2(subtotal);
  const sscl = ssclRate > 0 && ssclRate < 100 ? round2((sub * ssclRate) / (100 - ssclRate)) : 0;
  const vatBase = round2(sub + sscl);
  const vat = vatRate > 0 ? round2((vatBase * vatRate) / 100) : 0;
  return { subtotal: sub, sscl, vatBase, vat, total: round2(vatBase + vat) };
}