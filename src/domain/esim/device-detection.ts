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
  if (/Samsung|SM-[A-Z0-9-]+/i.test(`${explicitModel} ${ua}`)) return { kind: "partial", family: "samsung" };
  if (/Android/i.test(`${platform} ${ua}`)) return { kind: "partial", family: "android" };
  return { kind: "unknown" };
}