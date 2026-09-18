/**
 * Pure provider eSIM catalogue import parsing.
 * No IO: turns a real provider catalogue export into normalized internal rows.
 * Never invents products, prices or coverage — every field comes from the payload.
 */
import { computePrice, type PricingRule, type RoundingMode } from "@/domain/pricing";
import { normalizeValidityToDays } from "@/domain/esim/package-matching";


export type RawImportItem = Record<string, unknown>;

export type ActivationPolicy = "ON_INSTALL" | "ON_FIRST_NETWORK_CONNECTION" | "ON_PURCHASE" | "UNKNOWN";

export type NormalizedEsimItem = {
  externalId: string;
  name: string;
  dataType: "FIXED" | "UNLIMITED";
  dataGb: number | null;
  unlimited: boolean;
  /** Untouched provider validity — never overwritten by normalization. */
  rawValidityValue: number | null;
  rawValidityUnit: string | null;
  /** Comparison-only value, always expressed in days. */
  validityDays: number | null;
  activationPolicy: ActivationPolicy;
  /** Customer-facing short note (derived), never raw provider jargon. */
  fairUseNote: string | null;
  /** Provider fair-use values, stored verbatim or null. */
  fairUsePolicy: string | null;
  highSpeedAllowance: string | null;
  speedAfterFairUse: string | null;
  coverage: string[];
  countryIso: string | null;
  packageKind: "COUNTRY" | "REGION" | "GLOBAL";
  providerCost: number;
  providerCurrency: string;
  networks: string[];
  supports5g: boolean | null;
  supportsHotspot: boolean | null;
  topupSupported: boolean | null;
  payload: RawImportItem;
};


export type ImportIssue = { index: number; externalId: string | null; message: string };

export type ParsedImport = {
  items: NormalizedEsimItem[];
  issues: ImportIssue[];
};

