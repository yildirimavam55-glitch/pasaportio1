import { createFileRoute, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import { SeoContentPage, SeoMissing } from "@/components/seo/SeoContentPage";
import { seoHead, seoPageQuery } from "@/components/seo/seo-route";

export const Route = createFileRoute("/tr/rehber/$slug")({
  loader: async ({ context, params }) => {
    const page = await context.queryClient.ensureQueryData(seoPageQuery("tr", "guide", params.slug));
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
  const { data } = useSuspenseQuery(seoPageQuery("tr", "guide", slug));
  if (!data) return <SeoMissing locale="tr" />;
  return <SeoContentPage page={data} />;
}
