/** Structured storefront theme configuration. No raw CSS is ever accepted. */

export type ThemeConfig = {
  logoMediaId: string | null;
  faviconMediaId: string | null;
  colors: { primary: string; cta: string; success: string; warning: string; info: string };
  headingFont: "Outfit" | "Manrope" | "Sora" | "Urbanist";
  bodyFont: "Manrope" | "Inter" | "Figtree" | "Work Sans";
  radius: "sharp" | "soft" | "round";
  shadow: "none" | "subtle" | "raised";
  buttonStyle: "solid" | "outline" | "pill";
  surface: "light" | "soft" | "contrast";
};

export type PublishedThemeConfig = ThemeConfig & { logoUrl: string | null; faviconUrl: string | null };

export const DEFAULT_THEME: ThemeConfig = {
  logoMediaId: null,
  faviconMediaId: null,
  colors: { primary: "#07584f", cta: "#e2662a", success: "#1f8a5f", warning: "#c98a17", info: "#2b6cb0" },
  headingFont: "Outfit",
  bodyFont: "Manrope",
  radius: "soft",
  shadow: "subtle",
  buttonStyle: "solid",
  surface: "light",
};

const HEX = /^#[0-9a-fA-F]{6}$/;
const pick = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T =>
  (allowed as readonly string[]).includes(String(value)) ? (String(value) as T) : fallback;
const color = (value: unknown, fallback: string) => (HEX.test(String(value)) ? String(value).toLowerCase() : fallback);

export function sanitizeTheme(input: unknown): ThemeConfig {
  const raw = (input ?? {}) as any;
  const base = DEFAULT_THEME;
  return {
    logoMediaId: raw.logoMediaId ? String(raw.logoMediaId) : null,
    faviconMediaId: raw.faviconMediaId ? String(raw.faviconMediaId) : null,
    colors: {
      primary: color(raw.colors?.primary, base.colors.primary),
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

/** CSS custom properties applied to the storefront root element. */
export function themeCssVariables(theme: ThemeConfig): Record<string, string> {
  const isEmpty = !theme;
  if (isEmpty) return {};
  const shadow = SHADOW[theme.shadow];
  return {
    "--primary": theme.colors.primary,
    "--cta": theme.colors.cta,
    "--success": theme.colors.success,
    "--warning": theme.colors.warning,
    "--info": theme.colors.info,
    "--radius": RADIUS[theme.radius],
    "--font-sans": `"${theme.bodyFont}", sans-serif`,
    "--font-display": `"${theme.headingFont}", sans-serif`,
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
