import { createFileRoute, redirect } from "@tanstack/react-router";
import { designV2ToPublic } from "@/domain/storefront/public-routes";

// Former V2 preview URLs → permanent redirect to the public V2 storefront URL.
export const Route = createFileRoute("/design-v2/$")({
  beforeLoad: ({ params, location }) => {
    throw redirect({ href: designV2ToPublic(`/design-v2/${params._splat ?? ""}`) + (location.searchStr ?? ""), statusCode: 301 });
  },
});
