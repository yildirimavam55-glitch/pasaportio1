import { createFileRoute, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import { SeoContentPage, SeoMissing } from "@/components/seo/SeoContentPage";
import { seoHead, seoPageQuery } from "@/components/seo/seo-route";

export const Route = createFileRoute("/en/guides/$slug")({
  loader: async ({ context, params }) => {
    const page = await context.queryClient.ensureQueryData(seoPageQuery("en", "guide", params.slug));
    if (!page) throw notFound();
    return page;
  },
  head: ({ loaderData }) => seoHead(loaderData),
  notFoundComponent: () => <SeoMissing locale="en" />,
  errorComponent: () => <SeoMissing locale="en" />,
  component: Page,
});

function Page() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(seoPageQuery("en", "guide", slug));
  if (!data) return <SeoMissing locale="en" />;
  return <SeoContentPage page={data} />;
}
