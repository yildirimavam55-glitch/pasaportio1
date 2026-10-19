import type { Locale } from "@/domain/enums";
import { defaultV2Page, v2ItemText, v2Text, type V2Section } from "@/domain/storefront/v2";

const factoryHero = defaultV2Page("esim").sections.find((section) => section.type === "SEARCH_HERO");
const factoryBenefits = defaultV2Page("esim").sections.find((section) => section.type === "BENEFIT_ROW");

/**
 * Published SEARCH_HERO field from Admin V2.
 * Empty values and the built-in factory seed fall back to the 14-locale storefront copy
 * so the premium hero does not revert until the editor actually changes a field.
 */
export function publishedHeroText(section: V2Section | undefined, key: string, locale: Locale, fallback: string): string {
  const value = v2Text(section, key, locale);
  if (!value) return fallback;
  const seed = factoryHero ? v2Text(factoryHero, key, locale) : "";
  return seed && value === seed ? fallback : value;
}

/** Admin-edited BENEFIT_ROW label/description for one perk id; factory seed and empty fields keep the fallback. */
export function publishedHeroPerk(
  section: V2Section | undefined,
  id: string,
  locale: Locale,
  fallback: { label: string; info: string },
): { label: string; info: string } {
  const item = (section?.items ?? []).find((entry) => entry.visible && entry.id === id);
  const seed = factoryBenefits?.items.find((entry) => entry.id === id);
  const cmsLabel = v2ItemText(item?.title, locale);
  const seedLabel = v2ItemText(seed?.title, locale);
  const cmsInfo = v2ItemText(item?.text, locale);
  const seedInfo = v2ItemText(seed?.text, locale);
  return {
    label: cmsLabel && cmsLabel !== seedLabel ? cmsLabel : fallback.label,
    info: cmsInfo && cmsInfo !== seedInfo ? cmsInfo : fallback.info,
  };
}

/** Keep the mint 3-line heading. Custom CMS titles may use newlines for the same structure. */
export function heroHeadingParts(
  cmsTitle: string,
  cmsEyebrow: string,
  fallback: { kicker: string; accent: string; end: string },
): { kicker: string; accent: string; end: string } {
  if (!cmsTitle) return { kicker: cmsEyebrow || fallback.kicker, accent: fallback.accent, end: fallback.end };
  const lines = cmsTitle.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  if (lines.length >= 2) {
    return { kicker: cmsEyebrow || lines[0]!, accent: lines[1]!, end: lines.slice(2).join(" ") };
  }
  return { kicker: cmsEyebrow || fallback.kicker, accent: cmsTitle, end: "" };
}
