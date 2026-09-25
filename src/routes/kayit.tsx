import { createFileRoute } from "@tanstack/react-router";
import { AuthPage } from "@/components/auth/AuthPage";
import { V2_NOINDEX } from "@/components/design-v2/V2Shell";

export const Route = createFileRoute("/kayit")({
  validateSearch: (s: Record<string, unknown>): { redirect?: string | undefined } => ({
    redirect: typeof s["redirect"] === "string" ? s["redirect"] : undefined,
  }),
  head: () => ({ meta: [{ title: "V2 preview — Kayıt" }, ...V2_NOINDEX] }),
  component: V2Register,
});

function V2Register() {
  const { redirect } = Route.useSearch();
  return <AuthPage redirect={redirect} fallback="/design-v2/account" initialMode="signup" />;
}
