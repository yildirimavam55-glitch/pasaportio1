import { createFileRoute } from "@tanstack/react-router";
import { V2_NOINDEX } from "@/components/design-v2/V2Shell";
import { ProfilePage } from "@/components/account/pages/ProfilePage";

// V2 preview: same page component + same server functions as /account — presentation only.
export const Route = createFileRoute("/design-v2/account/profile")({
  head: () => ({ meta: [{ title: "V2 preview — Hesabım" }, ...V2_NOINDEX] }),
  component: ProfilePage,
});