function pick(item: RawImportItem, keys: string[]): unknown {
  for (const key of keys) {
    const value = item[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(",", "."));
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function toBool(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (["true", "yes", "1"].includes(value.toLowerCase())) return true;
    if (["false", "no", "0"].includes(value.toLowerCase())) return false;
  }
  return null;
}

function toIsoList(value: unknown): string[] {
  const raw = Array.isArray(value) ? value : typeof value === "string" ? value.split(/[,;\s]+/) : [];
  const seen = new Set<string>();
  for (const entry of raw) {
    const iso = String(entry ?? "").trim().toUpperCase().slice(0, 2);
    if (/^[A-Z]{2}$/.test(iso)) seen.add(iso);
  }
  return [...seen];
}

/** Accepts an array, or an object wrapping the array under a common key. */
export function extractItemArray(input: unknown): RawImportItem[] | null {
  if (Array.isArray(input)) return input as RawImportItem[];
  if (input && typeof input === "object") {
    for (const key of ["items", "data", "packages", "bundles", "products", "results"]) {
      const value = (input as Record<string, unknown>)[key];
      if (Array.isArray(value)) return value as RawImportItem[];
    }
  }
  return null;
}

export function parseEsimCatalogue(input: unknown, defaultCurrency = "EUR"): ParsedImport {
  const rows = extractItemArray(input);
  if (!rows) {
    return { items: [], issues: [{ index: 0, externalId: null, message: "Beklenen biçim: ürün listesi (JSON dizisi)." }] };
  }

  const items: NormalizedEsimItem[] = [];
  const issues: ImportIssue[] = [];
  const seen = new Set<string>();

  rows.forEach((row, index) => {
    if (!row || typeof row !== "object") {
      issues.push({ index, externalId: null, message: "Geçersiz kayıt." });
      return;
    }
    const externalId = String(
      pick(row, ["externalId", "external_id", "providerProductId", "provider_product_id", "bundleId", "bundle_id", "sku", "code", "id"]) ?? "",
    ).trim();
    if (!externalId) {
      issues.push({ index, externalId: null, message: "Provider ürün kimliği eksik." });
      return;
    }
    if (seen.has(externalId)) {
      issues.push({ index, externalId, message: "Aynı provider ürün kimliği birden fazla kez gönderildi." });
      return;
    }

    const name = String(pick(row, ["name", "title", "description", "packageName"]) ?? "").trim();
    if (!name) {
      issues.push({ index, externalId, message: "Ürün adı eksik." });
      return;
    }

    const providerCost = toNumber(pick(row, ["providerCost", "provider_cost", "cost", "wholesalePrice", "netPrice", "price"]));
    if (providerCost == null || providerCost < 0) {
      issues.push({ index, externalId, message: "Provider maliyeti eksik veya geçersiz." });
      return;
    }

    const declaredDataType = String(pick(row, ["dataType", "data_type"]) ?? "").trim().toUpperCase();
    const unlimited = declaredDataType === "UNLIMITED" || (toBool(pick(row, ["unlimited", "unlimitedData", "unlimited_data"])) ?? false);
    let dataGb = toNumber(pick(row, ["dataGb", "data_gb", "gb", "dataAmountGb"]));
    if (dataGb == null) {
      const mb = toNumber(pick(row, ["dataMb", "data_mb", "mb"]));
      if (mb != null) dataGb = Math.round((mb / 1024) * 100) / 100;
    }
    if (!unlimited && (dataGb == null || dataGb <= 0)) {
      issues.push({ index, externalId, message: "Veri miktarı eksik (GB) ve paket sınırsız değil." });
      return;
    }

    const rawValidityValueInput = pick(row, ["validityDays", "validity_days", "days", "duration", "validity", "validityPeriod", "validity_period"]);
    const rawValidityUnitInput = pick(row, ["validityUnit", "validity_unit", "durationUnit", "duration_unit", "periodUnit", "unit"]);
    const rawValidityValue = toNumber(rawValidityValueInput);
    const rawValidityUnit = rawValidityUnitInput == null ? (rawValidityValue == null ? null : "DAYS") : String(rawValidityUnitInput).trim().toUpperCase().slice(0, 20);
    const validityDays = normalizeValidityToDays(rawValidityValueInput, rawValidityUnitInput);
    if (validityDays == null || validityDays <= 0) {
      issues.push({ index, externalId, message: "Geçerlilik süresi eksik veya okunamadı." });
      return;
    }

    const declaredActivation = String(pick(row, ["activationPolicy", "activation_policy", "validityStartRule", "validity_start_rule", "activation"]) ?? "")
      .trim()
      .toUpperCase()
      .replace(/[\s-]+/g, "_");
    const activationPolicy: ActivationPolicy = (["ON_INSTALL", "ON_FIRST_NETWORK_CONNECTION", "ON_PURCHASE"] as const).includes(
      declaredActivation as "ON_INSTALL",
    )
      ? (declaredActivation as ActivationPolicy)
      : "UNKNOWN";

    const clean = (value: unknown, max = 400) => (value == null ? null : String(value).trim().slice(0, max) || null);
    const fairUsePolicy = clean(pick(row, ["fairUsePolicy", "fair_use_policy"]));
    const highSpeedAllowance = clean(pick(row, ["highSpeedAllowance", "high_speed_allowance", "highSpeedData", "high_speed_data"]), 120);
    const speedAfterFairUse = clean(pick(row, ["speedAfterFairUse", "speed_after_fair_use", "throttledSpeed", "throttled_speed"]), 120);
    const fairUseNote =
      clean(pick(row, ["fairUseNote", "fair_use_note"])) ??
      (highSpeedAllowance && speedAfterFairUse ? `${highSpeedAllowance} — ${speedAfterFairUse}` : highSpeedAllowance);



    const countryIso = toIsoList(pick(row, ["countryIso", "country_iso", "country"]))[0] ?? null;
    const coverage = toIsoList(pick(row, ["coverage", "coverageCountryIsos", "coverage_country_isos", "countries", "countryList"]));
    const finalCoverage = coverage.length ? coverage : countryIso ? [countryIso] : [];
    if (!finalCoverage.length) {
      issues.push({ index, externalId, message: "Kapsama ülkeleri (ISO) eksik." });
      return;
    }

    const declaredKind = String(pick(row, ["packageKind", "package_kind", "type", "scope"]) ?? "").toUpperCase();
    const packageKind: NormalizedEsimItem["packageKind"] =
      declaredKind === "GLOBAL" || finalCoverage.length >= 60
        ? "GLOBAL"
        : declaredKind === "REGION" || declaredKind === "REGIONAL" || finalCoverage.length > 1
          ? "REGION"
          : "COUNTRY";

    seen.add(externalId);
    items.push({
      externalId,
      name,
      dataType: unlimited ? "UNLIMITED" : "FIXED",
      dataGb: unlimited ? null : dataGb,
      unlimited,
      rawValidityValue,
      rawValidityUnit,
      validityDays: Math.round(validityDays),
      activationPolicy,
      fairUseNote,

      coverage: finalCoverage,
      countryIso: packageKind === "COUNTRY" ? (countryIso ?? finalCoverage[0] ?? null) : countryIso,
      packageKind,
      providerCost,
      providerCurrency: String(pick(row, ["currency", "providerCurrency", "provider_currency"]) ?? defaultCurrency).toUpperCase().slice(0, 3),
      networks: (Array.isArray(pick(row, ["networks", "operators", "network_operators"]))
        ? (pick(row, ["networks", "operators", "network_operators"]) as unknown[])
        : []
      )
        .map((entry) => String(entry).trim())
        .filter(Boolean),
      supports5g: toBool(pick(row, ["supports5g", "supports_5g", "fiveG"])),
      supportsHotspot: toBool(pick(row, ["supportsHotspot", "supports_hotspot", "hotspot", "tethering"])),
      topupSupported: toBool(pick(row, ["topupSupported", "topup_supported", "topup"])),
      payload: row,
    });
  });

  return { items, issues };
}

export type PricingInput = {
  strategy: PricingRule["strategy"];
  markupPercent?: number | null;
  fixedMarkup?: number | null;
  minimumMarginPercent?: number | null;
  roundingMode?: RoundingMode;
  currency: string;
};

export type PricedItem = NormalizedEsimItem & {
  salePrice: number;
  marginAbsolute: number;
  marginPercent: number;
  belowMinimumMargin: boolean;
  slug: string;
};

export function slugifyExternal(providerCode: string, externalId: string): string {
  const clean = (value: string) =>
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  return `esim-${clean(providerCode)}-${clean(externalId)}`.slice(0, 120);
}

export function priceItems(items: NormalizedEsimItem[], pricing: PricingInput, providerCode: string): PricedItem[] {
  return items.map((item) => {
    const computed = computePrice(item.providerCost, {
      strategy: pricing.strategy,
      markupPercent: pricing.markupPercent ?? null,
      fixedMarkup: pricing.fixedMarkup ?? null,
      minimumMarginPercent: pricing.minimumMarginPercent ?? null,
      roundingMode: pricing.roundingMode ?? "NEAREST_99",
      currency: pricing.currency,
    });
    return {
      ...item,
      slug: slugifyExternal(providerCode, item.externalId),
      salePrice: computed.salePrice,
      marginAbsolute: computed.marginAbsolute,
      marginPercent: computed.marginPercent,
      belowMinimumMargin: computed.belowMinimumMargin,
    };
  });
}

export type DiffRow = {
  externalId: string;
  name: string;
  status: "NEW" | "UPDATED" | "UNCHANGED";
  salePrice: number;
  providerCost: number;
  currency: string;
  marginPercent: number;
  belowMinimumMargin: boolean;
  dataGb: number | null;
  unlimited: boolean;
  validityDays: number | null;
  coverageCount: number;
  packageKind: string;
};

export type ExistingRef = { externalId: string; providerCost: number | null; hash: string | null };

/** Stable content hash so re-importing the same export changes nothing. */
export function hashItem(item: NormalizedEsimItem): string {
  const basis = JSON.stringify([
    item.externalId,
    item.name,
    item.dataGb,
    item.unlimited,
    item.validityDays,
    item.rawValidityValue,
    item.rawValidityUnit,
    item.dataType,
    item.activationPolicy,
    item.fairUseNote,

    [...item.coverage].sort(),
    item.providerCost,
    item.providerCurrency,
    item.packageKind,
  ]);
  let hash = 0;
  for (let i = 0; i < basis.length; i += 1) {
    hash = (hash * 31 + basis.charCodeAt(i)) | 0;
  }
  return `h${(hash >>> 0).toString(16)}`;
}

export function buildDiff(priced: PricedItem[], existing: ExistingRef[]): DiffRow[] {
  const byId = new Map(existing.map((row) => [row.externalId, row]));
  return priced.map((item) => {
    const previous = byId.get(item.externalId);
    const status: DiffRow["status"] = !previous ? "NEW" : previous.hash === hashItem(item) ? "UNCHANGED" : "UPDATED";
    return {
      externalId: item.externalId,
      name: item.name,
      status,
      salePrice: item.salePrice,
      providerCost: item.providerCost,
      currency: item.providerCurrency,
      marginPercent: item.marginPercent,
      belowMinimumMargin: item.belowMinimumMargin,
      dataGb: item.dataGb,
      unlimited: item.unlimited,
      validityDays: item.validityDays,
      coverageCount: item.coverage.length,
      packageKind: item.packageKind,
    };
  });
}

/** Provider items that vanished from the export are marked unavailable, never deleted. */
export function missingExternalIds(priced: PricedItem[], existing: ExistingRef[]): string[] {
  const incoming = new Set(priced.map((item) => item.externalId));
  return existing.map((row) => row.externalId).filter((id) => !incoming.has(id));
}
