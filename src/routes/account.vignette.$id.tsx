import { createFileRoute } from "@tanstack/react-router";
import { V2_NOINDEX } from "@/components/design-v2/V2Shell";
import { VignetteDetailPage } from "@/components/account/pages/ServicePurchasePages";

export const Route = createFileRoute("/account/vignette/$id")({
  validateSearch: (s: Record<string, unknown>): { demo?: number } => (s["demo"] === "1" || s["demo"] === 1 ? { demo: 1 } : {}),
  head: () => ({ meta: [{ title: "Vignette details | Pasaport.io" }, { name: "description", content: "Vignette details in your Pasaport.io account." }, { property: "og:title", content: "Vignette details | Pasaport.io" }, { property: "og:description", content: "Vignette details in your Pasaport.io account." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, ...V2_NOINDEX] }),
  component: Page,
});
function Page() { const { id } = Route.useParams(); return <VignetteDetailPage id={id} />; }
