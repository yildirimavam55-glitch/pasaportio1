import { createFileRoute } from "@tanstack/react-router";
import { EsimInstallationPage } from "@/components/design-v2/EsimInstallationPage";

export const Route = createFileRoute("/esim/kurulum")({
  validateSearch: (search: Record<string, unknown>) => ({ platform: search['platform'] === "android" ? "android" as const : "ios" as const, brand: typeof search['brand'] === "string" ? search['brand'] : "" }),
  head: () => ({ meta: [
    { title: "eSIM kurulum rehberi | travely" },
    { name: "description", content: "iPhone ve Android için adım adım eSIM kurulum rehberi. Gerçek QR kodunu hesabında bul." },
    { property: "og:title", content: "eSIM kurulum rehberi | travely" },
    { property: "og:description", content: "iPhone ve Android için adım adım eSIM kurulum rehberi. Gerçek QR kodunu hesabında bul." },
    { property: "og:type", content: "article" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: () => <EsimInstallationPage initialPlatform={Route.useSearch().platform} />,
});