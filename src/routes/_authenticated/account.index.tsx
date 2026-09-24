import { createFileRoute } from "@tanstack/react-router";

import { AccountOverview } from "@/components/account/pages/AccountOverview";

export const Route = createFileRoute("/_authenticated/account/")({
  head: () => ({
    meta: [
      { title: "Hesabım — Travely" },
      {
        name: "description",
        content: "eSIM'lerini, siparişlerini ve hesap ayarlarını tek yerden yönet.",
      },
      { property: "og:title", content: "Hesabım — Travely" },
      {
        property: "og:description",
        content: "eSIM'lerini, siparişlerini ve hesap ayarlarını tek yerden yönet.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AccountOverview,
});
