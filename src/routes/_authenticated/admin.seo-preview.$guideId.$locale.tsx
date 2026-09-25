import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { SeoContentPage } from "@/components/seo/SeoContentPage";
import { getSeoPreview } from "@/lib/seo-content.functions";

/**
 * Admin-only draft preview. Data is fetched client-side through an
 * admin-verified server function (never in a loader), and the page is always
 * noindex,nofollow with no canonical or hreflang.
 */
export const Route = createFileRoute("/_authenticated/admin/seo-preview/$guideId/$locale")({
  head: () => ({
    meta: [
      { title: "Önizleme — Travely Admin" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "googlebot", content: "noindex, nofollow" },
    ],
  }),
  component: PreviewPage,
});

function PreviewPage() {
  const { guideId, locale } = Route.useParams();
  const fetchPreview = useServerFn(getSeoPreview);
  const query = useQuery({
    queryKey: ["seo-preview", guideId, locale],
    queryFn: () => fetchPreview({ data: { guideId, locale } }),
    retry: false,
  });

  if (query.isLoading) return <p className="p-6 text-sm text-muted-foreground">Önizleme yükleniyor…</p>;
  if (query.isError || !query.data) {
    return (
      <div className="p-6 text-sm">
        <p className="font-semibold">Önizleme açılamadı.</p>
        <p className="mt-1 text-muted-foreground">Yönetici yetkisi gerekir veya bu dil sürümü yok.</p>
      </div>
    );
  }
  const page = query.data;
  return (
    <>
      <div
        role="status"
        className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-2 border-b border-border bg-accent px-4 py-2 text-xs font-semibold text-accent-foreground"
      >
        <span>
          ÖNİZLEME · {page.status} · {locale.toUpperCase()} · herkese açık değil
        </span>
        <span className="flex items-center gap-3">
          {(["tr", "de", "en"] as const)
            .filter((l) => l !== locale)
            .map((l) => (
              <Link key={l} to="/admin/seo-preview/$guideId/$locale" params={{ guideId, locale: l }} className="underline">
                {l.toUpperCase()}
              </Link>
            ))}
          <Link to="/admin/content/seo" className="underline">
            Geri
          </Link>
        </span>
      </div>
      <SeoContentPage page={page} />
    </>
  );
}
