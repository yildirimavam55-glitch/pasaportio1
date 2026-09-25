import { createFileRoute } from "@tanstack/react-router";

import { PublicSupportPage } from "@/components/support/PublicSupportPage";

export const Route = createFileRoute("/_authenticated/legacy-v1/destek")({
  head: () => ({
    meta: [
      { title: "Destek | Travely eSIM Yardım ve WhatsApp" },
      { name: "description", content: "Travely destek: WhatsApp, e-posta ve eSIM kurulumu için sık sorulan sorular." },
      { property: "og:title", content: "Destek | Travely eSIM Yardım ve WhatsApp" },
      { property: "og:description", content: "WhatsApp'tan bize yazın; eSIM kurulumu, siparişler ve seyahat sorularında yardım." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PublicSupportPage,
});
