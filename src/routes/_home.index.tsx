import { createFileRoute, Navigate } from "@tanstack/react-router";
import { validateEsimSearch } from "@/components/design-v2/pages/EsimHomePage";

// Primary storefront (V2). Legacy V1 lives at /legacy-v1 (admin-only, noindex).
export const Route = createFileRoute("/_home/")({
  validateSearch: (s) => validateEsimSearch(s),
  head: () => ({
    meta: [
      { title: "travely | eSIM, Lounge & Vignette" },
      { name: "description", content: "Seyahatiniz için eSIM paketleri, havalimanı Lounge ve Vignette tek yerde." },
      { property: "og:title", content: "travely | eSIM, Lounge & Vignette" },
      { property: "og:description", content: "Seyahatiniz için eSIM paketleri, havalimanı Lounge ve Vignette tek yerde." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://wanderpath-engine.lovable.app/tr" }],
  }),
  component: Page,
});

function Page() {
  const { service } = Route.useSearch();
  if (service === "lounge") return <Navigate to="/lounge" replace />;
  // The page itself lives in the shared _home layout so a language switch never remounts it.
  return null;
}
