import type { StorefrontSection } from "./registry";

/** Predefined surface presets only — the editor never accepts raw CSS. */
export const BACKGROUND_CLASS: Record<string, string> = {
  cream: "bg-accent-soft",
  white: "bg-card",
  mint: "bg-primary-soft",
  petrol: "bg-petrol-soft",
  image: "bg-card",
};

export const SPACING_CLASS: Record<string, string> = {
  compact: "py-7",
  normal: "py-12",
  large: "py-16",
};

export const WIDTH_CLASS: Record<string, string> = {
  standard: "max-w-site",
  wide: "max-w-[92rem]",
};

export const HERO_HEIGHT_CLASS: Record<string, string> = {
  compact: "min-h-[22rem] sm:min-h-[26rem]",
  normal: "min-h-[30rem] sm:min-h-[34rem]",
  tall: "min-h-[36rem] sm:min-h-[42rem]",
};

export const BACKGROUND_LABEL: Record<string, string> = {
  cream: "Krem", white: "Beyaz", mint: "Yumuşak nane", petrol: "Yumuşak petrol", image: "Görsel ağırlıklı",
};

export function surfaceClasses(section: Pick<StorefrontSection, "background" | "spacing"> | null | undefined, fallback = "bg-card py-12") {
  if (!section) return fallback;
  return `${BACKGROUND_CLASS[section.background] ?? "bg-card"} ${SPACING_CLASS[section.spacing] ?? "py-12"}`;
}

export function widthClass(section: Pick<StorefrontSection, "width"> | null | undefined) {
  return WIDTH_CLASS[section?.width ?? "standard"] ?? "max-w-site";
}
