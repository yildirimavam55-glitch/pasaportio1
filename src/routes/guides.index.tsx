import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useMemo } from "react";

import { PublicShell } from "@/components/travel/PublicShell";
import { GuideCard } from "@/components/guides/GuidePieces";
import { GUIDES_COPY } from "@/components/guides/copy";
import { getGuideHub } from "@/lib/guides.functions";
import { useI18n } from "@/i18n";
import type { Locale } from "@/domain/enums";

const searchSchema = z.object({
  category: fallback(z.string(), "").default(""),
});

const hubQuery = (locale: Locale) => ({
  queryKey: ["guides", "hub", locale] as const,
  queryFn: () => getGuideHub({ data: { locale } }),
});

const GUIDES_BASE_URL = "https://wanderlust-core.lovable.app/guides";

export const Route = createFileRoute("/guides/")({
  validateSearch: zodValidator(searchSchema),
  loader: ({ context }) => context.queryClient.ensureQueryData(hubQuery("tr")),
  head: () => ({
    meta: [
      { title: "Seyahat rehberleri — Travely" },
      {
        name: "description",
        content:
          "Destinasyon, internet, havalimanı, arabayla seyahat ve otoyol rehberleri: seyahatini planla, ihtiyacın olan hizmeti seç.",
      },
      { property: "og:title", content: "Seyahat rehberleri — Travely" },
      {
        property: "og:description",
        content: "Travely rehberleriyle seyahatini planla ve doğru hizmeti seç.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: GUIDES_BASE_URL }],
  }),
  component: GuidesHubPage,
});

function GuidesHubPage() {
  const { locale } = useI18n();
  const copy = GUIDES_COPY[locale];
  const search = Route.useSearch();
  const { data } = useSuspenseQuery(hubQuery(locale));

  const visible = useMemo(
    () => (search.category ? data.guides.filter((g) => g.categorySlug === search.category) : data.guides),
    [data.guides, search.category],
  );

  return (
    <PublicShell hideStickySearch>
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <nav aria-label="breadcrumb" className="text-xs text-muted-foreground">
          <Link to="/" search={{ service: "esim" }} className="hover:text-foreground">
            {copy.breadcrumbHome}
          </Link>
          <span className="px-1.5">/</span>
          <span className="font-semibold text-foreground">{copy.hubName}</span>
        </nav>
        <h1 className="mt-4 font-display text-3xl font-bold sm:text-4xl">{copy.hubTitle}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">{copy.hubLead}</p>

        <div className="mt-6 -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          <Link
            to="/guides"
            search={{ category: "" }}
            className={`shrink-0 rounded-full border px-3.5 py-2 text-xs font-bold ${
              search.category ? "border-border bg-card" : "border-primary bg-primary text-primary-foreground"
            }`}
          >
            {copy.all}
          </Link>
          {data.categories.map((category) => (
            <Link
              key={category.id}
              to="/guides"
              search={{ category: category.slug }}
              className={`shrink-0 rounded-full border px-3.5 py-2 text-xs font-bold ${
                search.category === category.slug
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card"
              }`}
            >
              {category.name}
            </Link>
          ))}
        </div>

        {visible.length ? (
          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((guide) => (
              <GuideCard key={guide.id} guide={guide} />
            ))}
          </div>
        ) : (
          <p className="mt-10 rounded-2xl border border-dashed border-border bg-secondary/40 p-6 text-sm text-muted-foreground">
            {data.guides.length ? copy.empty : copy.emptyHub}
          </p>
        )}
      </main>
    </PublicShell>
  );
}
