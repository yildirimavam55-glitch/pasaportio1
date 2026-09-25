import { createFileRoute, Navigate } from "@tanstack/react-router";
import { EsimHomePage, validateEsimSearch } from "@/components/design-v2/pages/EsimHomePage";
import { v2PageQuery } from "@/components/design-v2/V2Sections";

// Primary storefront (V2). Legacy V1 lives at /legacy-v1 (admin-only, noindex).
export const Route = createFileRoute("/")({
  validateSearch: (s) => validateEsimSearch(s),
  loader: ({ context }) => context.queryClient.ensureQueryData(v2PageQuery("esim")),
  head: () => ({
    meta: [
      { title: "travely | eSIM, Lounge & Vignette" },
      { name: "description", content: "Seyahatiniz için eSIM paketleri, havalimanı Lounge ve Vignette tek yerde." },
      { property: "og:title", content: "travely | eSIM, Lounge & Vignette" },
      { property: "og:description", content: "Seyahatiniz için eSIM paketleri, havalimanı Lounge ve Vignette tek yerde." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://wanderlust-core.lovable.app/tr" }],
  }),
  component: Page,
});

function Page() {
  const { service } = Route.useSearch();
  if (service === "lounge") return <Navigate to="/lounge" replace />;
  return <EsimHomePage />;
}
