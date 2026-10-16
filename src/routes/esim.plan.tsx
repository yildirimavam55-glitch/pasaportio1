import { createFileRoute } from "@tanstack/react-router";
import { SITE_URL } from "@/domain/seo/paths";
import { TripPlanner } from "@/components/design-v2/TripPlanner";
import { V2Shell } from "@/components/design-v2/V2Shell";

export const Route = createFileRoute("/esim/plan")({
  head: () => ({
    meta: [
      { title: "Seyahat planlayıcı | pasaport.io" },
      { name: "description", content: "Varış ülkelerini ve seyahat tarihlerini gir; katalogdaki gerçek eSIM paketleri senin için karşılaştırılsın." },
      { property: "og:title", content: "Seyahat planlayıcı | pasaport.io" },
      { property: "og:description", content: "Varış ülkelerini ve seyahat tarihlerini gir; katalogdaki gerçek eSIM paketleri senin için karşılaştırılsın." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/esim/plan` }],
  }),
  component: Page,
});

function Page() {
  return (
    <V2Shell service="esim">
      <TripPlanner />
    </V2Shell>
  );
}
