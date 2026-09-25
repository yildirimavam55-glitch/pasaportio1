import { createFileRoute } from "@tanstack/react-router";
import { PublicSupportPage } from "@/components/support/PublicSupportPage";
import { V2_NOINDEX } from "@/components/design-v2/V2Shell";

// Same support page as /destek (WhatsApp first), rendered in V2.
export const Route = createFileRoute("/destek")({
  head: () => ({ meta: [{ title: "Destek | travely" }, ...V2_NOINDEX] }),
  component: PublicSupportPage,
});
