import { createFileRoute } from "@tanstack/react-router";

import { OrderDetailPage } from "@/components/account/pages/OrderDetailPage";

export const Route = createFileRoute("/_authenticated/account/orders/$id")({
  head: () => ({
    meta: [
      { title: "Sipariş detayı — Travely" },
      { name: "description", content: "Sipariş kalemleri, tutarlar ve eSIM teslim durumu." },
      { property: "og:title", content: "Sipariş detayı — Travely" },
      { property: "og:description", content: "Sipariş kalemleri, tutarlar ve eSIM teslim durumu." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RoutePage,
});

function RoutePage() {
  const { id } = Route.useParams();
  return <OrderDetailPage id={id} />;
}
