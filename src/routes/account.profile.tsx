import { createFileRoute } from "@tanstack/react-router";
import { V2_NOINDEX } from "@/components/design-v2/V2Shell";
import { ProfilePage } from "@/components/account/pages/ProfilePage";

// Primary V2 storefront: same page component + same server functions as /account — presentation only.
export const Route = createFileRoute("/account/profile")({
  head: () => ({ meta: [{ title: "Profile settings | Pasaport.io" }, { name: "description", content: "Manage your personal Pasaport.io profile." }, { property: "og:title", content: "Profile settings | Pasaport.io" }, { property: "og:description", content: "Manage your personal Pasaport.io profile." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, ...V2_NOINDEX] }),
  component: ProfilePage,
});
