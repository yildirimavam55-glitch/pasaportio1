/** Homepage strip: sits below the primary destination/eSIM flow, never above it. */
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";
import { listFeaturedGuides } from "@/lib/guides.functions";
import { GuideCard } from "./GuidePieces";
import { GUIDES_COPY } from "./copy";

export function GuidesStrip() {
  const { locale } = useI18n();
  const copy = GUIDES_COPY[locale];
  const { data } = useQuery({
    queryKey: ["guides", "featured", locale],
    queryFn: () => listFeaturedGuides({ data: { locale, limit: 3 } }),
    staleTime: 5 * 60 * 1000,
  });

  if (!data?.length) return null;

  return (
    <section className="mx-auto mt-10 max-w-6xl px-4 pb-12 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="font-display text-2xl font-bold sm:text-3xl">{copy.homeTitle}</h2>
        <Button asChild variant="outline" size="sm">
          <Link to="/guides" search={{ category: "" }}>
            {copy.allGuides}
            <ArrowRight />
          </Link>
        </Button>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.map((guide) => (
          <GuideCard key={guide.id} guide={guide} />
        ))}
      </div>
    </section>
  );
}
