import type { V2Section } from "./v2";

const LEGACY_TITLES = ["Yurt dışında bağlantıda kal.", "Im Ausland verbunden bleiben.", "Stay connected abroad.", "Her yerde bağlantıda kal.", "Überall verbunden bleiben.", "Stay connected everywhere.", "ابقَ متصلاً أينما كنت.", "ابقَ على اتصال في الخارج."];
/** Compatibility is per field. An editor edit explicitly opts out of legacy substitutions. */
export function resolveHeroCopy(section: V2Section, title: string, subtitle: string, defaultSubtitle: string, copy: { subtitle: string }) {
  const useDefaultTitle = section.heroTextMode !== "custom" && (!title || LEGACY_TITLES.includes(title));
  return { title, useDefaultTitle, subtitle: useDefaultTitle && subtitle === defaultSubtitle ? copy.subtitle : subtitle };
}

const BUILTIN = new Set(["2096d4af-5b89-49ad-b19f-7ca95ec54160", "builtin:esim-hero"]);
/** No database/media lookup here: resolved URLs enter only through the existing media registry. */
export function heroMedia(section: V2Section, urls: { desktop?: string | undefined; tablet?: string | undefined; mobile?: string | undefined }, fallback: { desktop: string; mobile: string }) {
  const builtinDesktop = !urls.desktop || BUILTIN.has(section.mediaId ?? "");
  const desktop = builtinDesktop ? fallback.desktop : urls.desktop!;
  const builtinMobile = !urls.mobile || BUILTIN.has(section.mobileMediaId ?? "");
  const mobile = builtinMobile ? (builtinDesktop ? fallback.mobile : desktop) : urls.mobile!;
  const tablet = urls.tablet || mobile;
  const crop = section.imageDisplay;
  const untouchedLegacyCrop = builtinDesktop && section.heroDesktopCrop !== "custom" && crop?.zoom === 100 && crop.x === 77 && crop.y === 56 && crop.fit === "cover";
  const desktopCrop = untouchedLegacyCrop ? undefined : crop;
  const mobileCrop = section.mobileImageDisplay;
  // Without tablet settings the pre-existing mobile appearance remains unchanged below 1024px.
  const tabletCrop = section.tabletImageDisplay ?? mobileCrop;
  return { desktop, tablet, mobile, builtinDesktop, builtinMobile, desktopCrop, mobileCrop, tabletCrop,
    signal: builtinDesktop && builtinMobile && !urls.tablet };
}
