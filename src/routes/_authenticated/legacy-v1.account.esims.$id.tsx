import { createFileRoute } from "@tanstack/react-router";

import { EsimDetailPage } from "@/components/account/pages/EsimDetailPage";

export const Route = createFileRoute("/_authenticated/legacy-v1/account/esims/$id")({
  head: () => ({
    meta: [
      { title: "eSIM detayı — Travely" },
      { name: "description", content: "eSIM'inin durumu, kapsama listesi ve kurulum bilgileri." },
      { property: "og:title", content: "eSIM detayı — Travely" },
      {
        property: "og:description",
        content: "eSIM'inin durumu, kapsama listesi ve kurulum bilgileri.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RoutePage,
});

function RoutePage() {
  const { id } = Route.useParams();
  return <EsimDetailPage id={id} />;
}
