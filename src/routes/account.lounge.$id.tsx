import { createFileRoute } from "@tanstack/react-router";
import { V2_NOINDEX } from "@/components/design-v2/V2Shell";
import { LoungeDetailPage } from "@/components/account/pages/ServicePurchasePages";

export const Route = createFileRoute("/account/lounge/$id")({
  validateSearch: (s: Record<string, unknown>): { demo?: number } => (s["demo"] === "1" || s["demo"] === 1 ? { demo: 1 } : {}),
  head: () => ({ meta: [{ title: "Lounge details | Pasaport.io" }, { name: "description", content: "Lounge details in your Pasaport.io account." }, { property: "og:title", content: "Lounge details | Pasaport.io" }, { property: "og:description", content: "Lounge details in your Pasaport.io account." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, ...V2_NOINDEX] }),
  component: Page,
});
function Page() { const { id } = Route.useParams(); return <LoungeDetailPage id={id} />; }
