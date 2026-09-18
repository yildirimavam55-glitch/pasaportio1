import { createContext, useContext, type ReactNode } from "react";
import type { StorefrontConfig, StorefrontSection, SectionType } from "@/domain/storefront/registry";
import { itemText, tx } from "@/domain/storefront/registry";
import type { StorefrontMedia } from "@/lib/storefront.functions";
import type { Locale } from "@/domain/enums";

type StorefrontValue = { config: StorefrontConfig | null; media: StorefrontMedia };

const StorefrontContext = createContext<StorefrontValue>({ config: null, media: {} });

export function StorefrontProvider({ config, media, children }: StorefrontValue & { children: ReactNode }) {
  return <StorefrontContext.Provider value={{ config, media }}>{children}</StorefrontContext.Provider>;
}

export function useStorefront() {
  return useContext(StorefrontContext);
}

/** Published section for a type, or null when the owner hid it. */
export function useSection(type: SectionType): StorefrontSection | null {
  const { config } = useStorefront();
  if (!config) return null;
  return config.sections.find((section) => section.type === type) ?? null;
}

export function useMediaUrl(id: string | null | undefined): { url: string; alt: string; position: string } | null {
  const { media } = useStorefront();
  if (!id) return null;
  const asset = media[id];
  if (!asset) return null;
  return { url: asset.url, alt: asset.alt, position: `${asset.focalX}% ${asset.focalY}%` };
}

export const sectionText = tx;
export const localeValue = itemText;
export type { Locale };
