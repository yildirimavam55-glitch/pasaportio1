import { describe, expect, it } from "vitest";
import data from "@/data/airalo-research-2026-10-05.json";
import { compareWithCompetitor, matchCompetitor, planResearchImport, type ResearchFile } from "../airalo";
import { evaluateCompetitive, type CompetitorPrice } from "../competitive";
import { profitAndMargin } from "../manual-prices";

const file = data as ResearchFile;
const e = (key: string, price: number, extra: Partial<CompetitorPrice> = {}): CompetitorPrice => ({ id: key, competitor: "Airalo", iso: "TR", key, price, currency: "EUR", source: "app", checkedAt: "2026-10-05", ...extra });
const isos = new Set(file.rows.map((r) => r.iso!));

describe("Airalo research import", () => {
  it("reads the whole file with real counts and maps every country by ISO", () => {
    const plan = planResearchImport(file, [], isos, "2026-10-05T19:00:00Z");
    expect(plan.summary).toMatchObject({ rows: 245, countries: 16, standard: 166, unlimited: 79, newRecords: 245, invalid: 0, duplicates: 0, countryMatchRequired: 0 });
    const names = new Intl.DisplayNames(["tr"], { type: "region" });
    for (const r of file.rows) if (!["BAE", "ABD"].includes(r.countryName)) expect(names.of(r.iso!)?.toLocaleLowerCase("tr")).toBe(r.countryName.toLocaleLowerCase("tr"));
    expect(plan.entries[0]).toMatchObject({ competitor: "Airalo", sourceType: "MANUAL_RESEARCH", checkedAt: "2026-10-05", source: "Airalo customer-facing retail price captured from Airalo app" });
  });

  it("flags unmatched countries, duplicates and updates instead of guessing", () => {
    const rows = [...file.rows.slice(0, 2), { ...file.rows[0]! }, { ...file.rows[1]!, iso: null }];
    const existing = [e("1|3", 3.5), e("3|3", 5.5)];
    const p = planResearchImport({ ...file, rows }, existing, isos, "x");
    expect(p.summary).toMatchObject({ newRecords: 0, updated: 1, unchanged: 1, duplicates: 1, countryMatchRequired: 1 });
    const p2 = planResearchImport({ ...file, rows: [{ ...file.rows[0]!, dataGb: null }] }, [], isos, "x");
    expect(p2.summary.invalid).toBe(1);
  });

  it("matches standard exactly or by shorter validity, never by different GB", () => {
    const list = [e("5|15", 9), e("5|7", 8.5), e("10|30", 14.5)];
    expect(matchCompetitor("10|30", list)).toMatchObject({ quality: "EXACT" });
    expect(matchCompetitor("5|30", list)).toMatchObject({ quality: "SHORTER_VALIDITY", entry: { key: "5|15" } });
    expect(matchCompetitor("20|30", list).quality).toBe("NO_MATCH");
  });

  it("matches unlimited only on identical duration", () => {
    const list = [e("U|7", 22), e("U|15", 30)];
    expect(matchCompetitor("U|7", list).quality).toBe("EXACT");
    expect(matchCompetitor("U|10", list).quality).toBe("NO_MATCH");
    expect(matchCompetitor("5|7", [e("U|7", 22)]).quality).toBe("NO_MATCH");
  });

  it("compares price, keeps negatives, and never fakes a market from one competitor", () => {
    const cheaper = compareWithCompetitor({ price: 14.99, cost: 8.2, minMargin: 25, entry: e("10|30", 15.99) });
    expect(cheaper).toMatchObject({ diff: -1, indicator: "CHEAPER" });
    expect(cheaper.diffPct).toBeCloseTo(-6.25, 1);
    expect(compareWithCompetitor({ price: 17.99, cost: 8.2, minMargin: 25, entry: e("10|30", 15.99) })).toMatchObject({ diff: 2, indicator: "EXPENSIVE" });
    expect(compareWithCompetitor({ price: 16.2, cost: 8, minMargin: 25, entry: e("10|30", 15.99) }).indicator).toBe("CLOSE");
    expect(compareWithCompetitor({ price: 10.99, cost: 8.75, minMargin: 25, entry: e("20|30", 20.5) }).indicator).toBe("CHEAPER_LOW_MARGIN");
    expect(compareWithCompetitor({ price: 9.99, cost: 5, minMargin: 25, entry: null }).indicator).toBe("NO_DATA");
    expect(compareWithCompetitor({ price: 9.99, cost: 5, minMargin: 25, entry: e("1|1", 10, { currency: "USD" }) }).fxRequired).toBe(true);
    const r = evaluateCompetitive({ cost: 8.2, price: 14.99, minMargin: 25, competitors: [e("10|30", 15.99)], rates: {} , now: new Date("2026-10-05T12:00:00Z")});
    expect(r.market).toBeNull();
    expect(r.suggested).toBeNull();
    expect(profitAndMargin(14.99, 8.2)).toMatchObject({ profit: 6.79 });
    expect(profitAndMargin(14.99, 8.2).margin).toBeCloseTo(45.3, 1);
  });
});

import data2 from "@/data/airalo-research-2026-10-05-video2.json";
describe("Airalo video 2", () => {
  it("imports 235 rows, flags Azores, and updates overlaps instead of duplicating", () => {
    const f2 = data2 as ResearchFile;
    const all = new Set([...f2.rows.map((r) => r.iso!), ...isos].filter((i) => /^[A-Z]{2}$/.test(i)));
    const first = planResearchImport(file, [], all, "x").entries.map((x, i) => ({ ...x, id: String(i) }));
    const p = planResearchImport(f2, first, all, "y");
    expect(p.summary).toMatchObject({ rows: 235, countries: 39, standard: 155, unlimited: 80, newRecords: 215, updated: 2, unchanged: 13, invalid: 0, duplicates: 0, countryMatchRequired: 5 });
  });
});
