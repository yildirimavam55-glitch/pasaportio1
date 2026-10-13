import { createFileRoute } from "@tanstack/react-router";
import { V2_NOINDEX } from "@/components/design-v2/V2Shell";
import { OrdersPage } from "@/components/account/pages/OrdersPage";

// Primary V2 storefront: same page component + same server functions as /account — presentation only.
export const Route = createFileRoute("/account/orders/")({
  head: () => ({ meta: [{ title: "Order history | Pasaport.io" }, { name: "description", content: "View your Pasaport.io order history." }, { property: "og:title", content: "Order history | Pasaport.io" }, { property: "og:description", content: "View your Pasaport.io order history." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, ...V2_NOINDEX] }),
  component: OrdersPage,
});
