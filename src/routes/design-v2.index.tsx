import { createFileRoute, Navigate } from "@tanstack/react-router";
import { V2_NOINDEX } from "@/components/design-v2/V2Shell";

export const Route = createFileRoute("/design-v2/")({
  head: () => ({
    meta: [
      { title: "Design V2 preview" },
      { name: "description", content: "Internal design preview." },
      { property: "og:title", content: "Design V2 preview" },
      { property: "og:description", content: "Internal design preview." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      ...V2_NOINDEX,
    ],
  }),
  component: () => <Navigate to="/design-v2/esim" search={{ country: "" }} replace />,
});
