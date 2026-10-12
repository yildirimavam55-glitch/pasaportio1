import { createFileRoute, Navigate } from "@tanstack/react-router";
import { EsimHomePage, validateEsimSearch } from "@/components/design-v2/pages/EsimHomePage";
import { v2PageQuery } from "@/components/design-v2/V2Sections";

// Primary storefront (V2). Legacy V1 lives at /legacy-v1 (admin-only, noindex).
export const Route = createFileRoute("/esim/")({
  validateSearch: (s) => validateEsimSearch(s),
  loader: ({ context }) => context.queryClient.ensureQueryData(v2PageQuery("esim")),
  head: () => ({
    meta: [
      { title: "Seyahat eSIM’i | pasaport.io" },
      { name: "description", content: "Ülkene veya bölgene uygun gerçek eSIM paketlerini seç ve hemen sepete ekle." },
      { property: "og:title", content: "Seyahat eSIM’i | pasaport.io" },
      { property: "og:description", content: "Ülkene veya bölgene uygun gerçek eSIM paketlerini seç ve hemen sepete ekle." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://wanderpath-engine.lovable.app/esim" }],
  }),
  component: Page,
});

function Page() {
  const { service } = Route.useSearch();
  if (service === "lounge") return <Navigate to="/lounge" replace />;
  return <EsimHomePage />;
}
