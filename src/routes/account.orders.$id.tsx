import { createFileRoute } from "@tanstack/react-router";
import { V2_NOINDEX } from "@/components/design-v2/V2Shell";
import { OrderDetailPage } from "@/components/account/pages/OrderDetailPage";

// Primary V2 storefront: same page component + same server functions as /account — presentation only.
export const Route = createFileRoute("/account/orders/$id")({
  head: () => ({ meta: [{ title: "Hesabım | pasaport.io" }, ...V2_NOINDEX] }),
  component: V2Page,
});

function V2Page() {
  const { id } = Route.useParams();
  return <OrderDetailPage id={id} />;
}
