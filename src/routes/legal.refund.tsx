import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal/LegalPage";
export const Route = createFileRoute("/legal/refund")({
  head: () => ({ meta: [
    { title: "Refund Policy — Travely" },
    { name: "description", content: "Refund terms for eligible unused Travely eSIM purchases." },
    { property: "og:title", content: "Refund Policy — Travely" },
    { property: "og:description", content: "Refund terms for eligible unused Travely eSIM purchases." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: () => <LegalPage documentId="refund" />,
});
