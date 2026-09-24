import { useEffect, useState } from "react";
import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { V2Shell, V2_NOINDEX, pick } from "@/components/design-v2/V2Shell";
import { V2State } from "@/components/design-v2/V2States";
import { useI18n } from "@/i18n";

const COPY = {
  tr: { loading: "Hesabın yükleniyor…", title: "Hesabına giriş yap", text: "eSIM'lerini, siparişlerini ve ayarlarını görmek için giriş yap.", login: "Giriş yap", register: "Kayıt ol" },
  de: { loading: "Konto wird geladen…", title: "Melde dich an", text: "Melde dich an, um eSIMs, Bestellungen und Einstellungen zu sehen.", login: "Anmelden", register: "Registrieren" },
  en: { loading: "Loading your account…", title: "Sign in to your account", text: "Sign in to see your eSIMs, orders and settings.", login: "Sign in", register: "Create account" },
};

// Same session check as the production /_authenticated gate, but the signed-out
// state stays inside the V2 preview instead of jumping to the old /auth screen.
export const Route = createFileRoute("/design-v2/account")({
  ssr: false,
  head: () => ({ meta: V2_NOINDEX }),
  component: V2AccountGate,
});

function V2AccountGate() {
  const { locale } = useI18n();
  const c = pick(locale, COPY);
  const href = useRouterState({ select: (s) => s.location.href });
  const [state, setState] = useState<"loading" | "in" | "out">("loading");

  useEffect(() => {
    let alive = true;
    void supabase.auth.getUser().then(({ data, error }) => {
      if (alive) setState(!error && data.user ? "in" : "out");
    });
    const { data } = supabase.auth.onAuthStateChange((_e, session) => {
      if (alive) setState(session ? "in" : "out");
    });
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);

  if (state === "in") return <Outlet />;
  return (
    <V2Shell level="account" nav="account">
      <div className="pt-2">
        {state === "loading" ? (
          <V2State tone="loading" title={c.loading} />
        ) : (
          <V2State
            tone="empty"
            title={c.title}
            text={c.text}
            action={
              <>
                <Link to="/design-v2/auth/login" search={{ redirect: href }} className="inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground">{c.login}</Link>
                <Link to="/design-v2/auth/register" search={{ redirect: href }} className="inline-flex min-h-11 items-center rounded-full border border-border bg-card px-5 text-sm font-semibold text-foreground">{c.register}</Link>
              </>
            }
          />
        )}
      </div>
    </V2Shell>
  );
}
