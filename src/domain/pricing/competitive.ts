/**
 * Competitive pricing intelligence. Pure, no IO.
 * Only calculates, classifies and suggests — it never changes a selling price.
 * Competitors are matched only on exact country + package structure key (data/unlimited + validity).
 */
import { packageKey } from "./manual-prices";

export type CompetitorPrice = {
  id: string;
  competitor: string;
  iso: string;
  key: string;
  price: number;
  currency: string;
  source: string;
  checkedAt: string; // YYYY-MM-DD
};

export type CompetitivePolicy = {
  /** Market target = market reference × factor (0.93 ≈ 7% below). */
  targetFactor: number;
  /** Competitor prices older than this are stale. */
  staleDays: number;
  /** Travely may be this % above market and still count as competitive. */
  tolerancePct: number;
  /** Supplier cost at/above this share of market → not suitable for sale. */
  unsuitableCostRatio: number;
  /** A variant costing more than this multiple of the cheapest equivalent is uncompetitive. */
  anomalyCostMultiple: number;
};

export const DEFAULT_POLICY: CompetitivePolicy = {
  targetFactor: 0.93, staleDays: 30, tolerancePct: 2, unsuitableCostRatio: 0.9, anomalyCostMultiple: 2,
};

export const DEFAULT_COMPETITORS = ["Airalo", "Rakip B", "Rakip C", "Rakip D"];

export type CompetitiveStatus = "COMPETITIVE" | "REVIEW" | "UNSUITABLE" | "NO_DATA";

/** EUR value of one unit of each currency, from the approved exchange-rate table. */
export type EurRates = Record<string, number>;

export const round2 = (v: number) => Math.round(v * 100) / 100;
/** Largest x.49 / x.99 not above value. */
export const roundDownPsych = (v: number) => round2(Math.floor((v + 0.01) * 2 + 1e-9) / 2 - 0.01);
/** Smallest x.49 / x.99 not below value. */
export const roundUpPsych = (v: number) => round2(Math.ceil((v + 0.01) * 2 - 1e-9) / 2 - 0.01);

export function median(values: number[]): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : round2((s[m - 1]! + s[m]!) / 2);
}

export function toEur(price: number, currency: string, rates: EurRates): number | null {
  const c = currency.toUpperCase();
  if (c === "EUR") return price;
  const r = rates[c];
  return r && Number.isFinite(r) && r > 0 ? round2(price * r) : null;
}

export function ageDays(checkedAt: string, now = new Date()): number {
  const t = Date.parse(`${checkedAt}T00:00:00Z`);
  if (!Number.isFinite(t)) return Infinity;
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.max(0, Math.floor((today - t) / 86_400_000));
}

export function ageLabel(checkedAt: string, now = new Date()) {
  const d = ageDays(checkedAt, now);
  if (!Number.isFinite(d)) return "Tarih yok";
  return d === 0 ? "Bugün kontrol edildi" : d === 1 ? "Dün kontrol edildi" : `${d} gün önce kontrol edildi`;
}

export type EvaluatedCompetitor = CompetitorPrice & { eur: number | null; stale: boolean; usable: boolean };

export type CompetitiveResult = {
  status: CompetitiveStatus;
  reasons: string[];
  competitors: EvaluatedCompetitor[];
  market: number | null;
  diffPct: number | null;
  floor: number | null;
  suggested: number | null;
  stale: boolean;
  fxMissing: boolean;
};

export function evaluateCompetitive(input: {
  cost: number | null;
  price: number | null;
  minMargin: number;
  competitors: CompetitorPrice[];
  rates: EurRates;
  policy?: CompetitivePolicy | undefined;
  now?: Date;
  /** True when a cheaper equivalent supplier variant exists for this structure. */
  costAnomaly?: boolean;
}): CompetitiveResult {
  const policy = input.policy ?? DEFAULT_POLICY;
  const now = input.now ?? new Date();
  const competitors = input.competitors.map((c) => {
    const eur = toEur(c.price, c.currency, input.rates);
    const stale = ageDays(c.checkedAt, now) > policy.staleDays;
    return { ...c, eur, stale, usable: eur != null && !stale };
  });
  const usable = competitors.filter((c) => c.usable).map((c) => c.eur!);
  const stale = competitors.some((c) => c.stale);
  const fxMissing = competitors.some((c) => c.eur == null);
  const market = median(usable);
  const reasons: string[] = [];
  const minMargin = Math.min(Math.max(input.minMargin, 0), 95);
  const floor = input.cost != null && input.cost > 0 ? roundUpPsych(input.cost / (1 - minMargin / 100)) : null;
  const diffPct = market != null && input.price != null ? round2(((input.price - market) / market) * 100) : null;

  if (input.costAnomaly) reasons.push("Daha ucuz eşdeğer tedarikçi varyantı var");
  if (!competitors.length) {
    return { status: input.costAnomaly ? "UNSUITABLE" : "NO_DATA", reasons, competitors, market: null, diffPct: null, floor, suggested: null, stale, fxMissing };
  }
  if (stale) reasons.push("Rakip fiyatını tekrar kontrol et");
  if (fxMissing) reasons.push("Kur yok — karşılaştırılamadı");
  if (market == null) {
    return { status: input.costAnomaly ? "UNSUITABLE" : "REVIEW", reasons, competitors, market, diffPct, floor, suggested: null, stale, fxMissing };
  }

  let suggested: number | null = null;
  if (floor != null) {
    const target = roundDownPsych(market * policy.targetFactor);
    if (target >= floor) suggested = target;
    else if (floor <= market) suggested = floor;
  }
  const costTooHigh = input.cost != null && input.cost >= market * policy.unsuitableCostRatio;
  if (input.costAnomaly || costTooHigh || (floor != null && floor > market)) {
    if (costTooHigh || (floor != null && floor > market)) reasons.push("Güvenli rekabetçi fiyat mümkün değil");
    return { status: "UNSUITABLE", reasons, competitors, market, diffPct, floor, suggested: null, stale, fxMissing };
  }

  const margin = input.price != null && input.cost != null && input.price > 0 ? ((input.price - input.cost) / input.price) * 100 : null;
  if (input.price == null) reasons.push("Satış fiyatı yok");
  if (margin != null && margin < minMargin) reasons.push("Düşük marj");
  if (diffPct != null && diffPct > policy.tolerancePct) reasons.push("Pazardan pahalı");
  if (input.cost == null) reasons.push("Maliyet yok");
  const review = input.price == null || input.cost == null || (margin != null && margin < minMargin) || (diffPct != null && diffPct > policy.tolerancePct) || stale || fxMissing;
  return { status: review ? "REVIEW" : "COMPETITIVE", reasons, competitors, market, diffPct, floor, suggested, stale, fxMissing };
}

