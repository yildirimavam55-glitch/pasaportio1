import { createFileRoute } from "@tanstack/react-router";
import { V2_NOINDEX } from "@/components/design-v2/V2Shell";
import { NotificationsPage } from "@/components/account/pages/NotificationsPage";

// Primary V2 storefront: same page component + same server functions as /account — presentation only.
export const Route = createFileRoute("/account/notifications")({
  head: () => ({ meta: [{ title: "Hesabım | pasaport.io" }, ...V2_NOINDEX] }),
  component: NotificationsPage,
});
