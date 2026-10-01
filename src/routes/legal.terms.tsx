import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal/LegalPage";
export const Route = createFileRoute("/legal/terms")({
  head: () => ({ meta: [
    { title: "Terms & Conditions — Travely" },
    { name: "description", content: "Travely terms for eSIM, Lounge and Vignette services." },
    { property: "og:title", content: "Terms & Conditions — Travely" },
    { property: "og:description", content: "Travely terms for eSIM, Lounge and Vignette services." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: () => <LegalPage documentId="terms" />,
});
