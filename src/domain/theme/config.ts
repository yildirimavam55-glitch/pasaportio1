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
const SHADOW = { none: "none", subtle: "0 6px 18px rgb(7 88 79 / 0.08)", raised: "0 16px 40px rgb(7 88 79 / 0.16)" };

/** CSS custom properties applied to the storefront root element. */
export function themeCssVariables(theme: ThemeConfig): Record<string, string> {
  const isEmpty = !theme;
  if (isEmpty) return {};
  return {
    "--primary": theme.colors.primary,
    "--cta": theme.colors.cta,
    "--success": theme.colors.success,
    "--warning": theme.colors.warning,
    "--info": theme.colors.info,
    "--radius": RADIUS[theme.radius],
    "--theme-shadow": SHADOW[theme.shadow],
  };
}
