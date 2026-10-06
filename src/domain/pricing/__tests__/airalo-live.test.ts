import { describe, expect, it } from "vitest";
import { applyLiveCheck, extractAiraloPackages, missingAiraloLabel, normalizeCountry, planLiveCheck, type CountryCheck } from "../airalo-live";
import type { CompetitorPrice } from "../competitive";

const pkg = (id: number, title: string, unl: boolean, mb: number, day: number, amount: string, cur = "EUR", voice: unknown = null) => ({ id, title, unl, mb, day, amount, cur, voice });
function page(list: ReturnType<typeof pkg>[]) {
  const raw: unknown[] = [["ShallowReactive", 1], {}];
  for (const p of list) {
    const i = raw.length;
    raw.push({ id: i + 1, price: i + 2, title: i + 3, day: i + 4, is_unlimited: i + 5, amount: i + 6, voice: i + 7, text: i + 8 });
    raw.push(p.id, { amount: i + 9, currency: i + 10 }, p.title, p.day, p.unl, p.mb, p.voice, null, p.amount, { code: i + 11 }, p.cur);
  }
  return `<html><script type="application/json" id="__NUXT_DATA__">${JSON.stringify(raw)}</script></html>`;
}
const SRC = "https://www.airalo.com/germany-esim";
const entry = (key: string, price: number, currency = "EUR"): CompetitorPrice => ({ id: key, competitor: "Airalo", iso: "DE", key, price, currency, source: "x", checkedAt: "2026-10-06" });

describe("Airalo public retail check", () => {
  it("parses packages and excludes call/text plans", () => {
    const html = page([pkg(1, "10 GB - 30 days", false, 10240, 30, "15.00"), pkg(2, "10 GB - 100 SMS - 100 Mins - 30 days", false, 10240, 30, "21.50"), pkg(3, "Unlimited - 7 days", true, 53248, 7, "22.00")]);
    expect(extractAiraloPackages(html)).toHaveLength(3);
    const c = normalizeCountry("DE", SRC, html, null);
    expect(c.status).toBe("OK");
    if (c.status === "OK") { expect(c.packages).toEqual([{ key: "10|30", price: 15 }, { key: "U|7", price: 22 }]); expect(c.excludedVoice).toBe(1); }
  });
  it("never converts non-EUR prices", () => {
    const c = normalizeCountry("DE", SRC, page([pkg(1, "5 GB - 30 days", false, 5120, 30, "12.00", "USD")]), null);
    expect(c.status === "OK" && c.packages.length === 0 && c.nonEur[0] === "5|30").toBe(true);
  });
  it("unrecognised page or HTTP error is RESEARCH_FAILED, not 'not offered'", () => {
    expect(normalizeCountry("DE", SRC, "<html>captcha</html>", null).status).toBe("RESEARCH_FAILED");
    expect(normalizeCountry("DE", SRC, null, "HTTP 403").status).toBe("RESEARCH_FAILED");
  });
  it("classifies new, changed, unchanged, possibly removed, not offered, shorter validity", () => {
    const checks: CountryCheck[] = [{ iso: "DE", status: "OK", source: SRC, excludedVoice: 0, nonEur: [], packages: [{ key: "10|30", price: 15 }, { key: "U|7", price: 22 }, { key: "3|7", price: 7.5 }] }];
    const { summary, coverage } = planLiveCheck(checks, [entry("10|30", 15), entry("U|7", 21.36), entry("50|30", 33)], { DE: ["10|30", "3|30", "2|15", "U|1"] });
    expect(summary).toMatchObject({ newRecords: 1, changed: 1, unchanged: 1, possiblyRemoved: 1, notOffered: 2 });
    expect(coverage.find((c) => c.key === "3|30")!.status).toBe("AIRALO_PRICE_VERIFIED");
    expect(coverage.find((c) => c.key === "2|15")!.status).toBe("AIRALO_NOT_OFFERED");
  });
  it("failed country keeps old prices; changes keep history; possibly-removed rows stay", () => {
    const old = [entry("10|30", 16.5), entry("50|30", 33)];
    const ok: CountryCheck = { iso: "DE", status: "OK", source: SRC, excludedVoice: 0, nonEur: [], packages: [{ key: "10|30", price: 20.5 }] };
    const r = applyLiveCheck([ok], old, {}, "2026-10-06T15:00:00Z", () => "n");
    const row = r.entries.find((e) => e.key === "10|30")!;
    expect(row.price).toBe(20.5);
    expect(row.priceHistory).toEqual([{ price: 16.5, currency: "EUR", checkedAt: "2026-10-06" }]);
    expect(r.entries.find((e) => e.key === "50|30")!.price).toBe(33);
    const f = applyLiveCheck([{ iso: "DE", status: "RESEARCH_FAILED", source: SRC, reason: "HTTP 403" }], r.entries, r.liveChecks, "2026-10-07T00:00:00Z", () => "n");
    expect(f.entries.find((e) => e.key === "10|30")!.price).toBe(20.5);
    expect(f.liveChecks["DE"]).toMatchObject({ status: "RESEARCH_FAILED", lastOkAt: "2026-10-06T15:00:00Z" });
    expect(missingAiraloLabel(f.liveChecks["DE"])).toBe("RESEARCH_FAILED");
    expect(missingAiraloLabel(undefined)).toBe("AIRALO_DATA_UNKNOWN");
  });
});
