/**
 * Airalo public retail check (Admin-only research). Pure, no IO.
 * One public country page per country per run → normalized data-only EUR
 * packages → local diff against stored observations. Never invents prices,
 * never deletes on absence, never touches Pasaport selling prices.
 */
import { packageKey } from "./manual-prices";
import { round2, type CompetitorPrice } from "./competitive";
import { matchCompetitor } from "./airalo";

/** First implementation scope: the five validated pilot countries. */
export const AIRALO_PILOT_COUNTRIES: Record<string, string> = {
  DE: "germany-esim", TR: "turkey-esim", GB: "united-kingdom-esim", US: "united-states-esim", JP: "japan-esim",
};
export const airaloPageUrl = (slug: string) => `https://www.airalo.com/${slug}`;

export type LivePackage = { id: string; title: string; unlimited: boolean; dataGb: number | null; days: number; price: number; currency: string; voiceOrText: boolean };
export type CountryCheck =
  | { iso: string; status: "OK"; source: string; packages: { key: string; price: number }[]; excludedVoice: number; nonEur: string[] }
  | { iso: string; status: "RESEARCH_FAILED"; source: string; reason: string };

const WRAPPERS = new Set(["ShallowReactive", "Reactive", "Ref", "ShallowRef", "EmptyRef"]);

/** Reads Airalo's own embedded page data (Nuxt payload). Returns null when the structure is not recognised. */
export function extractAiraloPackages(html: string): LivePackage[] | null {
  const m = html.match(/<script[^>]*id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) return null;
  let raw: unknown[];
  try { raw = JSON.parse(m[1] ?? ""); } catch { return null; }
  if (!Array.isArray(raw)) return null;
  const at = (i: unknown, depth = 0): any => {
    if (typeof i !== "number" || depth > 8) return undefined;
    const v = raw[i];
    if (Array.isArray(v) && typeof v[0] === "string" && WRAPPERS.has(v[0])) return at(v[1], depth + 1);
    return v;
  };
  const out = new Map<string, LivePackage>();
  for (const v of raw) {
    if (!v || typeof v !== "object" || Array.isArray(v)) continue;
    const o = v as any;
    if (!("price" in o && "day" in o && "is_unlimited" in o && "amount" in o && "title" in o)) continue;
    const price = at(o.price);
    if (!price || typeof price !== "object" || Array.isArray(price)) continue;
    const amount = Number(at(price.amount));
    const cur = at(price.currency);
    const code = cur && typeof cur === "object" ? String(at(cur.code) ?? "") : "";
    const id = String(at(o.id) ?? "");
    const title = String(at(o.title) ?? "");
    const days = Number(at(o.day));
    const unlimited = at(o.is_unlimited) === true;
    const mb = Number(at(o.amount));
    if (!id || !title || !Number.isInteger(days) || days <= 0 || !(amount > 0) || !/^[A-Z]{3}$/.test(code)) continue;
    if (!unlimited && !(mb > 0)) continue;
    const voiceOrText = at(o.voice) != null || at(o.text) != null || /\b(sms|mins?|calls?|voice|texts?)\b/i.test(title);
    out.set(id, { id, title, unlimited, dataGb: unlimited ? null : round2(mb / 1024), days, price: round2(amount), currency: code, voiceOrText });
  }
  return [...out.values()];
}

/** Normalizes one retrieved country page. Empty or unrecognised pages are RESEARCH_FAILED, never "not offered". */
export function normalizeCountry(iso: string, source: string, html: string | null, fetchError: string | null): CountryCheck {
  if (fetchError || html == null) return { iso, status: "RESEARCH_FAILED", source, reason: fetchError ?? "Sayfa alınamadı" };
  const pkgs = extractAiraloPackages(html);
  if (!pkgs || pkgs.length === 0) return { iso, status: "RESEARCH_FAILED", source, reason: "Sayfa yapısı tanınmadı" };
  const dataOnly = pkgs.filter((p) => !p.voiceOrText);
  const best = new Map<string, number>();
  const nonEur = new Set<string>();
  for (const p of dataOnly) {
    const key = packageKey({ unlimited: p.unlimited, dataGb: p.dataGb, validityDays: p.days });
    if (p.currency !== "EUR") { nonEur.add(key); continue; }
    best.set(key, Math.min(best.get(key) ?? Infinity, p.price));
  }
  if (best.size === 0 && nonEur.size === 0) return { iso, status: "RESEARCH_FAILED", source, reason: "Veri paketi bulunamadı" };
  return { iso, status: "OK", source, packages: [...best].map(([key, price]) => ({ key, price })), excludedVoice: pkgs.length - dataOnly.length, nonEur: [...nonEur] };
}

export type ChangeKind = "NEW" | "PRICE_CHANGED" | "UNCHANGED" | "POSSIBLY_REMOVED" | "CURRENCY_NOT_EUR";
export type LiveChange = { iso: string; key: string; kind: ChangeKind; previous: number | null; current: number | null };
export type LiveSummary = {
  countriesRequested: number; countriesRetrieved: number; dataOnly: number; excludedVoice: number;
  newRecords: number; changed: number; unchanged: number; possiblyRemoved: number; notOffered: number; unknown: number; failed: number; nonEur: number;
};

const isAiralo = (e: CompetitorPrice) => e.competitor.toLowerCase() === "airalo" && e.active !== false;

