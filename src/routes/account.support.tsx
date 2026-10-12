import { createFileRoute } from "@tanstack/react-router";
import { V2_NOINDEX } from "@/components/design-v2/V2Shell";
import { SupportPage } from "@/components/account/pages/SupportPage";

// Primary V2 storefront: same page component + same server functions as /account — presentation only.
export const Route = createFileRoute("/account/support")({
  head: () => ({ meta: [{ title: "Hesabım | pasaport.io" }, ...V2_NOINDEX] }),
  component: SupportPage,
});
