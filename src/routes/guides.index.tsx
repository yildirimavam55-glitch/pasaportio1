import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy hub → final localized hub (single permanent redirect). */
export const Route = createFileRoute("/guides/")({
  beforeLoad: () => {
    throw redirect({ href: "/tr/rehber", statusCode: 301 });
  },
});
