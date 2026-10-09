import { createFileRoute } from "@tanstack/react-router";
import { V2_NOINDEX } from "@/components/design-v2/V2Shell";
import { AccountOverview } from "@/components/account/pages/AccountOverview";

// Primary V2 storefront: same page component + same server functions as /account — presentation only.
export const Route = createFileRoute("/account/")({
  validateSearch: (search: Record<string, unknown>) => ({ demo: search["demo"] === "1" || search["demo"] === 1 ? "1" : undefined }),
  head: () => ({ meta: [{ title: "My account | Pasaport.io" }, { name: "description", content: "Your Pasaport.io account, packages and orders." }, { property: "og:title", content: "My account | Pasaport.io" }, { property: "og:description", content: "Manage your packages and real orders." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, ...V2_NOINDEX] }),
  component: AccountOverview,
});
