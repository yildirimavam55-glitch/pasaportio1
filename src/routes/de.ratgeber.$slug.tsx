import { createFileRoute, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import { SeoContentPage, SeoMissing } from "@/components/seo/SeoContentPage";
import { seoHead, seoPageQuery } from "@/components/seo/seo-route";

export const Route = createFileRoute("/de/ratgeber/$slug")({
  loader: async ({ context, params }) => {
    const page = await context.queryClient.ensureQueryData(seoPageQuery("de", "guide", params.slug));
    if (!page) throw notFound();
    return page;
  },
  head: ({ loaderData }) => seoHead(loaderData),
  notFoundComponent: () => <SeoMissing locale="de" />,
  errorComponent: () => <SeoMissing locale="de" />,
  component: Page,
});

function Page() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(seoPageQuery("de", "guide", slug));
  if (!data) return <SeoMissing locale="de" />;
  return <SeoContentPage page={data} />;
}
