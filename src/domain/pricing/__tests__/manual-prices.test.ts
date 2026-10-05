import { describe, expect, it } from "vitest";
import { packageKey, profitAndMargin, resolveManualPrice, sanitizeManualConfig } from "@/domain/pricing/manual-prices";

const key = packageKey({ unlimited: false, dataGb: 20, validityDays: 30 });
const cfg = sanitizeManualConfig({ global: { [key]: 24.99 }, countries: { TR: { [key]: 19.99 }, DE: { [key]: 22.99 }, JP: { [key]: 29.99 } } });

describe("manual price priority", () => {
  it("country beats global beats auto", () => {
    expect(resolveManualPrice(cfg, "TR", key, 15.99)).toMatchObject({ price: 19.99, source: "COUNTRY" });
    expect(resolveManualPrice(cfg, "DE", key, 15.99).price).toBe(22.99);
    expect(resolveManualPrice(cfg, "JP", key, 15.99).price).toBe(29.99);
    expect(resolveManualPrice(cfg, "FR", key, 15.99)).toMatchObject({ price: 24.99, source: "GLOBAL" });
    expect(resolveManualPrice(sanitizeManualConfig({}), "FR", key, 15.99)).toMatchObject({ price: 15.99, source: "AUTO" });
  });
  it("removing a country override falls back to global", () => {
    const removed = sanitizeManualConfig({ ...cfg, countries: {} });
    expect(resolveManualPrice(removed, "TR", key, 15.99).source).toBe("GLOBAL");
  });
  it("profit, margin and loss", () => {
    expect(profitAndMargin(19.99, 12.4)).toEqual({ profit: 7.59, margin: 38, loss: false });
    expect(profitAndMargin(19.99, 21.5).loss).toBe(true);
  });
  it("rejects invalid values", () => {
    expect(sanitizeManualConfig({ global: { bad: 1, "5|30": -2, "U|7": "x" } }).global).toEqual({});
  });
});
