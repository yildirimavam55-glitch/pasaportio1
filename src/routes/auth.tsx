import { createFileRoute } from "@tanstack/react-router";
import { AuthPage } from "@/components/auth/AuthPage";
import { V2_NOINDEX } from "@/components/design-v2/V2Shell";

// Same auth component + providers as /auth; V2 presentation via V2Context.
export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): { redirect?: string | undefined } => ({
    redirect: typeof s["redirect"] === "string" ? s["redirect"] : undefined,
  }),
  head: () => ({ meta: [{ title: "Giriş | pasaport.io" }, ...V2_NOINDEX] }),
  component: V2Login,
});

function V2Login() {
  const { redirect } = Route.useSearch();
  return <AuthPage redirect={redirect} fallback="/account" initialMode="signin" />;
}
