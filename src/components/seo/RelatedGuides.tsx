/** Related guides below commercial packages — never above them. Only published, indexable, same-language content. */
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Clock3 } from "lucide-react";

import { SeoPathLink } from "@/components/seo/SeoPathLink";
import { guideHubPath } from "@/domain/seo/paths";
import type { Locale } from "@/domain/enums";
import { getCommercialGuides } from "@/lib/seo-relations.functions";

const COPY: Record<Locale, { title: string; read: string; all: string; min: string }> = {
  tr: { title: "İlgili rehberler", read: "Rehberi oku", all: "Tüm rehberler", min: "dk" },
  de: { title: "Passende Ratgeber", read: "Ratgeber lesen", all: "Alle Ratgeber", min: "Min." },
  en: { title: "Related guides", read: "Read guide", all: "View all guides", min: "min" },
};

export function RelatedGuides({ iso, locale }: { iso: string; locale: Locale }) {
  const c = COPY[locale];
  const { data = [] } = useQuery({
    queryKey: ["commercial-guides", locale, iso],
    queryFn: () => getCommercialGuides({ data: { locale, iso } }),
    staleTime: 5 * 60_000,
  });
  if (!data.length) return null;
  return (
    <section aria-labelledby="related-guides-title" data-testid="related-guides" className="mt-6 min-w-0 lg:mt-12">
      <div className="flex items-end justify-between gap-3">
        <h2 id="related-guides-title" className="font-display text-base font-bold text-foreground lg:text-2xl">{c.title}</h2>
        <SeoPathLink path={guideHubPath(locale)} className="shrink-0 text-xs font-bold text-primary lg:text-sm">
          {c.all} →
        </SeoPathLink>
      </div>
      <ul className="-mx-4 mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 lg:grid-cols-4 lg:gap-4">
        {data.map((g) => (
          <li key={g.id} className="w-[72%] max-w-[17rem] shrink-0 snap-start md:w-auto md:max-w-none">
            <SeoPathLink path={g.path} className="group flex h-full flex-col overflow-hidden rounded-xl bg-card shadow-sm ring-1 ring-border transition hover:ring-primary/40">
              {g.heroImageUrl ? (
                <img src={g.heroImageUrl} alt={g.heroAlt ?? ""} width={400} height={225} loading="lazy" decoding="async" className="aspect-[16/9] w-full object-cover" />
              ) : null}
              <span className="flex flex-1 flex-col p-3">
                {g.category ? <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{g.category}</span> : null}
                <strong className="mt-0.5 line-clamp-2 text-sm leading-snug text-foreground">{g.title}</strong>
                {g.excerpt ? <span className="mt-1 line-clamp-2 text-xs text-muted-foreground">{g.excerpt}</span> : null}
                <span className="mt-auto flex items-center justify-between gap-2 pt-2 text-xs">
                  <span className="font-bold text-primary">{c.read} <ArrowRight className="inline size-3" /></span>
                  {g.readingMinutes ? <span className="flex items-center gap-1 text-muted-foreground"><Clock3 className="size-3" />{g.readingMinutes} {c.min}</span> : null}
                </span>
              </span>
            </SeoPathLink>
          </li>
        ))}
      </ul>
    </section>
  );
}
