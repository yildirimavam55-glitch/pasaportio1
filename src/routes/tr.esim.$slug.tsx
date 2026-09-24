import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { resolveSlugAlias } from "@/domain/seo/paths";
import { useSuspenseQuery } from "@tanstack/react-query";

import { SeoContentPage, SeoMissing } from "@/components/seo/SeoContentPage";
import { seoHead, seoPageQuery } from "@/components/seo/seo-route";

export const Route = createFileRoute("/tr/esim/$slug")({
  beforeLoad: ({ params }) => {
    const alias = resolveSlugAlias("tr", "esim", params.slug);
    if (alias) throw redirect({ href: `/tr/esim/${alias}`, statusCode: 301 });
  },
  loader: async ({ context, params }) => {
    const page = await context.queryClient.ensureQueryData(seoPageQuery("tr", "esim", params.slug));
    if (!page) throw notFound();
    return page;
  },
  head: ({ loaderData }) => seoHead(loaderData),
  notFoundComponent: () => <SeoMissing locale="tr" />,
  errorComponent: () => <SeoMissing locale="tr" />,
  component: Page,
});

function Page() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(seoPageQuery("tr", "esim", slug));
  if (!data) return <SeoMissing locale="tr" />;
  return <SeoContentPage page={data} />;
}
