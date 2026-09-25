import { createFileRoute, useSearch } from "@tanstack/react-router";

import { AuthPage } from "@/components/auth/AuthPage";

type AuthSearch = { redirect?: string | undefined };

export const Route = createFileRoute("/_authenticated/legacy-v1/auth")({
  validateSearch: (search: Record<string, unknown>): AuthSearch => ({
    redirect: typeof search["redirect"] === "string" ? search["redirect"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Giriş yap | travely" },
      { name: "description", content: "Seyahatlerinize ulaşmak için giriş yapın veya hesap oluşturun." },
      { property: "og:title", content: "Giriş yap | travely" },
      { property: "og:description", content: "Seyahat hesabınıza güvenle giriş yapın." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RoutePage,
});

function RoutePage() {
  const search = useSearch({ from: "/auth" });
  return <AuthPage redirect={search.redirect} />;
}
