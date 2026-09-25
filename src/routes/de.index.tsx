import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useI18n } from "@/i18n";
import { EsimHomePage, validateEsimSearch } from "@/components/design-v2/pages/EsimHomePage";
import { v2PageQuery } from "@/components/design-v2/V2Sections";

// Primary storefront (V2). Legacy V1 lives at /legacy-v1 (admin-only, noindex).
export const Route = createFileRoute("/de/")({
  validateSearch: (s) => validateEsimSearch(s),
  loader: ({ context }) => context.queryClient.ensureQueryData(v2PageQuery("esim")),
  head: () => ({
    meta: [
      { title: "Travely | eSIM & Flughafen-Lounge" },
      { name: "description", content: "Entdecke eSIM-Pakete und Flughafen-Lounges für deine Reise." },
      { property: "og:title", content: "Travely | eSIM & Flughafen-Lounge" },
      { property: "og:description", content: "Entdecke eSIM-Pakete und Flughafen-Lounges für deine Reise." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://wanderlust-core.lovable.app/de" }],
  }),
  component: Page,
});

function Page() {
  const { locale, setLocale } = useI18n();
  useEffect(() => { if (locale !== "de") setLocale("de"); }, [locale, setLocale]);
  const { service } = Route.useSearch();
  if (service === "lounge") return <Navigate to="/lounge" replace />;
  return <EsimHomePage />;
}
