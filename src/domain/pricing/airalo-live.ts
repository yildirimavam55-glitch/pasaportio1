/**
 * Airalo public retail check (Admin-only research). Pure, no IO.
 * One public country page per country per run → normalized data-only EUR
 * packages → local diff against stored observations. Never invents prices,
 * never deletes on absence, never touches Pasaport selling prices.
 */
import { packageKey } from "./manual-prices";
import { round2, type CompetitorPrice } from "./competitive";
import { compareWithCompetitor, matchCompetitor, type AiraloIndicator, type MatchQuality } from "./airalo";

/** First implementation scope: the five validated pilot countries. */
export const AIRALO_PILOT_COUNTRIES: Record<string, string> = {
  DE: "germany-esim", TR: "turkey-esim", GB: "united-kingdom-esim", US: "united-states-esim", JP: "japan-esim",
};
export const airaloPageUrl = (slug: string) => `https://www.airalo.com/${slug}`;

export type LivePackage = { id: string; title: string; unlimited: boolean; dataGb: number | null; days: number; price: number; currency: string; voiceOrText: boolean; promo: boolean };
export type LiveOffer = { key: string; price: number; offers?: number; alternatives?: number[]; promo?: boolean };
export type CountryCheck =
  | { iso: string; status: "OK"; source: string; packages: LiveOffer[]; excludedVoice: number; nonEur: string[] }
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
    const promos = at(o.promotions);
    const promo = Array.isArray(promos) && promos.length > 0;
    out.set(id, { id, title, unlimited, dataGb: unlimited ? null : round2(mb / 1024), days, price: round2(amount), currency: code, voiceOrText, promo });
  }
  return [...out.values()];
}

/** Normalizes one retrieved country page. Empty or unrecognised pages are RESEARCH_FAILED, never "not offered". */
export function normalizeCountry(iso: string, source: string, html: string | null, fetchError: string | null): CountryCheck {
  if (fetchError || html == null) return { iso, status: "RESEARCH_FAILED", source, reason: fetchError ?? "Sayfa alınamadı" };
  const pkgs = extractAiraloPackages(html);
  if (!pkgs || pkgs.length === 0) return { iso, status: "RESEARCH_FAILED", source, reason: "Sayfa yapısı tanınmadı" };
  const dataOnly = pkgs.filter((p) => !p.voiceOrText);
  const byKey = new Map<string, { price: number; promo: boolean }[]>();
  const nonEur = new Set<string>();
  for (const p of dataOnly) {
    const key = packageKey({ unlimited: p.unlimited, dataGb: p.dataGb, validityDays: p.days });
    if (p.currency !== "EUR") { nonEur.add(key); continue; }
    (byKey.get(key) ?? byKey.set(key, []).get(key)!).push({ price: p.price, promo: p.promo });
  }
  const best = new Map<string, LiveOffer>();
  for (const [key, list] of byKey) {
    const sorted = [...list].sort((a, b) => a.price - b.price);
    const top = sorted[0]!;
    best.set(key, { key, price: top.price, ...(sorted.length > 1 ? { offers: sorted.length, alternatives: sorted.slice(1, 11).map((o) => o.price) } : {}), ...(top.promo ? { promo: true } : {}) });
  }
  if (best.size === 0 && nonEur.size === 0) return { iso, status: "RESEARCH_FAILED", source, reason: "Veri paketi bulunamadı" };
  return { iso, status: "OK", source, packages: [...best.values()], excludedVoice: pkgs.length - dataOnly.length, nonEur: [...nonEur] };
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
      delete next.possiblyRemoved; delete next.offers; delete next.alternatives; delete next.promotional;
      if (p.offers) { next.offers = p.offers; next.alternatives = p.alternatives ?? []; }
      if (p.promo) next.promotional = true;
      if (idx >= 0) entries[idx] = next; else entries.push(next);
    }
    const seen = new Set([...c.packages.map((p) => p.key), ...c.nonEur]);
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i]!;
      if (!isAiralo(e) || e.iso !== c.iso || seen.has(e.key)) continue;
      // One absence is never a deletion: keep the row and its history, mark it as not currently seen.
      entries[i] = { ...e, possiblyRemoved: { since: e.possiblyRemoved?.since ?? now, lastCheckedAt: now, checks: (e.possiblyRemoved?.checks ?? 0) + 1 } };
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

// ---------- Full-catalogue comparison (Admin preview only; never writes prices) ----------

