import { createFileRoute } from "@tanstack/react-router";

import { SecurityPage } from "@/components/account/pages/SecurityPage";

export const Route = createFileRoute("/_authenticated/account/security")({
  head: () => ({
    meta: [
      { title: "Güvenlik — Travely" },
      { name: "description", content: "Şifre değişikliği ve hesabına bağlı giriş yöntemleri." },
      { property: "og:title", content: "Güvenlik — Travely" },
      { property: "og:description", content: "Şifre değişikliği ve hesabına bağlı giriş yöntemleri." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SecurityPage,
});
