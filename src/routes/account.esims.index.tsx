import { createFileRoute } from "@tanstack/react-router";
import { V2_NOINDEX } from "@/components/design-v2/V2Shell";
import { EsimsPage } from "@/components/account/pages/EsimsPage";

// Primary V2 storefront: same page component + same server functions as /account — presentation only.
export const Route = createFileRoute("/account/esims/")({
  validateSearch: (search: Record<string, unknown>): { demo?: number } => search["demo"] === "1" || search["demo"] === 1 ? { demo: 1 } : {},
  head: () => ({ meta: [{ title: "My eSIMs | Pasaport.io" }, { name: "description", content: "Your personal eSIM packages and installation details." }, { property: "og:title", content: "My eSIMs | Pasaport.io" }, { property: "og:description", content: "Manage your personal eSIM packages." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, ...V2_NOINDEX] }),
  component: EsimsPage,
});
