import { createFileRoute } from "@tanstack/react-router";
import { V2_NOINDEX } from "@/components/design-v2/V2Shell";
import { EsimsPage } from "@/components/account/pages/EsimsPage";

// V2 preview: same page component + same server functions as /account — presentation only.
export const Route = createFileRoute("/design-v2/account/esims/")({
  head: () => ({ meta: [{ title: "V2 preview — Hesabım" }, ...V2_NOINDEX] }),
  component: EsimsPage,
});
