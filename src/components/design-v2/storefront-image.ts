import type { V2Media } from "@/lib/v2-storefront.functions";
import { mediaUrl } from "@/components/design-v2/V2Sections";

/**
 * Homepage image slots. Keys stay stable so admin/CMS can swap the source
 * without rewriting the component that renders the slot.
 */
export const STOREFRONT_IMAGE_SLOTS = {
  heroDesktop: "hero.esim.desktop",
  heroMobile: "hero.esim.mobile",
  destination: (iso: string) => `destination.${iso.toUpperCase()}`,
  region: (id: string) => `region.${id.toUpperCase()}`,
  trustStory: "trust.story",
} as const;

/**
 * Factory / restored ids that still mean “use the current summit default”.
 * Any other Admin-selected mediaId is applied as-is. Missing URLs fall back
 * to the summit (then seaside) photograph in CataloguePhoto.
 */
const DEFAULT_HERO_IDS = new Set([
  "builtin:esim-hero",
  "2096d4af-5b89-49ad-b19f-7ca95ec54160",
]);
export const HERO_SUMMIT_ID = "builtin:esim-hero-summit";

export function resolveHeroMediaId(mediaId?: string | null, mobileMediaId?: string | null, isMobile = false): string {
  const preferred = isMobile ? (mobileMediaId || mediaId) : (mediaId || mobileMediaId);
  if (!preferred || DEFAULT_HERO_IDS.has(preferred)) return HERO_SUMMIT_ID;
  return preferred;
}

export function resolveStorefrontImage(
  id: string | null | undefined,
  media: V2Media,
  fallbacks: Array<string | null | undefined> = [],
): string | undefined {
  for (const candidate of [id, ...fallbacks]) {
    const url = mediaUrl(candidate, media);
    if (url) return url;
  }
  return undefined;
}

export function storefrontImageCandidates(
  preferred?: string | null,
  fallbacks: Array<string | null | undefined> = [],
): Array<string | undefined> {
  return [preferred, ...fallbacks].filter((value): value is string => Boolean(value));
}
