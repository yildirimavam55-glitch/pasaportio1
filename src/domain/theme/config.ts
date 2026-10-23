/** Structured storefront theme configuration. No raw CSS is ever accepted. */

export type ThemeConfig = {
  logoMediaId: string | null;
  faviconMediaId: string | null;
  colors: { primary: string; secondary: string; background: string; text: string; cta: string; success: string; warning: string; info: string };
  headingFont: "Outfit" | "Manrope" | "Sora" | "Urbanist";
  bodyFont: "Manrope" | "Inter" | "Figtree" | "Work Sans";
  radius: "sharp" | "soft" | "round";
  shadow: "none" | "subtle" | "raised";
  buttonStyle: "solid" | "outline" | "pill";
  surface: "light" | "soft" | "contrast";
  headingScale: "compact" | "default" | "large";
  bodyScale: "compact" | "default" | "large";
  sectionSpacing: "compact" | "default" | "large";
  pageWidth: "narrow" | "default" | "wide";
  buttonRadius: "small" | "default" | "pill";
  cardRadius: "small" | "default" | "large";
  homepageScrollAnimations: boolean;
  applyToDark?: boolean;
  responsive?: Partial<Record<"mobile" | "tablet" | "desktop", { headingSize?: number; bodySize?: number }>>;
};

export type PublishedThemeConfig = ThemeConfig & { logoUrl: string | null; faviconUrl: string | null };

export const DEFAULT_THEME: ThemeConfig = {
  logoMediaId: null,
  faviconMediaId: null,
  colors: { primary: "#07584f", secondary: "#f3efe4", background: "#faf7ef", text: "#173d3a", cta: "#e2662a", success: "#1f8a5f", warning: "#c98a17", info: "#2b6cb0" },
  headingFont: "Outfit",
  bodyFont: "Manrope",
  radius: "soft",
  shadow: "subtle",
  buttonStyle: "solid",
  surface: "light",
  headingScale: "default",
  bodyScale: "default",
  sectionSpacing: "default",
  pageWidth: "default",
  buttonRadius: "default",
  cardRadius: "default",
  homepageScrollAnimations: true,
};

const HEX = /^#[0-9a-fA-F]{6}$/;
const pick = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T =>
  (allowed as readonly string[]).includes(String(value)) ? (String(value) as T) : fallback;
const color = (value: unknown, fallback: string) => (HEX.test(String(value)) ? String(value).toLowerCase() : fallback);

export function sanitizeTheme(input: unknown): ThemeConfig {
  const raw = (input ?? {}) as any;
  const base = DEFAULT_THEME;
  return {
    applyToDark: raw.applyToDark === true,
    responsive: Object.fromEntries(['mobile','tablet','desktop'].filter(device=>raw.responsive?.[device]).map(device=>[device,Object.fromEntries(['headingSize','bodySize'].filter(key=>Number.isFinite(raw.responsive[device][key])).map(key=>[key,Math.min(key==='headingSize'?96:32,Math.max(key==='headingSize'?16:12,raw.responsive[device][key]))]))])),
    logoMediaId: raw.logoMediaId ? String(raw.logoMediaId) : null,
    faviconMediaId: raw.faviconMediaId ? String(raw.faviconMediaId) : null,
    colors: {
      primary: color(raw.colors?.primary, base.colors.primary),
      secondary: color(raw.colors?.secondary, base.colors.secondary),
      background: color(raw.colors?.background, base.colors.background),
      text: color(raw.colors?.text, base.colors.text),
      cta: color(raw.colors?.cta, base.colors.cta),
      success: color(raw.colors?.success, base.colors.success),
      warning: color(raw.colors?.warning, base.colors.warning),
      info: color(raw.colors?.info, base.colors.info),
    },
    headingFont: pick(raw.headingFont, ["Outfit", "Manrope", "Sora", "Urbanist"] as const, base.headingFont),
    bodyFont: pick(raw.bodyFont, ["Manrope", "Inter", "Figtree", "Work Sans"] as const, base.bodyFont),
    radius: pick(raw.radius, ["sharp", "soft", "round"] as const, base.radius),
    shadow: pick(raw.shadow, ["none", "subtle", "raised"] as const, base.shadow),
    buttonStyle: pick(raw.buttonStyle, ["solid", "outline", "pill"] as const, base.buttonStyle),
    surface: pick(raw.surface, ["light", "soft", "contrast"] as const, base.surface),
    headingScale: pick(raw.headingScale, ["compact", "default", "large"] as const, base.headingScale),
    bodyScale: pick(raw.bodyScale, ["compact", "default", "large"] as const, base.bodyScale),
    sectionSpacing: pick(raw.sectionSpacing, ["compact", "default", "large"] as const, base.sectionSpacing),
    pageWidth: pick(raw.pageWidth, ["narrow", "default", "wide"] as const, base.pageWidth),
    buttonRadius: pick(raw.buttonRadius, ["small", "default", "pill"] as const, base.buttonRadius),
    cardRadius: pick(raw.cardRadius, ["small", "default", "large"] as const, base.cardRadius),
    homepageScrollAnimations: typeof raw.homepageScrollAnimations === "boolean" ? raw.homepageScrollAnimations : base.homepageScrollAnimations,
  };
}

