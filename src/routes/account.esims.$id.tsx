import { createFileRoute } from "@tanstack/react-router";
import { V2_NOINDEX } from "@/components/design-v2/V2Shell";
import { EsimDetailPage } from "@/components/account/pages/EsimDetailPage";

// Primary V2 storefront: same page component + same server functions as /account — presentation only.
export const Route = createFileRoute("/account/esims/$id")({
  validateSearch: (s: Record<string, unknown>): { demo?: number } => (s["demo"] === "1" || s["demo"] === 1 ? { demo: 1 } : {}),
  head: () => ({ meta: [{ title: "eSIM package details | Pasaport.io" }, { name: "description", content: "Your eSIM usage, installation guide and account support." }, { property: "og:title", content: "eSIM package details | Pasaport.io" }, { property: "og:description", content: "View your eSIM package and installation options securely." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, ...V2_NOINDEX] }),
  component: V2Page,
});

function V2Page() {
  const { id } = Route.useParams();
  return <EsimDetailPage id={id} />;
}
