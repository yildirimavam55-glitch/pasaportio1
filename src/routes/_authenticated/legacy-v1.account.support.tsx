import { createFileRoute } from "@tanstack/react-router";

import { SupportPage } from "@/components/account/pages/SupportPage";

export const Route = createFileRoute("/_authenticated/legacy-v1/account/support")({
  head: () => ({
    meta: [
      { title: "Destek — Travely" },
      { name: "description", content: "eSIM kurulumu, bağlantı ve sipariş konularında yardım al." },
      { property: "og:title", content: "Destek — Travely" },
      {
        property: "og:description",
        content: "eSIM kurulumu, bağlantı ve sipariş konularında yardım al.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SupportPage,
});
