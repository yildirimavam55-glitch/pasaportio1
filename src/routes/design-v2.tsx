import { createFileRoute, Outlet } from "@tanstack/react-router";
import { V2_NOINDEX } from "@/components/design-v2/V2Shell";
import { V2Context } from "@/components/design-v2/v2-context";

// Internal design preview only — never linked, never in sitemap, never indexed.
// Everything below /design-v2 renders shared customer components in V2 mode.
export const Route = createFileRoute("/design-v2")({
  head: () => ({ meta: V2_NOINDEX }),
  component: () => (
    <V2Context.Provider value={true}>
      <Outlet />
    </V2Context.Provider>
  ),
});
