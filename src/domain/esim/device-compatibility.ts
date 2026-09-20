/**
 * Device eSIM compatibility domain.
 * Independent from the provider/package catalogue: a device can support eSIM
 * while a package for a destination is unavailable, and vice versa.
 * Never stores IMEI, EID or serial numbers.
 */
export const COMPATIBILITY_STATUSES = ["COMPATIBLE", "UNCERTAIN", "NOT_COMPATIBLE"] as const;
export type CompatibilityStatus = (typeof COMPATIBILITY_STATUSES)[number];

export const DEVICE_BRANDS = [
  "Apple",
  "Samsung",
  "Google",
  "Xiaomi",
  "Motorola",
  "Huawei",
  "OnePlus",
  "Oppo",
  "Honor",
  "Sony",
  "Nothing",
  "Fairphone",
  "Asus",
  "Vivo",
  "Realme",
  "Other",
] as const;
export type DeviceBrand = (typeof DEVICE_BRANDS)[number];

export type DeviceRecord = {
  id: string;
  brand: string;
  family: string | null;
  model: string;
  aliases: string[];
  status: CompatibilityStatus;
  notes: string | null;
  regionVariantWarning: boolean;
  active: boolean;
  lastReviewed: string;
};

export function normalizeStatus(value: unknown): CompatibilityStatus {
  return COMPATIBILITY_STATUSES.includes(value as CompatibilityStatus) ? (value as CompatibilityStatus) : "UNCERTAIN";
}

function normalizeText(value: string) {
  return value
    .toLocaleLowerCase("en")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Search across brand, family, model and aliases. */
export function searchDevices(devices: DeviceRecord[], query: string, brand?: string): DeviceRecord[] {
  const term = normalizeText(query);
  const scoped = brand ? devices.filter((device) => device.brand === brand) : devices;
  if (!term) return scoped;
  return scoped.filter((device) => {
    const haystack = normalizeText([device.brand, device.family ?? "", device.model, ...device.aliases].join(" "));
    return term.split(" ").every((part) => haystack.includes(part));
  });
}

/** Session-only compatibility state — no device identifiers are collected. */
export type DeviceCheckState = {
  compatibilityChecked: boolean;
  deviceModel: string;
  compatibilityResult: CompatibilityStatus | null;
};

export const EMPTY_DEVICE_CHECK: DeviceCheckState = {
  compatibilityChecked: false,
  deviceModel: "",
  compatibilityResult: null,
};
