import { createFileRoute } from "@tanstack/react-router";

import { ProfilePage } from "@/components/account/pages/ProfilePage";

export const Route = createFileRoute("/_authenticated/legacy-v1/account/profile")({
  head: () => ({
    meta: [
      { title: "Profil ve hesap — Travely" },
      { name: "description", content: "Kişisel bilgilerini, dilini ve hesap yönetimini düzenle." },
      { property: "og:title", content: "Profil ve hesap — Travely" },
      {
        property: "og:description",
        content: "Kişisel bilgilerini, dilini ve hesap yönetimini düzenle.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProfilePage,
});
