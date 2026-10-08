import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useI18n } from "@/i18n";
import { validateEsimSearch } from "@/components/design-v2/pages/EsimHomePage";

// Primary storefront (V2). Legacy V1 lives at /legacy-v1 (admin-only, noindex).
export const Route = createFileRoute("/_home/de/")({
  validateSearch: (s) => validateEsimSearch(s),
  head: () => ({
    meta: [
      { title: "Pasaport.io | eSIM & Flughafen-Lounge" },
      { name: "description", content: "Entdecke eSIM-Pakete und Flughafen-Lounges für deine Reise." },
      { property: "og:title", content: "Pasaport.io | eSIM & Flughafen-Lounge" },
      { property: "og:description", content: "Entdecke eSIM-Pakete und Flughafen-Lounges für deine Reise." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://wanderpath-engine.lovable.app/de" }],
  }),
  component: Page,
});

function Page() {
  const { locale, setLocale } = useI18n();
  // URL locale applies on entry only; a later manual switch must not be reverted.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (locale !== "de") setLocale("de", { persist: false }); }, []);
  const { service } = Route.useSearch();
  if (service === "lounge") return <Navigate to="/lounge" replace />;
  // The page itself lives in the shared _home layout so a language switch never remounts it.
  return null;
}
