import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal/LegalPage";
export const Route = createFileRoute("/legal/imprint")({
  head: () => ({ meta: [
    { title: "Legal Notice — Travely" },
    { name: "description", content: "Travely provider and legal identity information." },
    { property: "og:title", content: "Legal Notice — Travely" },
    { property: "og:description", content: "Travely provider and legal identity information." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: () => <LegalPage documentId="imprint" />,
});
