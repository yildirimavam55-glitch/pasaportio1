import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal/LegalPage";
export const Route = createFileRoute("/legal/refund")({
  head: () => ({ meta: [
    { title: "Refund Policy — pasaport.io" },
    { name: "description", content: "Refund terms for eligible unused pasaport.io eSIM purchases." },
    { property: "og:title", content: "Refund Policy — pasaport.io" },
    { property: "og:description", content: "Refund terms for eligible unused pasaport.io eSIM purchases." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: () => <LegalPage documentId="refund" />,
});
