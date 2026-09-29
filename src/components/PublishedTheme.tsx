import { useQuery } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import { createContext, useContext, useEffect, type ReactNode } from "react";
import { getPublishedTheme } from "@/lib/admin-theme.functions";
import { DEFAULT_THEME, themeCssVariables, themeFontUrl, type PublishedThemeConfig } from "@/domain/theme/config";

const fallback: PublishedThemeConfig = { ...DEFAULT_THEME, logoUrl: null, faviconUrl: null };
const PublishedThemeContext = createContext<PublishedThemeConfig>(fallback);
export const usePublishedTheme = () => useContext(PublishedThemeContext);

/**
 * Applies the PUBLISHED theme to the customer site.
 * The admin area keeps the built-in petrol system so theme edits can never
 * make the control center unreadable.
 */
export function PublishedTheme({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const theme = useQuery({ queryKey: ["published-theme"], queryFn: () => getPublishedTheme(), staleTime: 5 * 60 * 1000 });
  const active = pathname.startsWith("/admin") ? fallback : (theme.data ?? fallback);
  useEffect(() => {
    if (pathname.startsWith("/admin")) return;
    const fontLink = document.querySelector<HTMLLinkElement>('link[data-travely-fonts="true"]');
    if (fontLink) fontLink.href = themeFontUrl(active);
    const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (favicon) favicon.href = active.faviconUrl ?? "/favicon.svg";
  }, [active, pathname]);
  const variables = themeCssVariables(active);
  const css = `:root:not(.dark){${Object.entries(variables).map(([key, value]) => `${key}:${value};`).join("")}}`;
  return <PublishedThemeContext.Provider value={active}><style>{pathname.startsWith("/admin") ? "" : css}</style>{children}</PublishedThemeContext.Provider>;
}
