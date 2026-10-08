import { createFileRoute, Navigate, notFound } from "@tanstack/react-router";
import { useEffect } from "react";
import { useI18n, isUiLocale, LOCALE_REGISTRY, type UiLocale } from "@/i18n";
import { validateEsimSearch } from "@/components/design-v2/pages/EsimHomePage";

// One locale-driven home for every registry language without its own static route
// (/tr, /de, /en keep their dedicated SEO routes). Non-indexable languages stay noindex.
export const Route = createFileRoute("/_home/$locale/")({
  validateSearch: (s) => validateEsimSearch(s),
  beforeLoad: ({ params }) => {
    if (!isUiLocale(params.locale)) throw notFound();
  },
  head: ({ params }) => {
    const meta = isUiLocale(params.locale) ? LOCALE_REGISTRY[params.locale] : null;
    const title = `Pasaport.io | eSIM${meta ? ` · ${meta.nativeName}` : ""}`;
    const description = "Travel eSIM packages for your trip.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
        ...(meta?.indexable ? [] : [{ name: "robots", content: "noindex, follow" }]),
      ],
    };
  },
  component: Page,
});

function Page() {
  const { locale: param } = Route.useParams();
  const { uiLocale, setLocale } = useI18n();
  useEffect(() => {
    if (isUiLocale(param) && uiLocale !== param) setLocale(param as UiLocale, { persist: false });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [param]);
  const { service } = Route.useSearch();
  if (service === "lounge") return <Navigate to="/lounge" replace />;
  // The page itself lives in the shared _home layout so a language switch never remounts it.
  return null;
}
