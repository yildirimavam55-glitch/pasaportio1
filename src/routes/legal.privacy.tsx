import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal/LegalPage";
export const Route = createFileRoute("/legal/privacy")({
  head: () => ({ meta: [
    { title: "Privacy Policy — Travely" },
    { name: "description", content: "How Travely handles account, order, service and communication data." },
    { property: "og:title", content: "Privacy Policy — Travely" },
    { property: "og:description", content: "How Travely handles account, order, service and communication data." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: () => <LegalPage documentId="privacy" />,
});
