import type { DeviceRecord } from "./device-compatibility";

export type BrowserDeviceSignals = {
  model?: string;
  userAgent?: string;
  platform?: string;
  maxTouchPoints?: number;
};

export type DeviceDetection =
  | { kind: "exact"; device: DeviceRecord }
  | { kind: "partial"; family: "iphone" | "android" | "samsung" }
  | { kind: "unknown" };

function normalize(value: string) {
  return value.toLocaleLowerCase("en").replace(/[^a-z0-9]+/g, " ").trim();
}

function androidModelFromUserAgent(userAgent: string) {
  const match = userAgent.match(/Android\s[^;)]*;\s*(?:[a-z]{2}(?:[-_][a-z]{2})?;\s*)?([^;)]+?)(?:\s+Build\/|;|\))/i);
  const candidate = match?.[1]?.trim() ?? "";
  if (!candidate || /^(wv|mobile|tablet)$/i.test(candidate)) return "";
  return candidate;
}

function exactCatalogueMatch(devices: DeviceRecord[], candidate: string) {
  const wanted = normalize(candidate);
  if (!wanted) return null;
  const matches = devices.filter((device) =>
    [device.model, ...device.aliases].some((value) => normalize(value) === wanted),
  );
  return matches.length === 1 ? matches[0] ?? null : null;
}

/** Uses browser-provided model identifiers only; ambiguous families never become compatibility claims. */
export function detectDeviceFromSignals(devices: DeviceRecord[], signals: BrowserDeviceSignals): DeviceDetection {
  const ua = signals.userAgent ?? "";
  const platform = signals.platform ?? "";
  const explicitModel = signals.model?.trim() ?? "";
  const androidModel = explicitModel || androidModelFromUserAgent(ua);
  const exact = exactCatalogueMatch(devices, androidModel);
  if (exact) return { kind: "exact", device: exact };

  const iphoneLike = /iPhone|iPad|iPod/i.test(ua) || (/Mac/i.test(platform) && (signals.maxTouchPoints ?? 0) > 1);
  if (iphoneLike) return { kind: "partial", family: "iphone" };
  // Brand only from the device identifier — "SamsungBrowser" in the UA is a browser, installable on any Android phone.
  const deviceId = androidModel.trim();
  if (/^SM-[A-Z0-9]/i.test(deviceId) || /^(Samsung|Galaxy)\b/i.test(deviceId)) return { kind: "partial", family: "samsung" };
  if (/Android/i.test(`${platform} ${ua}`)) return { kind: "partial", family: "android" };
  return { kind: "unknown" };
}
export type CheckerPrefill = { brand: string | null; device: DeviceRecord | null };

/** Mobile from the browser's own declaration (Client Hints / UA token), never from screen size. */
export function isMobileBrowser(signals: BrowserDeviceSignals, uaDataMobile?: boolean): boolean {
  const ua = signals.userAgent ?? "";
  if (/iPhone|iPad|iPod|Android/i.test(ua)) return true;
  if (/Mac/i.test(signals.platform ?? "") && (signals.maxTouchPoints ?? 0) > 1) return true;
  return uaDataMobile === true;
}

/** Desktop browsers must never prefill a phone from automatic detection. */
export function checkerDetectionForViewport(detection: DeviceDetection, isMobile: boolean): DeviceDetection {
  return isMobile ? detection : { kind: "unknown" };
}

const FAMILY_BRAND: Record<string, string> = { iphone: "apple", samsung: "samsung" };

function canonicalBrand(devices: DeviceRecord[], wanted: string) {
  const key = normalize(wanted).replace(/\s+electronics$/, "");
  return devices.find((device) => normalize(device.brand) === key)?.brand ?? null;
}

/**
 * Checker prefill from the SAME detection state the product card shows.
 * Priority: manual confirmation > exact detection > detected brand > platform/unknown (nothing).
 * Brands resolve only to an existing dataset brand; models only via exact unique record.
 */
export function resolveCheckerPrefill(
  devices: DeviceRecord[],
  manual: { brand?: string; model?: string } | null,
  detection: DeviceDetection,
): CheckerPrefill {
  if (manual?.model) {
    const manualModel = manual.model;
    const brand = manual.brand ? canonicalBrand(devices, manual.brand) : null;
    const matches = devices.filter((d) => normalize(d.model) === normalize(manualModel) && (!brand || d.brand === brand));
    const device = matches.length === 1 ? matches[0] ?? null : null;
    if (device || brand) return { brand: device?.brand ?? brand, device };
  }
  if (detection.kind === "exact") return { brand: detection.device.brand, device: detection.device };
  if (detection.kind === "partial") {
    const family = FAMILY_BRAND[detection.family];
    return { brand: family ? canonicalBrand(devices, family) : null, device: null };
  }
  return { brand: null, device: null };
}
