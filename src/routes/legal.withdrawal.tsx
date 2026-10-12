import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal/LegalPage";
export const Route = createFileRoute("/legal/withdrawal")({
  head: () => ({ meta: [
    { title: "Withdrawal Information — pasaport.io" },
    { name: "description", content: "Withdrawal information for pasaport.io services." },
    { property: "og:title", content: "Withdrawal Information — pasaport.io" },
    { property: "og:description", content: "Withdrawal information for pasaport.io services." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: () => <LegalPage documentId="withdrawal" />,
});
