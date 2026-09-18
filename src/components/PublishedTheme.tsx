import { useQuery } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import { getPublishedTheme } from "@/lib/admin-theme.functions";
import { themeCssVariables } from "@/domain/theme/config";

/**
 * Applies the PUBLISHED theme to the customer site.
 * The admin area keeps the built-in petrol system so theme edits can never
 * make the control center unreadable.
 */
export function PublishedTheme() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const theme = useQuery({ queryKey: ["published-theme"], queryFn: () => getPublishedTheme(), staleTime: 5 * 60 * 1000 });
  if (pathname.startsWith("/admin") || !theme.data) return null;

  const variables = themeCssVariables(theme.data);
  const css = `:root{${Object.entries(variables).map(([key, value]) => `${key}:${value};`).join("")}}`;
  return <style>{css}</style>;
}
