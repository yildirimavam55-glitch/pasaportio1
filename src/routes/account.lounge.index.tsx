import { createFileRoute } from "@tanstack/react-router";
import { V2_NOINDEX } from "@/components/design-v2/V2Shell";
import { LoungeListPage } from "@/components/account/pages/ServicePurchasePages";

export const Route = createFileRoute("/account/lounge/")({
  validateSearch: (s: Record<string, unknown>): { demo?: number } => (s["demo"] === "1" || s["demo"] === 1 ? { demo: 1 } : {}),
  head: () => ({ meta: [{ title: "My lounge access | Pasaport.io" }, { name: "description", content: "My lounge access in your Pasaport.io account." }, { property: "og:title", content: "My lounge access | Pasaport.io" }, { property: "og:description", content: "My lounge access in your Pasaport.io account." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, ...V2_NOINDEX] }),
  component: LoungeListPage,
});

