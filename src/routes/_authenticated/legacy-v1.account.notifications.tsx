import { createFileRoute } from "@tanstack/react-router";

import { NotificationsPage } from "@/components/account/pages/NotificationsPage";

export const Route = createFileRoute("/_authenticated/legacy-v1/account/notifications")({
  head: () => ({
    meta: [
      { title: "Bildirimler — Travely" },
      { name: "description", content: "Sipariş bildirimleri ile kampanya izinlerini ayır ve yönet." },
      { property: "og:title", content: "Bildirimler — Travely" },
      {
        property: "og:description",
        content: "Sipariş bildirimleri ile kampanya izinlerini ayır ve yönet.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NotificationsPage,
});
