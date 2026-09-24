import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import { SeoGuideHub, seoHubHead, seoHubQuery } from "@/components/seo/SeoGuideHub";

export const Route = createFileRoute("/tr/rehber/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(seoHubQuery("tr")),
  head: ({ loaderData }) => seoHubHead("tr", loaderData),
  component: Page,
});

function Page() {
  const { data } = useSuspenseQuery(seoHubQuery("tr"));
  return <SeoGuideHub locale="tr" data={data} />;
}
