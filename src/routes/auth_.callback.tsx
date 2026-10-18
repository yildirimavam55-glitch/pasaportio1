import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { V2Shell, V2_NOINDEX } from "@/components/design-v2/V2Shell";
import { V2State } from "@/components/design-v2/V2States";
import {
  classifyOAuthCallback,
  friendlyAuthError,
  readOAuthCallbackParams,
  safeInternalPath,
} from "@/domain/auth/oauth";
import { useI18n } from "@/i18n";
import { localize } from "@/i18n/overlay";
import { supabase } from "@/integrations/supabase/client";

const COPY = localize({
  tr: { title: "Giriş tamamlanıyor", working: "Oturumun güvenle kuruluyor…", cancelled: "Giriş iptal edildi.", failed: "Giriş tamamlanamadı.", retry: "Girişe dön" },
  de: { title: "Anmeldung wird abgeschlossen", working: "Die Sitzung wird sicher eingerichtet…", cancelled: "Anmeldung abgebrochen.", failed: "Anmeldung fehlgeschlagen.", retry: "Zur Anmeldung" },
  en: { title: "Finishing sign-in", working: "Setting up your session securely…", cancelled: "Sign-in was cancelled.", failed: "Sign-in could not be completed.", retry: "Back to sign-in" },
} as const);

type CallbackSearch = {
  next?: string | undefined;
  code?: string | undefined;
  state?: string | undefined;
  error?: string | undefined;
  error_code?: string | undefined;
  error_description?: string | undefined;
};

export const Route = createFileRoute("/auth_/callback")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>): CallbackSearch => ({
    next: typeof s["next"] === "string" ? s["next"] : undefined,
    code: typeof s["code"] === "string" ? s["code"] : undefined,
    state: typeof s["state"] === "string" ? s["state"] : undefined,
    error: typeof s["error"] === "string" ? s["error"] : undefined,
    error_code: typeof s["error_code"] === "string" ? s["error_code"] : undefined,
    error_description: typeof s["error_description"] === "string" ? s["error_description"] : undefined,
  }),
  head: () => ({ meta: [{ title: "Giriş | pasaport.io" }, ...V2_NOINDEX] }),
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const { locale } = useI18n();
  const copy = COPY[locale];
  const [status, setStatus] = useState<"working" | "cancelled" | "error">("working");
  const [detail, setDetail] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    const finish = (next: string) => {
      window.location.replace(safeInternalPath(next));
    };

    void (async () => {
      const params = readOAuthCallbackParams(window.location.search, window.location.hash);
      const classified = classifyOAuthCallback(params);
      if (classified.kind === "cancelled") {
        if (alive) setStatus("cancelled");
        return;
      }
      if (classified.kind === "error") {
        if (alive) {
          setStatus("error");
          setDetail(friendlyAuthError(params.errorDescription ?? params.error, locale));
        }
        return;
      }

      const existing = await supabase.auth.getSession();
      if (existing.data.session) {
        finish(params.next);
        return;
      }

      if (params.code) {
        const { error } = await supabase.auth.exchangeCodeForSession(params.code);
        if (error) {
          if (alive) {
            setStatus("error");
            setDetail(friendlyAuthError(error.message, locale));
          }
          return;
        }
        const after = await supabase.auth.getSession();
        if (after.data.session) {
          finish(params.next);
          return;
        }
      }

      if (alive) {
        setStatus("error");
        setDetail(copy.failed);
      }
    })();

    return () => {
      alive = false;
    };
  }, [copy.failed, locale]);

  if (status === "working") {
    return (
      <V2Shell level="transaction" nav="account">
        <div className="mx-auto max-w-md py-6 lg:py-16">
          <V2State tone="loading" title={copy.title} text={copy.working} />
        </div>
      </V2Shell>
    );
  }

  return (
    <V2Shell level="transaction" nav="account">
      <div className="mx-auto max-w-md py-6 lg:py-16">
        <V2State
          tone={status === "cancelled" ? "warning" : "error"}
          title={status === "cancelled" ? copy.cancelled : copy.failed}
          text={detail}
          action={
            <Link to="/auth" className="inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground">
              {copy.retry}
            </Link>
          }
        />
      </div>
    </V2Shell>
  );
}