/** Diffs retrieved catalogues against stored Airalo rows; Pasaport keys classify NOT_OFFERED vs UNKNOWN. */
export function planLiveCheck(checks: CountryCheck[], existing: CompetitorPrice[], pasaportKeys: Record<string, string[]>) {
  const changes: LiveChange[] = [];
  const s: LiveSummary = { countriesRequested: checks.length, countriesRetrieved: 0, dataOnly: 0, excludedVoice: 0, newRecords: 0, changed: 0, unchanged: 0, possiblyRemoved: 0, notOffered: 0, unknown: 0, failed: 0, nonEur: 0 };
  const coverage: { iso: string; key: string; status: "AIRALO_PRICE_VERIFIED" | "AIRALO_NOT_OFFERED" | "AIRALO_DATA_UNKNOWN" | "RESEARCH_FAILED" | "CURRENCY_NOT_EUR" }[] = [];
  for (const c of checks) {
    const prior = new Map(existing.filter((e) => isAiralo(e) && e.iso === c.iso).map((e) => [e.key, e]));
    const keys = pasaportKeys[c.iso] ?? [];
    if (c.status !== "OK") {
      s.failed++;
      for (const key of keys) coverage.push({ iso: c.iso, key, status: "RESEARCH_FAILED" });
      continue;
    }
    s.countriesRetrieved++;
    s.dataOnly += c.packages.length + c.nonEur.length;
    s.excludedVoice += c.excludedVoice;
    const live = new Map(c.packages.map((p) => [p.key, p.price]));
    for (const p of c.packages) {
      const before = prior.get(p.key);
      const kind: ChangeKind = !before ? "NEW" : before.currency === "EUR" && Math.abs(before.price - p.price) < 0.005 ? "UNCHANGED" : "PRICE_CHANGED";
      if (kind === "NEW") s.newRecords++; else if (kind === "UNCHANGED") s.unchanged++; else s.changed++;
      changes.push({ iso: c.iso, key: p.key, kind, previous: before ? before.price : null, current: p.price });
    }
    for (const key of c.nonEur) { s.nonEur++; changes.push({ iso: c.iso, key, kind: "CURRENCY_NOT_EUR", previous: prior.get(key)?.price ?? null, current: null }); }
    for (const [key, before] of prior) {
      if (live.has(key) || c.nonEur.includes(key)) continue;
      s.possiblyRemoved++;
      changes.push({ iso: c.iso, key, kind: "POSSIBLY_REMOVED", previous: before.price, current: null });
    }
    const liveEntries = c.packages.map((p) => ({ id: p.key, competitor: "Airalo", iso: c.iso, key: p.key, price: p.price, currency: "EUR", source: c.source, checkedAt: "" }));
    for (const key of keys) {
      if (matchCompetitor(key, liveEntries).entry) coverage.push({ iso: c.iso, key, status: "AIRALO_PRICE_VERIFIED" });
      else if (matchCompetitor(key, c.nonEur.map((k) => ({ id: k, competitor: "Airalo", iso: c.iso, key: k, price: 1, currency: "XXX", source: "", checkedAt: "" }))).entry) coverage.push({ iso: c.iso, key, status: "CURRENCY_NOT_EUR" });
      else { s.notOffered++; coverage.push({ iso: c.iso, key, status: "AIRALO_NOT_OFFERED" }); }
    }
  }
  return { summary: s, changes, coverage };
}

export type LiveCheckRecord = { at: string; status: "OK" | "RESEARCH_FAILED"; reason?: string; lastOkAt?: string; offered?: string[] };

/**
 * Applies a confirmed check: upserts verified EUR rows (price history kept on change),
 * leaves possibly-removed and failed-country rows untouched, records per-country check state.
 */
export function applyLiveCheck(checks: CountryCheck[], existing: CompetitorPrice[], prevChecks: Record<string, LiveCheckRecord>, now: string, newId: () => string) {
  const day = now.slice(0, 10);
  const entries = [...existing];
  const liveChecks = { ...prevChecks };
  for (const c of checks) {
    if (c.status !== "OK") {
      liveChecks[c.iso] = { ...prevChecks[c.iso], at: now, status: "RESEARCH_FAILED", reason: c.reason };
      continue;
    }
    for (const p of c.packages) {
      const idx = entries.findIndex((e) => isAiralo(e) && e.iso === c.iso && e.key === p.key);
      const before = idx >= 0 ? entries[idx] : null;
      const changed = !before || before.currency !== "EUR" || Math.abs(before.price - p.price) >= 0.005;
      const history = [...(before?.priceHistory ?? []), ...(before && changed ? [{ price: before.price, currency: before.currency, checkedAt: before.checkedAt }] : [])].slice(-20);
      const next: CompetitorPrice = {
        ...(before ?? {}), id: before?.id ?? newId(), competitor: "Airalo", iso: c.iso, key: p.key, price: p.price, currency: "EUR",
        source: c.source, checkedAt: day, sourceType: "PUBLIC_RETAIL", verifiedAt: now, active: true,
        ...(history.length ? { priceHistory: history } : {}),
      };
      if (idx >= 0) entries[idx] = next; else entries.push(next);
    }
    liveChecks[c.iso] = { at: now, status: "OK", lastOkAt: now, offered: c.packages.map((p) => p.key) };
  }
  return { entries, liveChecks };
}

/** Admin label for a Pasaport package without a comparable Airalo price. */
export function missingAiraloLabel(check: LiveCheckRecord | undefined): "AIRALO_NOT_OFFERED" | "AIRALO_DATA_UNKNOWN" | "RESEARCH_FAILED" {
  if (!check) return "AIRALO_DATA_UNKNOWN";
  return check.status === "OK" ? "AIRALO_NOT_OFFERED" : "RESEARCH_FAILED";
}
