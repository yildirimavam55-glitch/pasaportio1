import { createFileRoute } from "@tanstack/react-router";
import { V2_NOINDEX } from "@/components/design-v2/V2Shell";
import { SecurityPage } from "@/components/account/pages/SecurityPage";

// Primary V2 storefront: same page component + same server functions as /account — presentation only.
export const Route = createFileRoute("/account/security")({
  head: () => ({ meta: [{ title: "Hesabım | travely" }, ...V2_NOINDEX] }),
  component: SecurityPage,
});
