/**
 * Customer-friendly wording for provider activation semantics.
 * Provider terminology (ON_INSTALL etc.) is never shown to customers, and an
 * unknown policy is never replaced by an invented assumption.
 */
import type { Locale } from "@/domain/enums";
import { localize } from "@/i18n/overlay";

export type ActivationPolicy = "ON_INSTALL" | "ON_FIRST_NETWORK_CONNECTION" | "ON_PURCHASE" | "UNKNOWN";

const NOTES: Record<Exclude<ActivationPolicy, "UNKNOWN">, Record<Locale, string>> = {
  ON_INSTALL: localize({
    tr: "Geçerlilik süresi, eSIM'i telefonuna kurduğunda başlar.",
    de: "Die Laufzeit startet, sobald du die eSIM installierst.",
    en: "Validity starts when you install the eSIM on your phone.",
  }),
  ON_FIRST_NETWORK_CONNECTION: localize({
    tr: "Geçerlilik süresi, yurt dışında ilk bağlantıda başlar.",
    de: "Die Laufzeit startet mit der ersten Netzverbindung vor Ort.",
    en: "Validity starts with your first network connection abroad.",
  }),
  ON_PURCHASE: localize({
    tr: "Geçerlilik süresi, satın alma anında başlar.",
    de: "Die Laufzeit startet direkt mit dem Kauf.",
    en: "Validity starts at the moment of purchase.",
  }),
};

/** Returns null for UNKNOWN — we never guess how a provider counts validity. */
export function activationNote(policy: ActivationPolicy | null | undefined, locale: Locale): string | null {
  if (!policy || policy === "UNKNOWN") return null;
  return NOTES[policy]?.[locale] ?? null;
}
