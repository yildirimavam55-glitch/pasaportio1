import { createFileRoute } from "@tanstack/react-router";

import { OrdersPage } from "@/components/account/pages/OrdersPage";

export const Route = createFileRoute("/_authenticated/legacy-v1/account/orders/")({
  head: () => ({
    meta: [
      { title: "Siparişlerim — Travely" },
      { name: "description", content: "Travely siparişlerin, tutarlar ve teslim durumları." },
      { property: "og:title", content: "Siparişlerim — Travely" },
      { property: "og:description", content: "Travely siparişlerin, tutarlar ve teslim durumları." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OrdersPage,
});
