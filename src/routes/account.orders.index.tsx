import { createFileRoute } from "@tanstack/react-router";
import { V2_NOINDEX } from "@/components/design-v2/V2Shell";
import { OrdersPage } from "@/components/account/pages/OrdersPage";

// V2 preview: same page component + same server functions as /account — presentation only.
export const Route = createFileRoute("/account/orders/")({
  head: () => ({ meta: [{ title: "V2 preview — Hesabım" }, ...V2_NOINDEX] }),
  component: OrdersPage,
});
