import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal/LegalPage";
export const Route = createFileRoute("/legal/terms")({
  head: () => ({ meta: [
    { title: "Terms & Conditions — pasaport.io" },
    { name: "description", content: "pasaport.io terms for eSIM, Lounge and Vignette services." },
    { property: "og:title", content: "Terms & Conditions — pasaport.io" },
    { property: "og:description", content: "pasaport.io terms for eSIM, Lounge and Vignette services." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: () => <LegalPage documentId="terms" />,
});
