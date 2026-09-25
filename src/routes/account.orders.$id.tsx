import { createFileRoute } from "@tanstack/react-router";
import { V2_NOINDEX } from "@/components/design-v2/V2Shell";
import { OrderDetailPage } from "@/components/account/pages/OrderDetailPage";

// V2 preview: same page component + same server functions as /account — presentation only.
export const Route = createFileRoute("/design-v2/account/orders/$id")({
  head: () => ({ meta: [{ title: "V2 preview — Hesabım" }, ...V2_NOINDEX] }),
  component: V2Page,
});

function V2Page() {
  const { id } = Route.useParams();
  return <OrderDetailPage id={id} />;
}
