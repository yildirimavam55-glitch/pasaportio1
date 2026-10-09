import { describe, expect, it } from "vitest";
import { STOREFRONT_CURRENCIES, defaultCurrencyConfig, USD_PEGS } from "./currencies";
import { sanitizeCurrencySettings, toPublicCurrencyConfig } from "./settings";

describe("storefront currencies", () => {
  it("offers exactly the 24 requested currencies", () => {
    expect([...STOREFRONT_CURRENCIES].sort()).toEqual("EUR USD GBP TRY CHF CAD AUD NZD JPY CNY HKD SGD PLN CZK SEK NOK DKK HUF AED SAR QAR ZAR MXN THB".split(" ").sort());
  });
  it("only EUR is a charge currency by default", () => {
    expect(STOREFRONT_CURRENCIES.filter((c) => defaultCurrencyConfig(c).checkout)).toEqual(["EUR"]);
  });
  it("never shows a currency without a rate (no silent 1:1)", () => {
    const pub = toPublicCurrencyConfig(sanitizeCurrencySettings({ rates: { USD: { rate: 1.12 } } }), null);
    expect(pub.currencies.map((c) => c.code)).toEqual(["EUR", "USD"]);
  });
  it("derives QAR from its USD peg", () => { expect(USD_PEGS.QAR).toBe(3.64); });
});