export type BaseRow = { iso: string; key: string; cost: number | null; price: number | null; minMargin: number };
export type CompareStatus = AiraloIndicator | "NOT_OFFERED" | "UNKNOWN" | "RESEARCH_FAILED";
export type CompareItem = {
  iso: string; key: string; cost: number | null; price: number | null; airalo: number | null; airaloKey: string | null; quality: MatchQuality;
  previousAiralo: number | null; diff: number | null; diffPct: number | null; profit: number | null; margin: number | null; lowMargin: boolean; status: CompareStatus;
};
export type CountryRow = {
  iso: string; retrieval: "COMPLETE" | "PARTIAL" | "RESEARCH_FAILED" | "NOT_FOUND" | "COUNTRY_MATCH_REQUIRED" | "SPECIAL_DESTINATION_MAPPING_REQUIRED";
  packages: number; newRecords: number; changed: number; unchanged: number; notOffered: number; unknown: number; reason?: string;
};
export type RemovedItem = { iso: string; key: string; lastPrice: number; lastVerified: string; currentCheck: string; checks: number };
export type MappingItem = { iso: string; kind: "COUNTRY_MATCH_REQUIRED" | "SPECIAL_DESTINATION_MAPPING_REQUIRED"; packages: number };

/** Popular destinations used only to rank the action list. */
export const POPULAR_ISOS = new Set(["TR", "US", "GB", "DE", "FR", "IT", "ES", "GR", "JP", "TH", "AE", "NL", "CH", "AT", "PT", "CN", "KR", "EG", "SA", "MA", "CA", "MX", "ID", "VN", "SG"]);

