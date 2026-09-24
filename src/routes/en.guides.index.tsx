import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import { SeoGuideHub, seoHubHead, seoHubQuery } from "@/components/seo/SeoGuideHub";

export const Route = createFileRoute("/en/guides/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(seoHubQuery("en")),
  head: ({ loaderData }) => seoHubHead("en", loaderData),
  component: Page,
});

function Page() {
  const { data } = useSuspenseQuery(seoHubQuery("en"));
  return <SeoGuideHub locale="en" data={data} />;
}
