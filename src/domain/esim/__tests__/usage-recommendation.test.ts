import { describe, expect, it } from "vitest";
import { DEFAULT_USAGE_SETTINGS, recommendUsage, sanitizeUsageSettings } from "../usage-recommendation";

describe("eSIM usage recommendation", () => {
  it("separates estimate, safety-adjusted and recommended package", () => {
    const result = recommendUsage({ days: 10, usage: ["MESSAGING", "SOCIAL", "MAPS"] }, DEFAULT_USAGE_SETTINGS);
    expect(result.estimatedGb).toBeGreaterThan(0);
    expect(result.safetyAdjustedGb).toBeGreaterThanOrEqual(result.estimatedGb);
    expect(DEFAULT_USAGE_SETTINGS.packageSizesGb).toContain(result.recommendedGb);
    expect(result.recommendedGb).toBeGreaterThanOrEqual(result.safetyAdjustedGb);
  });

  it("never recommends below the configured minimum", () => {
    const result = recommendUsage({ days: 1, usage: [] }, { ...DEFAULT_USAGE_SETTINGS, minimumRecommendedGb: 3 });
    expect(result.recommendedGb).toBeGreaterThanOrEqual(3);
  });

  it("falls back to safe defaults for invalid configuration", () => {
    const settings = sanitizeUsageSettings({ perDayMb: { VIDEO: -50 }, safetyBufferPercent: 900, packageSizesGb: ["x"], intensityMultipliers: { NORMAL: 0 } });
    expect(settings.perDayMb.VIDEO).toBe(DEFAULT_USAGE_SETTINGS.perDayMb.VIDEO);
    expect(settings.safetyBufferPercent).toBe(DEFAULT_USAGE_SETTINGS.safetyBufferPercent);
    expect(settings.packageSizesGb).toEqual(DEFAULT_USAGE_SETTINGS.packageSizesGb);
    expect(settings.intensityMultipliers.NORMAL).toBe(1);
  });

  it("respects a configured safety buffer and package grid", () => {
    const result = recommendUsage({ days: 10, usage: ["VIDEO"] }, { ...DEFAULT_USAGE_SETTINGS, safetyBufferPercent: 50, packageSizesGb: [5, 20] });
    expect([5, 20]).toContain(result.recommendedGb);
  });
});
