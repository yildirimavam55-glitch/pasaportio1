import { createFileRoute } from "@tanstack/react-router";

import { EsimsPage } from "@/components/account/pages/EsimsPage";

export const Route = createFileRoute("/_authenticated/account/esims/")({
  head: () => ({
    meta: [
      { title: "eSIM'lerim — Travely" },
      { name: "description", content: "Satın aldığın eSIM'lerin durumu, kullanımı ve kurulumu." },
      { property: "og:title", content: "eSIM'lerim — Travely" },
      {
        property: "og:description",
        content: "Satın aldığın eSIM'lerin durumu, kullanımı ve kurulumu.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EsimsPage,
});
