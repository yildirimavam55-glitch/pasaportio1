import type { CSSProperties, ReactNode } from "react";
import type { V2Section } from "@/domain/storefront/v2";

const widthClass = { default: "", narrow: "mx-auto w-full max-w-4xl", wide: "mx-auto w-full max-w-[92rem]", full: "w-full max-w-none" } as const;
const spacingClass = { default: "", compact: "py-4", normal: "py-8", large: "py-12" } as const;
const backgroundClass = { default: "", brand: "bg-primary text-primary-foreground", light: "bg-card", dark: "bg-foreground text-background", custom: "" } as const;
const radiusClass = { default: "", small: "rounded-lg", medium: "rounded-2xl", large: "rounded-3xl" } as const;
const fontClass = { theme: "", heading: "font-display", body: "font-sans" } as const;
const weightClass = { default: "", normal: "font-normal", medium: "font-medium", semibold: "font-semibold", bold: "font-bold" } as const;
const lineClass = { default: "", tight: "leading-tight", normal: "leading-normal", relaxed: "leading-relaxed" } as const;
const trackingClass = { default: "", normal: "tracking-normal", wide: "tracking-wide" } as const;
const alignClass = { default: "", left: "text-left", center: "text-center", right: "text-right" } as const;
const positionClass = {
  "top-left": "items-start justify-start", "top-center": "items-start justify-center", "top-right": "items-start justify-end",
  "middle-left": "items-center justify-start", "middle-center": "items-center justify-center", "middle-right": "items-center justify-end",
  "bottom-left": "items-end justify-start", "bottom-center": "items-end justify-center", "bottom-right": "items-end justify-end",
} as const;

/** Optional presentation wrapper. Empty design settings produce no layout or visual change. */
export function V2SectionFrame({ section, children }: { section: V2Section; children: ReactNode }) {
  const design = section.design;
  if (!design) return <>{children}</>;
  const custom = design.background === "custom" && design.customColor ? { backgroundColor: design.customColor } : undefined;
  const style = {
    ...(custom ?? {}),
    ...(design.font !== "theme" ? { "--builder-font": design.font === "heading" ? "var(--font-heading, var(--font-display))" : "var(--font-body, var(--font-sans))" } : {}),
    ...(design.weight !== "default" ? { "--builder-weight": ({ normal: 400, medium: 500, semibold: 600, bold: 700 })[design.weight] } : {}),
    ...(design.lineHeight !== "default" ? { "--builder-line": ({ tight: 1.25, normal: 1.5, relaxed: 1.625 })[design.lineHeight] } : {}),
    ...(design.letterSpacing !== "default" ? { "--builder-tracking": design.letterSpacing === "wide" ? ".025em" : "0em" } : {}),
    ...(design.textAlign !== "default" ? { "--builder-align": design.textAlign } : {}),
    ...(design.headingColor ? { "--builder-heading-color": design.headingColor } : {}),
    ...(design.bodyColor ? { "--builder-body-color": design.bodyColor } : {}),
    ...(design.accentColor ? { "--builder-accent-color": design.accentColor } : {}),
    ...(design.mobile?.headingSize ? { "--section-heading-size-mobile": `${design.mobile.headingSize}px` } : {}),
    ...(design.mobile?.bodySize ? { "--section-body-size-mobile": `${design.mobile.bodySize}px` } : {}),
    ...(design.tablet?.headingSize ? { "--section-heading-size-tablet": `${design.tablet.headingSize}px` } : {}),
    ...(design.tablet?.bodySize ? { "--section-body-size-tablet": `${design.tablet.bodySize}px` } : {}),
    ...(design.desktop?.headingSize ? { "--section-heading-size-desktop": `${design.desktop.headingSize}px` } : {}),
    ...(design.desktop?.bodySize ? { "--section-body-size-desktop": `${design.desktop.bodySize}px` } : {}),
  } as CSSProperties;
  return (
    <section
      data-builder-background={design.background !== "default" || undefined}
      data-v2-section-frame
      data-builder-section={section.type === "SEARCH_HERO" ? "hero" : section.type === "NOTICE" ? "notice" : undefined}
      style={style}
      className={`${widthClass[design.width]} ${spacingClass[design.spacing]} ${backgroundClass[design.background]} ${radiusClass[design.radius]} ${fontClass[design.font]} ${weightClass[design.weight]} ${lineClass[design.lineHeight]} ${trackingClass[design.letterSpacing]} ${alignClass[design.textAlign]} flex min-w-0 flex-col ${positionClass[design.position]}`}
    >
      <div className="w-full">{children}</div>
    </section>
  );
}