import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy hub → final localized hub (single permanent redirect). */
export const Route = createFileRoute("/rehberler/")({
  beforeLoad: () => {
    throw redirect({ href: "/tr/rehber", statusCode: 301 });
  },
});
