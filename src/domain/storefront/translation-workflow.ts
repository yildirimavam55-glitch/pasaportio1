import { UI_LOCALES, type UiLocale } from "@/i18n/locales";
import { ltStatus, type LT } from "./v2";

export const TRANSLATION_TARGETS = UI_LOCALES.filter((code): code is Exclude<UiLocale, "tr"> => code !== "tr");
export const TRANSLATION_STATUS_LABELS = { SOURCE: "Türkçe kaynak", MISSING: "Fehlt / Eksik", AUTO_TRANSLATED: "Automatisch / Otomatik", MANUALLY_EDITED: "Manuell / Elle düzenlendi", OUTDATED: "Quelle veraltet / Kaynak değişti" } as const;
export function sourceEdit(value: LT | undefined, source: string): LT {
  const current = value ?? { tr: "", de: "", en: "" };
  const src = { ...current._src };
  // Legacy values without provenance are conservatively manual; anchor the old source before editing.
  for (const code of TRANSLATION_TARGETS) if (current[code]?.trim() && src[code] === undefined) src[code] = current.tr;
  return { ...current, tr: source, _src: src };
}
export function manualEdit(value: LT | undefined, code: UiLocale, text: string): LT {
  if (code === "tr") return sourceEdit(value, text);
  const current = value ?? { tr: "", de: "", en: "" };
  const auto = { ...current._auto }; delete auto[code];
  return { ...current, [code]: text, _auto: auto, _src: { ...current._src, [code]: current.tr } };
}
export function needsMachineTranslation(value: LT | undefined, code: UiLocale): boolean {
  if (code === "tr" || !value?.tr.trim()) return false;
  return !value[code]?.trim() || (value._auto?.[code] === value[code] && value._src?.[code] !== value.tr);
}
/** Exact source string is the revision fingerprint. Ignore delayed results after any source change. */
export function mergeMachineTranslation(current: LT, snapshot: LT, result: Partial<Record<UiLocale, string>>): LT {
  if (current.tr !== snapshot.tr) return current;
  const next: LT = { ...current, _auto: { ...current._auto }, _src: { ...current._src } };
  for (const code of TRANSLATION_TARGETS) {
    const text = result[code];
    if (!text?.trim() || !needsMachineTranslation(current, code)) continue;
    // An intervening manual edit is ineligible above, even when source stayed the same.
    next[code] = text; next._auto![code] = text; next._src![code] = snapshot.tr;
  }
  return next;
}
export function aggregateTranslationStatus(values: (LT | undefined)[], code: UiLocale) {
  const active = values.filter(v => v?.tr.trim());
  if (!active.length) return "MISSING" as const;
  const order = ["MISSING", "OUTDATED", "MANUALLY_EDITED", "AUTO_TRANSLATED", "SOURCE"] as const;
  return order.find(status => active.some(value => ltStatus(value, code) === status)) ?? "MISSING";
}

/** Merge only proven fresh machine results. Preserve current layout, concurrent edits, and failed/stale fields. */
export function mergeTranslatedDraft<T>(current: T, snapshot: T, result: T): T {
  const record = (value: unknown): Record<string, any> | undefined => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, any> : undefined;
  const visit = (now: unknown, before: unknown, after: unknown): unknown => {
    const n = record(now), b = record(before), a = record(after);
    if (n && b && a && typeof n["tr"] === "string" && typeof n["de"] === "string" && typeof n["en"] === "string") {
      const fresh = Object.fromEntries(TRANSLATION_TARGETS.filter(code => a["_src"]?.[code] === b["tr"] && a["_auto"]?.[code] === a[code]).map(code => [code, a[code]]));
      return mergeMachineTranslation(n as LT, b as LT, fresh);
    }
    if (Array.isArray(now)) return now.map((child, index) => {
      const id = record(child)?.["id"];
      const find = (value: unknown) => Array.isArray(value) ? (id ? value.find(item => record(item)?.["id"] === id) : value[index]) : undefined;
      return visit(child, find(before), find(after));
    });
    if (n) return Object.fromEntries(Object.entries(n).map(([key, value]) => [key, visit(value, b?.[key], a?.[key])]));
    return now;
  };
  return visit(current, snapshot, result) as T;
}
