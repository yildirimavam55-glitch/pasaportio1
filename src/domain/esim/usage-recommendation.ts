import type { UsageKind } from "@/domain/experience/types";

/**
 * Centralized, admin-configurable eSIM usage recommendation settings.
 * Frontend components must never hard-code usage weights or package sizes.
 */

export type UsageIntensity = "LOW" | "NORMAL" | "HIGH";
export type PackageRoundingStrategy = "NEXT_PACKAGE_UP" | "NEAREST_PACKAGE";

export type EsimUsageSettings = {
  perDayMb: Record<UsageKind, number>;
  intensityMultipliers: Record<UsageIntensity, number>;
  safetyBufferPercent: number;
  minimumRecommendedGb: number;
  packageSizesGb: number[];
  roundingStrategy: PackageRoundingStrategy;
};

export const USAGE_KEYS: UsageKind[] = ["MESSAGING", "SOCIAL", "MAPS", "VIDEO", "WORK", "GAMING", "HOTSPOT"];

/** Safe defaults. Used until an administrator stores a valid configuration. */
export const DEFAULT_USAGE_SETTINGS: EsimUsageSettings = {
  perDayMb: { MESSAGING: 50, SOCIAL: 250, MAPS: 80, VIDEO: 900, WORK: 300, GAMING: 200, HOTSPOT: 500 },
  intensityMultipliers: { LOW: 0.7, NORMAL: 1, HIGH: 1.4 },
  safetyBufferPercent: 20,
  minimumRecommendedGb: 1,
  packageSizesGb: [1, 3, 5, 10, 20, 50],
  roundingStrategy: "NEXT_PACKAGE_UP",
};

export const SETTINGS_LIMITS = {
  perDayMb: { min: 0, max: 20000 },
  multiplier: { min: 0.1, max: 5 },
  safetyBufferPercent: { min: 0, max: 100 },
  minimumRecommendedGb: { min: 0.5, max: 100 },
  packageSizeGb: { min: 0.5, max: 500 },
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
  const sizes = Array.isArray(raw.packageSizesGb)
    ? Array.from(
        new Set(
          raw.packageSizesGb
            .map((size) => Number(size))
            .filter((size) => Number.isFinite(size) && size >= SETTINGS_LIMITS.packageSizeGb.min && size <= SETTINGS_LIMITS.packageSizeGb.max)
            .map((size) => Math.round(size * 100) / 100),
        ),
      ).sort((a, b) => a - b)
    : [];

  return {
    perDayMb,
    intensityMultipliers,
    safetyBufferPercent: clamp(raw.safetyBufferPercent, SETTINGS_LIMITS.safetyBufferPercent.min, SETTINGS_LIMITS.safetyBufferPercent.max, DEFAULT_USAGE_SETTINGS.safetyBufferPercent),
    minimumRecommendedGb: clamp(raw.minimumRecommendedGb, SETTINGS_LIMITS.minimumRecommendedGb.min, SETTINGS_LIMITS.minimumRecommendedGb.max, DEFAULT_USAGE_SETTINGS.minimumRecommendedGb),
    packageSizesGb: sizes.length ? sizes : DEFAULT_USAGE_SETTINGS.packageSizesGb,
    roundingStrategy: raw.roundingStrategy === "NEAREST_PACKAGE" ? "NEAREST_PACKAGE" : "NEXT_PACKAGE_UP",
  };
}

export type UsageRecommendationInput = {
  days: number;
  usage: UsageKind[];
  intensity?: UsageIntensity;
  countries?: number;
};

export type UsageRecommendation = {
  estimatedGb: number;
  safetyAdjustedGb: number;
  recommendedGb: number;
  safetyBufferPercent: number;
};

const round1 = (value: number) => Math.round(value * 10) / 10;

/** Pure calculation. Transparent: duration × selected usage × intensity + safety buffer. */
export function recommendUsage(input: UsageRecommendationInput, settings: EsimUsageSettings = DEFAULT_USAGE_SETTINGS): UsageRecommendation {
  const config = sanitizeUsageSettings(settings);
  const days = Math.max(1, Math.round(Number(input.days) || 1));
  const multiplier = config.intensityMultipliers[input.intensity ?? "NORMAL"];
  const dailyMb = input.usage.reduce((total, key) => total + (config.perDayMb[key] ?? 0), 0);
  const estimatedGb = round1(Math.max(0, (dailyMb * days * multiplier) / 1024));
  const safetyAdjustedGb = round1(estimatedGb * (1 + config.safetyBufferPercent / 100));
  const target = Math.max(safetyAdjustedGb, config.minimumRecommendedGb);

  const sizes = config.packageSizesGb;
  const last = sizes[sizes.length - 1] ?? config.minimumRecommendedGb;
  let recommendedGb = last;
  if (config.roundingStrategy === "NEAREST_PACKAGE") {
    recommendedGb = sizes.reduce((best, size) => (Math.abs(size - target) < Math.abs(best - target) ? size : best), sizes[0] ?? last);
  } else {
    recommendedGb = sizes.find((size) => size >= target) ?? last;
  }

  return { estimatedGb, safetyAdjustedGb, recommendedGb, safetyBufferPercent: config.safetyBufferPercent };
}
