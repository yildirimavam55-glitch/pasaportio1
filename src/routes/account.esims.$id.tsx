import { createFileRoute } from "@tanstack/react-router";
import { V2_NOINDEX } from "@/components/design-v2/V2Shell";
import { EsimDetailPage } from "@/components/account/pages/EsimDetailPage";

// Primary V2 storefront: same page component + same server functions as /account — presentation only.
export const Route = createFileRoute("/account/esims/$id")({
  validateSearch: (s: Record<string, unknown>): { demo?: number } => (s["demo"] === "1" || s["demo"] === 1 ? { demo: 1 } : {}),
  head: () => ({ meta: [{ title: "Hesabım | pasaport.io" }, ...V2_NOINDEX] }),
  component: V2Page,
});

function V2Page() {
  const { id } = Route.useParams();
  return <EsimDetailPage id={id} />;
}
