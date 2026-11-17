import { NextResponse, connection } from "next/server";
import { LAB_UNITS, SI_BASE_UNITS, SI_DERIVED_UNITS, SI_COMPOUND_UNITS, type UnitGroup, type UnitOption } from "@/lib/units";

// Wikidata classes: Q223662 = SI base unit, Q3647174 = SI derived unit. P5061 = unit symbol.
const SPARQL = `
SELECT DISTINCT ?unitLabel ?symbol ?cls WHERE {
  VALUES ?cls { wd:Q223662 wd:Q3647174 }
  ?unit wdt:P31 ?cls .
  ?unit wdt:P5061 ?symbol .
  FILTER(LANG(?symbol) = "en")
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
LIMIT 200`;

const ENDPOINT = "https://query.wikidata.org/sparql";
const TTL_MS = 24 * 60 * 60 * 1000; // SI changes almost never, so refresh once a day

let cache: { at: number; groups: UnitGroup[]; source: "wikidata" | "fallback" } | null = null;

const fallbackGroups = (): UnitGroup[] => [
  { label: "Common lab units", options: LAB_UNITS },
  { label: "SI base units", options: SI_BASE_UNITS },
  { label: "SI derived units", options: SI_DERIVED_UNITS },
  { label: "SI units in base units (m², m³, m⁻¹ ...)", options: SI_COMPOUND_UNITS },
];

async function fetchFromWikidata(): Promise<UnitGroup[] | null> {
  const url = `${ENDPOINT}?format=json&query=${encodeURIComponent(SPARQL)}`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/sparql-results+json",
      "User-Agent": "lab-wr-lims/1.0 (unit dropdown)",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return null;

  const json = await res.json();
  const rows: any[] = json?.results?.bindings ?? [];

  const base = new Map<string, UnitOption>();
  const derived = new Map<string, UnitOption>();

  for (const r of rows) {
    const symbol: string | undefined = r.symbol?.value?.trim();
    const name: string | undefined = r.unitLabel?.value?.trim();
    if (!symbol || !name || /^Q\d+$/.test(name)) continue; // skip items without an English label
    const opt = { value: symbol, label: `${symbol} (${name})` };
    (r.cls?.value?.endsWith("Q223662") ? base : derived).set(symbol, opt);
  }

  // Sanity check: the SI has exactly 7 base units; anything less means the response is unusable.
  if (base.size < 7) return null;

  const byLabel = (a: UnitOption, b: UnitOption) => a.label.localeCompare(b.label);
  return [
    { label: "Common lab units", options: LAB_UNITS },
    { label: "SI base units", options: [...base.values()].sort(byLabel) },
    {
      label: "SI derived units",
      // If the derived-unit class returns nothing, keep the built-in list so the dropdown is never short.
      options: derived.size > 0 ? [...derived.values()].sort(byLabel) : SI_DERIVED_UNITS,
    },
    // Wikidata has no clean class for these, so they always come from the built-in list.
    { label: "SI units in base units (m², m³, m⁻¹ ...)", options: SI_COMPOUND_UNITS },
  ];
}

// GET /api/units -> unit groups, loaded live from Wikidata (cached 24h) with a built-in fallback
export async function GET() {
  await connection(); // opt out of prerendering (replaces `export const dynamic`, which cacheComponents rejects)
  if (cache && Date.now() - cache.at < TTL_MS) {
    return NextResponse.json({ success: true, source: cache.source, data: cache.groups });
  }

  try {
    const live = await fetchFromWikidata();
    if (live) {
      cache = { at: Date.now(), groups: live, source: "wikidata" };
      return NextResponse.json({ success: true, source: "wikidata", data: live });
    }
  } catch {
    // network down / timeout -> fall through to the built-in list
  }

  // Cache the fallback for a short time only, so we retry the live source soon.
  const groups = fallbackGroups();
  cache = { at: Date.now() - TTL_MS + 5 * 60 * 1000, groups, source: "fallback" };
  return NextResponse.json({ success: true, source: "fallback", data: groups });
}