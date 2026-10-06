/**
 * Single-competitor (Airalo) comparison and import planning. Pure, no IO.
 * One competitor is never treated as a market reference; it only produces an
 * "Airalo comparison" indicator. Prices are never changed here.
 */
import { packageKey } from "./manual-prices";
import { round2, type CompetitorPrice } from "./competitive";

export type MatchQuality = "EXACT" | "SHORTER_VALIDITY" | "COMPARABLE" | "NO_MATCH";
export type AiraloIndicator = "CHEAPER" | "CHEAPER_LOW_MARGIN" | "CLOSE" | "EXPENSIVE" | "NO_DATA";
/** Prices within ±this % of the competitor count as "close". */
export const CLOSE_BAND_PCT = 3;

const parseKey = (key: string) => {
  const [d, v] = key.split("|");
  return { unlimited: d === "U", gb: d === "U" ? null : Number(d), days: Number(v) };
};

/**
 * Standard: same GB; same validity = EXACT, shorter competitor validity = SHORTER_VALIDITY (closest wins).
 * Unlimited: same duration only. Different data amounts or Unlimited↔fixed never match.
 */
export function matchCompetitor(key: string, entries: CompetitorPrice[]): { entry: CompetitorPrice | null; quality: MatchQuality } {
  const p = parseKey(key);
  const live = entries.filter((e) => e.active !== false && !e.possiblyRemoved);
  const exact = live.find((e) => e.key === key);
  if (exact) return { entry: exact, quality: "EXACT" };
  if (p.unlimited) return { entry: null, quality: "NO_MATCH" };
  const shorter = live.map((e) => ({ e, k: parseKey(e.key) }))
    .filter(({ k }) => !k.unlimited && k.gb === p.gb && k.days < p.days)
    .sort((a, b) => b.k.days - a.k.days)[0];
  return shorter ? { entry: shorter.e, quality: "SHORTER_VALIDITY" } : { entry: null, quality: "NO_MATCH" };
}

export function compareWithCompetitor(input: { price: number | null; cost: number | null; minMargin: number; entry: CompetitorPrice | null }) {
  const { price, cost, entry } = input;
  if (!entry || price == null || entry.currency.toUpperCase() !== "EUR") {
    return { indicator: "NO_DATA" as AiraloIndicator, diff: null, diffPct: null, fxRequired: !!entry && entry.currency.toUpperCase() !== "EUR" };
  }
  const diff = round2(price - entry.price);
  const diffPct = round2((diff / entry.price) * 100);
  const margin = cost != null && price > 0 ? ((price - cost) / price) * 100 : null;
  const healthy = margin == null || margin >= input.minMargin;
  const indicator: AiraloIndicator = diffPct > CLOSE_BAND_PCT ? "EXPENSIVE" : diffPct < -CLOSE_BAND_PCT ? (healthy ? "CHEAPER" : "CHEAPER_LOW_MARGIN") : "CLOSE";
  return { indicator, diff, diffPct, fxRequired: false };
}

// ---------- import planning ----------

export type ResearchFile = {
  competitor: string; sourceType: string; sourceDescription: string; checkedAt: string;
  rows: { line: number; countryName: string; iso: string | null; type: string; dataGb: number | null; validityDays: number; price: number; currency: string }[];
};

export type ImportPlan = {
  summary: { rows: number; countries: number; standard: number; unlimited: number; newRecords: number; updated: number; unchanged: number; duplicates: number; invalid: number; countryMatchRequired: number };
  entries: Omit<CompetitorPrice, "id">[];
  invalid: { line: number; error: string }[];
  countryMatchRequired: { line: number; countryName: string }[];
};

/** Validates rows, rejects malformed/duplicate/unmatched ones, and diffs against existing observations. */
export function planResearchImport(file: ResearchFile, existing: CompetitorPrice[], catalogueIsos: Set<string>, importedAt: string): ImportPlan {
  const invalid: ImportPlan["invalid"] = [];
  const countryMatchRequired: ImportPlan["countryMatchRequired"] = [];
  const seen = new Set<string>();
  const entries: ImportPlan["entries"] = [];
  let duplicates = 0, newRecords = 0, updated = 0, unchanged = 0;
  const comp = file.competitor.toLowerCase();
  const prior = new Map(existing.filter((e) => e.competitor.toLowerCase() === comp).map((e) => [`${e.iso}|${e.key}`, e]));
  for (const r of file.rows) {
    const t = String(r.type).toUpperCase();
    const unlimited = t === "UNLIMITED";
    if (!unlimited && t !== "STANDARD") { invalid.push({ line: r.line, error: "Paket türü geçersiz" }); continue; }
    if (!r.iso || !/^[A-Z]{2}$/.test(r.iso) || !catalogueIsos.has(r.iso)) { countryMatchRequired.push({ line: r.line, countryName: r.countryName }); continue; }
    if (!unlimited && !(typeof r.dataGb === "number" && r.dataGb > 0 && r.dataGb <= 1000)) { invalid.push({ line: r.line, error: "Veri miktarı eksik/geçersiz" }); continue; }
    if (unlimited && r.dataGb != null) { invalid.push({ line: r.line, error: "Sınırsız pakette veri miktarı olmamalı" }); continue; }
    if (!Number.isInteger(r.validityDays) || r.validityDays <= 0 || r.validityDays > 400) { invalid.push({ line: r.line, error: "Geçerlilik günü geçersiz" }); continue; }
    if (!(typeof r.price === "number" && r.price > 0 && r.price < 10000)) { invalid.push({ line: r.line, error: "Fiyat eksik/geçersiz" }); continue; }
    if (!/^[A-Z]{3}$/.test(String(r.currency))) { invalid.push({ line: r.line, error: "Para birimi geçersiz" }); continue; }
    const key = packageKey({ unlimited, dataGb: r.dataGb, validityDays: r.validityDays });
    const sig = `${r.iso}|${key}`;
    if (seen.has(sig)) { duplicates++; continue; }
    seen.add(sig);
    const before = prior.get(sig);
    const price = round2(r.price);
    if (!before) newRecords++;
    else if (before.price !== price || before.currency !== r.currency || before.checkedAt !== file.checkedAt) updated++;
    else unchanged++;
    entries.push({
      competitor: file.competitor, iso: r.iso, key, price, currency: r.currency, source: file.sourceDescription,
      checkedAt: file.checkedAt, countryName: r.countryName, sourceType: file.sourceType, importedAt, active: true,
    });
  }
  return {
    summary: {
      rows: file.rows.length, countries: new Set(file.rows.map((r) => r.countryName)).size,
      standard: file.rows.filter((r) => r.type.toUpperCase() === "STANDARD").length,
      unlimited: file.rows.filter((r) => r.type.toUpperCase() === "UNLIMITED").length,
      newRecords, updated, unchanged, duplicates, invalid: invalid.length, countryMatchRequired: countryMatchRequired.length,
    },
    entries, invalid, countryMatchRequired,
  };
}
