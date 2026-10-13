import { createFileRoute } from "@tanstack/react-router";
import { V2_NOINDEX } from "@/components/design-v2/V2Shell";
import { NotificationsPage } from "@/components/account/pages/NotificationsPage";

// Primary V2 storefront: same page component + same server functions as /account — presentation only.
export const Route = createFileRoute("/account/notifications")({
  head: () => ({ meta: [{ title: "Notification preferences | Pasaport.io" }, { name: "description", content: "Manage your account notification preferences." }, { property: "og:title", content: "Notification preferences | Pasaport.io" }, { property: "og:description", content: "Manage your account notification preferences." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, ...V2_NOINDEX] }),
  component: NotificationsPage,
});