export function compareFull(checks: CountryCheck[], base: BaseRow[], existing: CompetitorPrice[], extra: { notFound: string[]; matchRequired: string[]; special: string[]; checkedAt: string }) {
  const byIso = new Map<string, CountryCheck>();
  for (const c of checks) if (!byIso.has(c.iso)) byIso.set(c.iso, c); // one result per country, never double counted
  const uniq = [...byIso.values()];
  const mapping = new Set([...extra.matchRequired, ...extra.special]);
  const items: CompareItem[] = [];
  for (const b of base) {
    if (mapping.has(b.iso)) continue; // reported as mapping work, not as unknown competitor data
    const c = byIso.get(b.iso);
    const profit = b.price != null && b.cost != null ? round2(b.price - b.cost) : null;
    const margin = profit != null && b.price ? round2((profit / b.price) * 100) : null;
    const lowMargin = margin != null && margin < b.minMargin;
    const blank = { iso: b.iso, key: b.key, cost: b.cost, price: b.price, airalo: null, airaloKey: null, quality: "NO_MATCH" as MatchQuality, previousAiralo: null, diff: null, diffPct: null, profit, margin, lowMargin };
    if (!c) { items.push({ ...blank, status: "UNKNOWN" }); continue; }
    if (c.status !== "OK") { items.push({ ...blank, status: "RESEARCH_FAILED" }); continue; }
    const live = c.packages.map((p) => ({ id: p.key, competitor: "Airalo", iso: c.iso, key: p.key, price: p.price, currency: "EUR", source: c.source, checkedAt: "" }));
    const m = matchCompetitor(b.key, live);
    if (!m.entry) { items.push({ ...blank, status: c.nonEur.length ? "UNKNOWN" : "NOT_OFFERED" }); continue; }
    const prev = existing.find((e) => isAiralo(e) && e.iso === c.iso && e.key === m.entry!.key);
    const cmp = compareWithCompetitor({ price: b.price, cost: b.cost, minMargin: b.minMargin, entry: m.entry });
    items.push({ ...blank, airalo: m.entry.price, airaloKey: m.entry.key, quality: m.quality, previousAiralo: prev && prev.currency === "EUR" ? prev.price : null, diff: cmp.diff, diffPct: cmp.diffPct, status: cmp.indicator === "NO_DATA" ? "UNKNOWN" : cmp.indicator });
  }
  const comparable = items.filter((i) => i.airalo != null && i.diff != null);
  const count = (st: CompareStatus) => items.filter((i) => i.status === st).length;
  const changePct = (i: CompareItem) => (i.previousAiralo && i.airalo ? Math.abs((i.airalo - i.previousAiralo) / i.previousAiralo) * 100 : 0);
  const score = (i: CompareItem) => (i.status === "EXPENSIVE" ? 1000 : 0) + Math.max(0, i.diffPct ?? 0) * 3 + Math.max(0, i.diff ?? 0) * 2
    + (i.lowMargin ? 40 : 0) + (POPULAR_ISOS.has(i.iso) ? 30 : 0) + Math.min(20, (i.cost ?? 0) / 2) + Math.min(20, changePct(i));
  const actions = comparable.filter((i) => i.status === "EXPENSIVE" || i.lowMargin).sort((a, b) => score(b) - score(a)).slice(0, 60);
  const topExpensive = comparable.filter((i) => (i.diff ?? 0) > 0).sort((a, b) => (b.diffPct ?? 0) - (a.diffPct ?? 0)).slice(0, 30);
  const lowestMargin = comparable.filter((i) => i.margin != null).sort((a, b) => (a.margin ?? 0) - (b.margin ?? 0)).slice(0, 30);
  const lowMarginList = comparable.filter((i) => i.lowMargin).sort((a, b) => (a.margin ?? 0) - (b.margin ?? 0));
  const isos = [...new Set(base.map((b) => b.iso))];
  const plan = planLiveCheck(uniq, existing, Object.fromEntries(isos.map((iso) => [iso, base.filter((b) => b.iso === iso).map((b) => b.key)])));
  const removed: RemovedItem[] = plan.changes.filter((x) => x.kind === "POSSIBLY_REMOVED").map((x) => {
    const e = existing.find((y) => isAiralo(y) && y.iso === x.iso && y.key === x.key)!;
    return { iso: x.iso, key: x.key, lastPrice: e.price, lastVerified: e.verifiedAt ?? e.checkedAt, currentCheck: extra.checkedAt, checks: (e.possiblyRemoved?.checks ?? 0) + 1 };
  });
  const countries: CountryRow[] = uniq.map((c) => {
    const ch = plan.changes.filter((x) => x.iso === c.iso);
    const its = items.filter((i) => i.iso === c.iso);
    const n = (k: ChangeKind) => ch.filter((x) => x.kind === k).length;
    if (c.status !== "OK") return { iso: c.iso, retrieval: "RESEARCH_FAILED", packages: 0, newRecords: 0, changed: 0, unchanged: 0, notOffered: 0, unknown: 0, reason: c.reason };
    return { iso: c.iso, retrieval: c.nonEur.length > 0 ? "PARTIAL" : "COMPLETE", packages: c.packages.length + c.nonEur.length, newRecords: n("NEW"), changed: n("PRICE_CHANGED"), unchanged: n("UNCHANGED"),
      notOffered: its.filter((i) => i.status === "NOT_OFFERED").length, unknown: its.filter((i) => i.status === "UNKNOWN").length };
  });
  const pkgCount = (iso: string) => base.filter((b) => b.iso === iso).length;
  for (const iso of extra.notFound) countries.push({ iso, retrieval: "NOT_FOUND", packages: 0, newRecords: 0, changed: 0, unchanged: 0, notOffered: 0, unknown: items.filter((i) => i.iso === iso).length });
  const mappings: MappingItem[] = [
    ...extra.matchRequired.map((iso) => ({ iso, kind: "COUNTRY_MATCH_REQUIRED" as const, packages: pkgCount(iso) })),
    ...extra.special.map((iso) => ({ iso, kind: "SPECIAL_DESTINATION_MAPPING_REQUIRED" as const, packages: pkgCount(iso) })),
  ];
  for (const m of mappings) countries.push({ iso: m.iso, retrieval: m.kind, packages: 0, newRecords: 0, changed: 0, unchanged: 0, notOffered: 0, unknown: 0 });
  const okChecks = uniq.filter((c): c is Extract<CountryCheck, { status: "OK" }> => c.status === "OK");
  const eurVerified = okChecks.reduce((a, c) => a + c.packages.length, 0);
  const standard = okChecks.reduce((a, c) => a + c.packages.filter((p) => !p.key.startsWith("U|")).length, 0);
  const unknownByCountry = Object.entries(items.filter((i) => i.status === "UNKNOWN").reduce<Record<string, number>>((a, i) => ({ ...a, [i.iso]: (a[i.iso] ?? 0) + 1 }), {})).map(([iso, n]) => ({ iso, packages: n }));
  return {
    summary: { ...plan.summary, countriesNotFound: extra.notFound.length, countryMatchRequired: extra.matchRequired.length, specialMapping: extra.special.length,
      standard, unlimited: eurVerified - standard, eurVerified,
      comparable: comparable.length, cheaper: count("CHEAPER"), close: count("CLOSE"), expensive: count("EXPENSIVE"), cheaperLowMargin: count("CHEAPER_LOW_MARGIN"),
      notOfferedPkgs: count("NOT_OFFERED"), unknownPkgs: count("UNKNOWN"), researchFailedPkgs: count("RESEARCH_FAILED"),
      matchRequiredPkgs: mappings.filter((m) => m.kind === "COUNTRY_MATCH_REQUIRED").reduce((a, m) => a + m.packages, 0),
      specialMappingPkgs: mappings.filter((m) => m.kind === "SPECIAL_DESTINATION_MAPPING_REQUIRED").reduce((a, m) => a + m.packages, 0),
      lowMarginAll: lowMarginList.length },
    changes: plan.changes.filter((c) => c.kind !== "UNCHANGED"), countries, actions, topExpensive, lowestMargin, lowMarginList: lowMarginList.slice(0, 100),
    items, removed, mappings, unknownByCountry,
  };
}

/** Rebuilds last confirmed country catalogues from stored rows so the data-quality view works without a new Airalo request. */
export function storedChecks(entries: CompetitorPrice[], liveChecks: Record<string, LiveCheckRecord>): CountryCheck[] {
  return Object.entries(liveChecks).map(([iso, r]) => r.status === "OK"
    ? { iso, status: "OK" as const, source: "", excludedVoice: 0, nonEur: [], packages: entries.filter((e) => isAiralo(e) && e.iso === iso && !e.possiblyRemoved && e.currency === "EUR").map((e) => ({ key: e.key, price: e.price })) }
    : { iso, status: "RESEARCH_FAILED" as const, source: "", reason: r.reason ?? "RESEARCH_FAILED" });
}