const RADIUS = { sharp: "0.35rem", soft: "0.75rem", round: "1.35rem" };
const SHADOW = {
  none: { card: "none", panel: "none", brand: "none", cta: "none" },
  subtle: {
    card: "0 10px 28px color-mix(in oklab, var(--foreground) 8%, transparent)",
    panel: "0 24px 60px color-mix(in oklab, var(--foreground) 12%, transparent)",
    brand: "0 6px 20px color-mix(in oklab, var(--primary) 28%, transparent)",
    cta: "0 8px 22px color-mix(in oklab, var(--cta) 30%, transparent)",
  },
  raised: {
    card: "0 16px 38px color-mix(in oklab, var(--foreground) 13%, transparent)",
    panel: "0 30px 72px color-mix(in oklab, var(--foreground) 18%, transparent)",
    brand: "0 10px 28px color-mix(in oklab, var(--primary) 34%, transparent)",
    cta: "0 12px 30px color-mix(in oklab, var(--cta) 36%, transparent)",
  },
} as const;

const HEADING_SCALE = { compact: "0.92", default: "1", large: "1.1" } as const;
const BODY_SCALE = { compact: "0.94", default: "1", large: "1.06" } as const;
const SECTION_SPACING = { compact: "2rem", default: "3rem", large: "4rem" } as const;
const PAGE_WIDTH = { narrow: "68rem", default: "80rem", wide: "92rem" } as const;
const BUTTON_RADIUS = { small: "0.5rem", default: "0.75rem", pill: "999px" } as const;
const CARD_RADIUS = { small: "0.75rem", default: "1.25rem", large: "1.75rem" } as const;

/** CSS custom properties applied to the storefront root element. */
export function themeCssVariables(theme: ThemeConfig): Record<string, string> {
  const isEmpty = !theme;
  if (isEmpty) return {};
  const shadow = SHADOW[theme.shadow];
  return {
    "--primary": theme.colors.primary,
    "--secondary": theme.colors.secondary,
    "--background": theme.colors.background,
    "--foreground": theme.colors.text,
    "--cta": theme.colors.cta,
    "--success": theme.colors.success,
    "--warning": theme.colors.warning,
    "--info": theme.colors.info,
    "--radius": RADIUS[theme.radius],
    "--font-sans": `"${theme.bodyFont}", sans-serif`,
    "--font-display": `"${theme.headingFont}", sans-serif`,
    "--font-body": `"${theme.bodyFont}", sans-serif`,
    "--font-heading": `"${theme.headingFont}", sans-serif`,
    "--theme-heading-scale": HEADING_SCALE[theme.headingScale],
    "--theme-body-scale": BODY_SCALE[theme.bodyScale],
    "--section-spacing": SECTION_SPACING[theme.sectionSpacing],
    "--page-max-width": PAGE_WIDTH[theme.pageWidth],
    "--button-radius": BUTTON_RADIUS[theme.buttonRadius],
    "--radius-card": CARD_RADIUS[theme.cardRadius],
    "--theme-shadow-card": shadow.card,
    "--theme-shadow-panel": shadow.panel,
    "--theme-shadow-brand": shadow.brand,
    "--theme-shadow-cta": shadow.cta,
  };
}

export function themeFontUrl(theme: ThemeConfig): string {
  const families = [...new Set([theme.headingFont, theme.bodyFont])];
  const query = families.map((family) => `family=${encodeURIComponent(family).replace(/%20/g, "+")}:wght@400;500;600;700;800`).join("&");
  return `https://fonts.googleapis.com/css2?${query}&display=swap`;
}

/** Only explicit responsive overrides emit rules; default appearance remains untouched. */
export function themeResponsiveCss(input:ThemeConfig,scope='.v2-theme'):string{
 const theme=sanitizeTheme(input);
 return (['mobile','tablet','desktop'] as const).map((device,index)=>{
  const v=theme.responsive?.[device];if(!v)return '';
  const rules=(v.headingSize?`${scope} :is(h1,h2,h3,[data-v2-heading]){font-size:var(--builder-heading-size,${v.headingSize}px)!important}`:'')+(v.bodySize?`${scope} :is(p,[data-v2-body]){font-size:var(--builder-body-size,${v.bodySize}px)!important}`:'');
  return index?`@media(min-width:${index===1?640:1024}px){${rules}}`:rules;
 }).join('');
}
