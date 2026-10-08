import type { Locale } from "@/domain/enums";
import { v2ItemText, type LT, type V2Section } from "@/domain/storefront/v2";
import { waLink } from "@/lib/whatsapp";

/** One entry of the four-column trust row below the hero's compatibility band. */
export type TrustBandItem = { id: string; icon: string; label: string; description: string; href: string };

/**
 * The row is edited in Admin → Storefront → Ana sayfa → Avantajlar (BENEFIT_ROW). These are the
 * approved values it ships with, kept here so a missing section or an emptied field never blanks
 * the row. WhatsApp stays a code-side link because the support number comes from settings.
 */
type Row = { id: string; icon?: string | undefined; title?: LT | undefined; text?: LT | undefined; href?: string | undefined; internalKey?: string | undefined; whatsapp?: boolean | undefined };

const DEFAULTS: Row[] = [
  { id: "delivery", icon: "Zap", title: { tr: "Hızlı teslimat", de: "Schnelle Lieferung", en: "Fast delivery", ar: "تسليم سريع" }, text: { tr: "eSIM teslim bilgileri", de: "Informationen zur eSIM-Lieferung", en: "eSIM delivery information", ar: "معلومات تسليم eSIM" }, href: "/legal/terms" },
  { id: "setup", icon: "Smartphone", title: { tr: "Kolay kurulum", de: "Einfach einrichten", en: "Easy installation", ar: "إعداد سهل" }, text: { tr: "Adım adım kurulum", de: "Installation Schritt für Schritt", en: "Step-by-step installation", ar: "التثبيت خطوة بخطوة" }, href: "/esim/kurulum" },
  { id: "refund", icon: "CalendarCheck", title: { tr: "14 gün iade", de: "14 Tage Rückgabe", en: "14-day refunds", ar: "استرداد خلال 14 يومًا" }, text: { tr: "İade koşullarını gör", de: "Rückgabebedingungen ansehen", en: "See the refund conditions", ar: "اطّلع على شروط الاسترداد" }, href: "/legal/refund" },
  { id: "support", icon: "Headphones", title: { tr: "WhatsApp destek", de: "WhatsApp Support", en: "WhatsApp support", ar: "دعم واتساب" }, text: { tr: "Kurulum için yardım", de: "Hilfe bei der Einrichtung", en: "Help with installation", ar: "المساعدة في التثبيت" }, whatsapp: true },
];

const byId = new Map(DEFAULTS.map((entry) => [entry.id, entry]));

/**
 * Reads the Admin-edited row: order and visibility follow the saved items, and each item keeps the
 * admin's icon, localized label, link and description. A field the Admin left empty falls back to
 * the approved default for that item, so saved values always win over the built-in copy.
 */
export function trustBandItems(section: V2Section | undefined, locale: Locale): TrustBandItem[] {
  const stored = (section?.items ?? []).filter((item) => item.visible);
  const rows: Row[] = stored.length ? stored : DEFAULTS;
  return rows.map((row) => {
    const fallback = byId.get(row.id);
    const label = v2ItemText(row.title, locale) || v2ItemText(fallback?.title, locale);
    const description = v2ItemText(row.text, locale) || v2ItemText(fallback?.text, locale);
    const toWhatsApp = row.whatsapp === true || row.internalKey === "support" || fallback?.whatsapp === true;
    const href = row.href?.trim() || (toWhatsApp ? waLink() : fallback?.href ?? "");
    return { id: row.id, icon: row.icon?.trim() || fallback?.icon || "Sparkles", label, description, href };
  }).filter((item) => item.label !== "" && item.href !== "");
}
