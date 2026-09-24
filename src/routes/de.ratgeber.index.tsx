import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import { SeoGuideHub, seoHubHead, seoHubQuery } from "@/components/seo/SeoGuideHub";

export const Route = createFileRoute("/de/ratgeber/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(seoHubQuery("de")),
  head: ({ loaderData }) => seoHubHead("de", loaderData),
  component: Page,
});

function Page() {
  const { data } = useSuspenseQuery(seoHubQuery("de"));
  return <SeoGuideHub locale="de" data={data} />;
}
