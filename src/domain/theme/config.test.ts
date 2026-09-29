import { describe, expect, it } from "vitest";
import { DEFAULT_THEME, sanitizeTheme, themeCssVariables, themeFontUrl } from "@/domain/theme/config";

describe("storefront theme", () => {
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
});