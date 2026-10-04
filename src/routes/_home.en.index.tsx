import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useI18n } from "@/i18n";
import { validateEsimSearch } from "@/components/design-v2/pages/EsimHomePage";

// Primary storefront (V2). Legacy V1 lives at /legacy-v1 (admin-only, noindex).
export const Route = createFileRoute("/_home/en/")({
  validateSearch: (s) => validateEsimSearch(s),
  head: () => ({
    meta: [
      { title: "Travely | eSIM & Airport Lounge" },
      { name: "description", content: "Discover travel eSIM plans and airport lounges for your trip." },
      { property: "og:title", content: "Travely | eSIM & Airport Lounge" },
      { property: "og:description", content: "Discover travel eSIM plans and airport lounges for your trip." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://wanderpath-engine.lovable.app/en" }],
  }),
  component: Page,
});

function Page() {
  const { locale, setLocale } = useI18n();
  // URL locale applies on entry only; a later manual switch must not be reverted.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (locale !== "en") setLocale("en", { persist: false }); }, []);
  const { service } = Route.useSearch();
  if (service === "lounge") return <Navigate to="/lounge" replace />;
  // The page itself lives in the shared _home layout so a language switch never remounts it.
  return null;
}
