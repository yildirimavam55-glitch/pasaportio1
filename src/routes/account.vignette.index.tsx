import { createFileRoute } from "@tanstack/react-router";
import { V2_NOINDEX } from "@/components/design-v2/V2Shell";
import { VignetteListPage } from "@/components/account/pages/ServicePurchasePages";

export const Route = createFileRoute("/account/vignette/")({
  validateSearch: (s: Record<string, unknown>): { demo?: number } => (s["demo"] === "1" || s["demo"] === 1 ? { demo: 1 } : {}),
  head: () => ({ meta: [{ title: "My vignettes | Pasaport.io" }, { name: "description", content: "My vignettes in your Pasaport.io account." }, { property: "og:title", content: "My vignettes | Pasaport.io" }, { property: "og:description", content: "My vignettes in your Pasaport.io account." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, ...V2_NOINDEX] }),
  component: VignetteListPage,
});

