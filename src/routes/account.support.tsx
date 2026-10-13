import { createFileRoute } from "@tanstack/react-router";
import { V2_NOINDEX } from "@/components/design-v2/V2Shell";
import { SupportPage } from "@/components/account/pages/SupportPage";

// Primary V2 storefront: same page component + same server functions as /account — presentation only.
export const Route = createFileRoute("/account/support")({
  head: () => ({ meta: [{ title: "Support and refunds | Pasaport.io" }, { name: "description", content: "Manage support and refund requests securely." }, { property: "og:title", content: "Support and refunds | Pasaport.io" }, { property: "og:description", content: "Manage support and refund requests securely." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, ...V2_NOINDEX] }),
  component: SupportPage,
});
