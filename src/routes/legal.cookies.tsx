import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal/LegalPage";
export const Route = createFileRoute("/legal/cookies")({
  head: () => ({ meta: [
    { title: "Cookies & Privacy Settings — Travely" },
    { name: "description", content: "Information about essential, functional, analytics and marketing storage." },
    { property: "og:title", content: "Cookies & Privacy Settings — Travely" },
    { property: "og:description", content: "Information about essential, functional, analytics and marketing storage." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: () => <LegalPage documentId="cookies" />,
});
