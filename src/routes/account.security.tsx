import { createFileRoute } from "@tanstack/react-router";
import { V2_NOINDEX } from "@/components/design-v2/V2Shell";
import { SecurityPage } from "@/components/account/pages/SecurityPage";

// Primary V2 storefront: same page component + same server functions as /account — presentation only.
export const Route = createFileRoute("/account/security")({
  head: () => ({ meta: [{ title: "Account security | Pasaport.io" }, { name: "description", content: "Manage your Pasaport.io account security." }, { property: "og:title", content: "Account security | Pasaport.io" }, { property: "og:description", content: "Manage your Pasaport.io account security." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, ...V2_NOINDEX] }),
  component: SecurityPage,
});
