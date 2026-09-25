import { createFileRoute } from "@tanstack/react-router";
import { V2_NOINDEX } from "@/components/design-v2/V2Shell";
import { AccountOverview } from "@/components/account/pages/AccountOverview";

// V2 preview: same page component + same server functions as /account — presentation only.
export const Route = createFileRoute("/account/")({
  head: () => ({ meta: [{ title: "V2 preview — Hesabım" }, ...V2_NOINDEX] }),
  component: AccountOverview,
});
