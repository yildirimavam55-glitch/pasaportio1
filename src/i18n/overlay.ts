import { LOCALE_REGISTRY, type UiLocale } from "./locales";
import { RESOURCES } from "./resources";
import { TRUST_TRANSLATIONS } from "./trust-translations";

/**
 * Presentation-layer translation overlay.
 *
 * Customer copy is authored as `{ tr, de, en }` objects wrapped in `localize()`. For languages whose
 * registry `content` is "en" (fr, es, …), reading `.en` returns the English tree with every string
 * replaced from that language's static, versioned resource file (src/i18n/resources/*.json).
 * Missing entries fall back to English per string. Nothing is translated at runtime by a service.
 */
let active: UiLocale = "tr";
const warned = new Set<string>();

export function setActiveUiLocale(code: UiLocale) {
  active = code;
}
export function getActiveUiLocale(): UiLocale {
  return active;
}

const cache = new Map<UiLocale, WeakMap<object, unknown>>();

export function translateString(s: string, code: UiLocale = active): string {
  if (LOCALE_REGISTRY[code].content !== "en" || code === "en") return s;
  const hit = TRUST_TRANSLATIONS[code]?.[s] ?? RESOURCES[code]?.[s];
  if (hit) return hit;
  if (import.meta.env?.DEV && s.trim() && /\s|[a-z]{3}/i.test(s) && !warned.has(code + s)) {
    warned.add(code + s);
    console.debug(`[i18n:${code}] missing translation: ${s}`);
  }
  return s;
}

export function translateTree<T>(value: T, code: UiLocale = active): T {
  if (typeof value === "string") return translateString(value, code) as T;
  if (typeof value === "function") {
    const fn = value as unknown as (...a: unknown[]) => unknown;
    return ((...a: unknown[]) => translateTree(fn(...a), code)) as T;
  }
  if (!value || typeof value !== "object") return value;
  let map = cache.get(code);
  if (!map) cache.set(code, (map = new WeakMap()));
  const hit = map.get(value as object);
  if (hit) return hit as T;
  const out: unknown = Array.isArray(value)
    ? value.map((v) => translateTree(v, code))
    : Object.fromEntries(Object.entries(value).map(([k, v]) => [k, translateTree(v, code)]));
  map.set(value as object, out);
  return out as T;
}

/** Makes `.en` resolve to the active overlay language (fr/es/…) when one is selected. */
export function localize<T extends { en: unknown }>(content: T): T {
  const base = content.en;
  Object.defineProperty(content, "en", {
    enumerable: true,
    configurable: true,
    get() {
      return active === "en" || LOCALE_REGISTRY[active].content !== "en" ? base : translateTree(base, active);
    },
  });
  return content;
}
