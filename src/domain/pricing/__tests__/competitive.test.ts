import { describe, expect, it } from "vitest";
import { costAnomalies, evaluateCompetitive, median, parseCompetitorCsv, ageLabel, type CompetitorPrice } from "../competitive";

const now = new Date("2026-10-05T12:00:00Z");
const c = (price: number, extra: Partial<CompetitorPrice> = {}): CompetitorPrice => ({
  id: String(price), competitor: "X", iso: "TR", key: "10|30", price, currency: "EUR", source: "test", checkedAt: "2026-10-05", ...extra,
});

describe("competitive pricing", () => {
  it("uses the median market reference", () => {
    expect(median([15.99, 16.99, 14.99])).toBe(15.99);
    expect(median([10, 20])).toBe(15);
    expect(median([])).toBeNull();
  });

  it("classifies a healthy, cheaper price as competitive and suggests ~7% below market", () => {
    const r = evaluateCompetitive({ cost: 8.2, price: 14.99, minMargin: 25, competitors: [c(15.99), c(16.49), c(15.49)], rates: {}, now });
    expect(r.market).toBe(15.99);
    expect(r.status).toBe("COMPETITIVE");
    expect(r.diffPct).toBeCloseTo(-6.25, 1);
    expect(r.suggested).toBe(14.49);
  });

  it("flags low margin for review", () => {
    const r = evaluateCompetitive({ cost: 13.2, price: 15.99, minMargin: 25, competitors: [c(15.49)], rates: {}, now });
    expect(r.status).toBe("UNSUITABLE"); // cost ≥ 90% of market
    const r2 = evaluateCompetitive({ cost: 11, price: 13.49, minMargin: 25, competitors: [c(15.49)], rates: {}, now });
    expect(r2.status).toBe("REVIEW");
  });

  it("marks unsuitable when cost exceeds market and never suggests a loss", () => {
    const r = evaluateCompetitive({ cost: 18.5, price: 24.99, minMargin: 25, competitors: [c(15.99)], rates: {}, now });
    expect(r.status).toBe("UNSUITABLE");
    expect(r.suggested).toBeNull();
  });

  it("reports missing and stale competitor data without inventing values", () => {
    expect(evaluateCompetitive({ cost: 5, price: 9.99, minMargin: 25, competitors: [], rates: {}, now }).status).toBe("NO_DATA");
    const stale = evaluateCompetitive({ cost: 5, price: 9.99, minMargin: 25, competitors: [c(12, { checkedAt: "2026-07-01" })], rates: {}, now });
    expect(stale.status).toBe("REVIEW");
    expect(stale.market).toBeNull();
    expect(stale.reasons).toContain("Rakip fiyatını tekrar kontrol et");
  });

  it("does not compare foreign currency without an approved rate", () => {
    const r = evaluateCompetitive({ cost: 5, price: 9.99, minMargin: 25, competitors: [c(12, { currency: "USD" })], rates: {}, now });
    expect(r.fxMissing).toBe(true);
    expect(r.market).toBeNull();
    const r2 = evaluateCompetitive({ cost: 5, price: 9.99, minMargin: 25, competitors: [c(12, { currency: "USD" })], rates: { USD: 0.9 }, now });
    expect(r2.market).toBe(10.8);
  });

  it("marks expensive supplier variants", () => {
    expect(costAnomalies([8, 41, 8.5]).anomalous).toEqual([false, true, false]);
    expect(evaluateCompetitive({ cost: 41, price: 59.99, minMargin: 25, competitors: [c(15.99)], rates: {}, now, costAnomaly: true }).status).toBe("UNSUITABLE");
  });

  it("parses CSV and rejects invalid rows", () => {
    const rows = parseCompetitorCsv("competitor,country,type,data,validity,price,currency,source,checked\nAiralo,TR,STANDARD,10,30,15.99,EUR,airalo.com,05.10.2026\nAiralo,TUR,STANDARD,10,30,15.99,EUR,x,2026-10-05\nB,TR,UNLIMITED,,7,19,USD,x,2026-10-01", now);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({ ok: true, entry: { key: "10|30", checkedAt: "2026-10-05" } });
    expect(rows[1]!.ok).toBe(false);
    expect(rows[2]).toMatchObject({ ok: true, entry: { key: "U|7", currency: "USD" } });
    expect(ageLabel("2026-09-30", now)).toBe("5 gün önce kontrol edildi");
  });
});
