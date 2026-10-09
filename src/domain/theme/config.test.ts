import { describe, expect, it } from "vitest";
import { DEFAULT_THEME, sanitizeTheme, themeCssVariables, themeFontUrl } from "@/domain/theme/config";

describe("storefront theme", () => {
  it("persists the global animation toggle without enabling a disabled value", () => {
    expect(sanitizeTheme({ homepageScrollAnimations: false }).homepageScrollAnimations).toBe(false);
    expect(sanitizeTheme({ homepageScrollAnimations: true }).homepageScrollAnimations).toBe(true);
    expect(sanitizeTheme({ homepageScrollAnimations: "false" }).homepageScrollAnimations).toBe(true);
  });
  it("round-trips the default theme", () => {
    expect(sanitizeTheme(DEFAULT_THEME)).toEqual(DEFAULT_THEME);
  });

  it("rejects raw CSS, unknown fonts and unsafe colors", () => {
    const clean = sanitizeTheme({
      ...DEFAULT_THEME,
      colors: { ...DEFAULT_THEME.colors, primary: "red;display:none" },
      headingFont: "Comic Sans",
      buttonStyle: "javascript:alert(1)",
    });
    expect(clean.colors.primary).toBe(DEFAULT_THEME.colors.primary);
    expect(clean.headingFont).toBe(DEFAULT_THEME.headingFont);
    expect(clean.buttonStyle).toBe(DEFAULT_THEME.buttonStyle);
  });

  it("maps approved visual controls to bounded variables", () => {
    const theme = { ...DEFAULT_THEME, headingFont: "Sora" as const, bodyFont: "Inter" as const, shadow: "none" as const };
    expect(themeCssVariables(theme)).toMatchObject({
      "--font-display": '"Sora", sans-serif',
      "--font-sans": '"Inter", sans-serif',
      "--theme-shadow-card": "none",
    });
    expect(themeFontUrl(theme)).toContain("family=Sora");
    expect(themeFontUrl(theme)).toContain("family=Inter");
  });

  it("sanitizes extended global controls without accepting arbitrary values", () => {
    const clean = sanitizeTheme({
      colors: { secondary: "#abcdef", background: "red", text: "#123456" },
      headingScale: "large", bodyScale: "huge", sectionSpacing: "compact",
      pageWidth: "wide", buttonRadius: "pill", cardRadius: "large",
    });
    expect(clean.colors.secondary).toBe("#abcdef");
    expect(clean.colors.background).toBe(DEFAULT_THEME.colors.background);
    expect(clean.colors.text).toBe("#123456");
    expect(clean.headingScale).toBe("large");
    expect(clean.bodyScale).toBe("default");
    expect(themeCssVariables(clean)).toMatchObject({
      "--font-heading": '"Outfit", sans-serif',
      "--font-body": '"Manrope", sans-serif',
      "--page-max-width": "92rem",
      "--button-radius": "999px",
      "--radius-card": "1.75rem",
    });
  });
});