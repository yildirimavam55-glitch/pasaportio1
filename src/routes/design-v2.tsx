import { createFileRoute, Outlet } from "@tanstack/react-router";
import { V2_NOINDEX } from "@/components/design-v2/V2Shell";

// Internal design preview only — never linked, never in sitemap, never indexed.
export const Route = createFileRoute("/design-v2")({
  head: () => ({ meta: V2_NOINDEX }),
  component: () => <Outlet />,
});