/** Marks supplier variants whose cost is far above the cheapest equivalent variant. */
export function costAnomalies(costs: (number | null)[], multiple = DEFAULT_POLICY.anomalyCostMultiple) {
  const valid = costs.filter((c): c is number => c != null && c > 0);
  const min = valid.length ? Math.min(...valid) : null;
  return { cheapest: min, anomalous: costs.map((c) => min != null && c != null && c > min * multiple) };
}

// ---------- CSV import ----------

export type ImportRow = { line: number; ok: true; entry: Omit<CompetitorPrice, "id"> } | { line: number; ok: false; error: string; raw: string };

const parseDate = (v: string) => {
  const s = v.trim();
  let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = /^(\d{1,2})[./](\d{1,2})[./](\d{4})$/.exec(s);
  if (m) return `${m[3]}-${m[2]!.padStart(2, "0")}-${m[1]!.padStart(2, "0")}`;
  return null;
};
const num = (v: string) => { const n = Number(v.trim().replace(/[€$£\s]/g, "").replace(",", ".")); return Number.isFinite(n) ? n : null; };
const splitLine = (line: string) => {
  const sep = line.includes(";") && !line.includes(",") ? ";" : line.includes("\t") ? "\t" : line.includes(";") ? ";" : ",";
  return line.split(sep).map((c) => c.trim().replace(/^"|"$/g, ""));
};

/**
 * Columns: competitor, country (ISO2), type (STANDARD|UNLIMITED), data GB, validity days, price, currency, source, checked date.
 * A header row is optional. Invalid rows are rejected with a reason, never coerced.
 */
export function parseCompetitorCsv(text: string, now = new Date()): ImportRow[] {
  const out: ImportRow[] = [];
  const lines = text.split(/\r?\n/);
  lines.forEach((raw, i) => {
    if (!raw.trim()) return;
    const c = splitLine(raw);
    if (i === 0 && /competitor|rakip/i.test(c[0] ?? "")) return;
    const fail = (error: string): void => { out.push({ line: i + 1, ok: false, error, raw }); };
    if (c.length < 9) return fail("9 sütun gerekli");
    const [competitor, country, type, data, validity, price, currency, source, checked] = c as string[];
    if (!competitor || competitor.length > 60) return fail("Rakip adı geçersiz");
    const iso = country!.toUpperCase();
    if (!/^[A-Z]{2}$/.test(iso)) return fail("Ülke ISO kodu geçersiz");
    const t = type!.toUpperCase();
    const unlimited = /^(UNLIMITED|SINIRSIZ|U)$/.test(t);
    if (!unlimited && !/^(STANDARD|STANDART|S)$/.test(t)) return fail("Paket türü STANDARD veya UNLIMITED olmalı");
    const gb = unlimited ? null : num(data!);
    if (!unlimited && (gb == null || gb <= 0 || gb > 1000)) return fail("Veri miktarı geçersiz");
    const days = num(validity!);
    if (days == null || !Number.isInteger(days) || days <= 0 || days > 400) return fail("Geçerlilik günü geçersiz");
    const p = num(price!);
    if (p == null || p <= 0 || p >= 10000) return fail("Fiyat geçersiz");
    const cur = currency!.toUpperCase();
    if (!/^[A-Z]{3}$/.test(cur)) return fail("Para birimi geçersiz");
    const checkedAt = parseDate(checked!);
    if (!checkedAt) return fail("Kontrol tarihi geçersiz");
    if (Date.parse(`${checkedAt}T00:00:00Z`) > now.getTime() + 86_400_000) return fail("Kontrol tarihi gelecekte");
    out.push({ line: i + 1, ok: true, entry: {
      competitor: competitor.slice(0, 60), iso, key: packageKey({ unlimited, dataGb: gb, validityDays: days }),
      price: round2(p), currency: cur, source: (source ?? "").slice(0, 300), checkedAt,
    } });
  });
  return out;
}
