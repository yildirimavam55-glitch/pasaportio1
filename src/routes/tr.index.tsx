import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useI18n } from "@/i18n";
import { EsimHomePage, validateEsimSearch } from "@/components/design-v2/pages/EsimHomePage";
import { v2PageQuery } from "@/components/design-v2/V2Sections";

// Primary storefront (V2). Legacy V1 lives at /legacy-v1 (admin-only, noindex).
export const Route = createFileRoute("/tr/")({
  validateSearch: (s) => validateEsimSearch(s),
  loader: ({ context }) => context.queryClient.ensureQueryData(v2PageQuery("esim")),
  head: () => ({
    meta: [
      { title: "Travely Türkiye | eSIM ve Havalimanı Lounge" },
      { name: "description", content: "Seyahatiniz için eSIM paketlerini ve havalimanı lounge seçeneklerini keşfedin." },
      { property: "og:title", content: "Travely Türkiye | eSIM ve Havalimanı Lounge" },
      { property: "og:description", content: "Seyahatiniz için eSIM paketlerini ve havalimanı lounge seçeneklerini keşfedin." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://wanderpath-engine.lovable.app/tr" }],
  }),
  component: Page,
});

function Page() {
  const { locale, setLocale } = useI18n();
  useEffect(() => { if (locale !== "tr") setLocale("tr", { persist: false }); }, [locale, setLocale]);
  const { service } = Route.useSearch();
  if (service === "lounge") return <Navigate to="/lounge" replace />;
  return <EsimHomePage />;
}
