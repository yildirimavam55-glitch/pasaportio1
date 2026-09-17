import type { UsageIntensity, UsageKind } from "@/domain/experience/types";

/**
 * Layer 1 of the eSIM recommendation engine: CUSTOMER NEED ESTIMATION.
 *
 * This module never decides which product to sell. It only estimates how much
 * data the traveller is likely to need. Actual purchasable package sizes come
 * from the provider/internal catalogue (see `package-matching.ts`).
 */

export type EsimUsageSettings = {
  perDayMb: Record<UsageKind, number>;
  intensityMultipliers: Record<UsageIntensity, number>;
  safetyBufferPercent: number;
  /** Minimum need floor, so tiny trips still get a sensible requirement. */
  minimumRecommendedGb: number;
};

export const USAGE_KEYS: UsageKind[] = ["MESSAGING", "SOCIAL", "MAPS", "VIDEO", "WORK", "GAMING", "HOTSPOT"];

/** Safe defaults. Used until an administrator stores a valid configuration. */
export const DEFAULT_USAGE_SETTINGS: EsimUsageSettings = {
  perDayMb: { MESSAGING: 50, SOCIAL: 250, MAPS: 80, VIDEO: 900, WORK: 300, GAMING: 200, HOTSPOT: 500 },
  intensityMultipliers: { LOW: 0.7, NORMAL: 1, HIGH: 1.4 },
  safetyBufferPercent: 20,
  minimumRecommendedGb: 1,
};

export const SETTINGS_LIMITS = {
  perDayMb: { min: 0, max: 20000 },
  multiplier: { min: 0.1, max: 5 },
  safetyBufferPercent: { min: 0, max: 100 },
  minimumRecommendedGb: { min: 0.5, max: 100 },
} as const;

function clamp(value: unknown, min: number, max: number, fallback: number): number {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num) || num < min || num > max) return fallback;
  return Math.round(num * 100) / 100;
}

/** Never let an invalid stored configuration break the finder. */
export function sanitizeUsageSettings(input: unknown): EsimUsageSettings {
  const raw = (input ?? {}) as Partial<EsimUsageSettings>;
  const perDaySource = (raw.perDayMb ?? {}) as Partial<Record<UsageKind, number>>;
  const perDayMb = {} as Record<UsageKind, number>;
  for (const key of USAGE_KEYS) {
    perDayMb[key] = clamp(perDaySource[key], SETTINGS_LIMITS.perDayMb.min, SETTINGS_LIMITS.perDayMb.max, DEFAULT_USAGE_SETTINGS.perDayMb[key]);
  }
  const multiplierSource = (raw.intensityMultipliers ?? {}) as Partial<Record<UsageIntensity, number>>;
  const intensityMultipliers: Record<UsageIntensity, number> = {
    LOW: clamp(multiplierSource.LOW, SETTINGS_LIMITS.multiplier.min, SETTINGS_LIMITS.multiplier.max, DEFAULT_USAGE_SETTINGS.intensityMultipliers.LOW),
    NORMAL: clamp(multiplierSource.NORMAL, SETTINGS_LIMITS.multiplier.min, SETTINGS_LIMITS.multiplier.max, DEFAULT_USAGE_SETTINGS.intensityMultipliers.NORMAL),
    HIGH: clamp(multiplierSource.HIGH, SETTINGS_LIMITS.multiplier.min, SETTINGS_LIMITS.multiplier.max, DEFAULT_USAGE_SETTINGS.intensityMultipliers.HIGH),
  };

  return {
    perDayMb,
    intensityMultipliers,
    safetyBufferPercent: clamp(raw.safetyBufferPercent, SETTINGS_LIMITS.safetyBufferPercent.min, SETTINGS_LIMITS.safetyBufferPercent.max, DEFAULT_USAGE_SETTINGS.safetyBufferPercent),
    minimumRecommendedGb: clamp(raw.minimumRecommendedGb, SETTINGS_LIMITS.minimumRecommendedGb.min, SETTINGS_LIMITS.minimumRecommendedGb.max, DEFAULT_USAGE_SETTINGS.minimumRecommendedGb),
  };
}

export type UsageEstimateInput = {
  days: number;
  usage: UsageKind[];
  intensity?: UsageIntensity;
  countries?: number;
};

export type UsageEstimate = {
  /** Raw estimate from duration × usage × intensity. */
  estimatedGb: number;
  /** Estimate plus configured safety buffer. */
  safetyAdjustedGb: number;
  /** Data allowance a package must at least provide. */
  requiredGb: number;
  safetyBufferPercent: number;
};

const round1 = (value: number) => Math.round(value * 10) / 10;

/** Pure calculation. Transparent: duration × selected usage × intensity + safety buffer. */
export function estimateUsageNeed(input: UsageEstimateInput, settings: EsimUsageSettings = DEFAULT_USAGE_SETTINGS): UsageEstimate {
  const config = sanitizeUsageSettings(settings);
  const days = Math.max(1, Math.round(Number(input.days) || 1));
  const multiplier = config.intensityMultipliers[input.intensity ?? "NORMAL"];
  const dailyMb = input.usage.reduce((total, key) => total + (config.perDayMb[key] ?? 0), 0);
  const estimatedGb = round1(Math.max(0, (dailyMb * days * multiplier) / 1024));
  const safetyAdjustedGb = round1(estimatedGb * (1 + config.safetyBufferPercent / 100));
  const requiredGb = round1(Math.max(safetyAdjustedGb, config.minimumRecommendedGb));

  return { estimatedGb, safetyAdjustedGb, requiredGb, safetyBufferPercent: config.safetyBufferPercent };
}
