import { createFileRoute } from "@tanstack/react-router";
import { AlertCircle, CheckCircle2, KeyRound, LockKeyhole } from "lucide-react";
import { useEffect, useState } from "react";

import { CLink as Link } from "@/components/design-v2/v2-context";
import { V2Shell, V2_NOINDEX } from "@/components/design-v2/V2Shell";
import { Button } from "@/components/ui/button";
import { isRecoveryToken, readRecoveryLinkState, validateNewPassword } from "@/domain/auth/recovery-link";
import { useI18n } from "@/i18n";
import { localize } from "@/i18n/overlay";
import { supabase } from "@/integrations/supabase/client";

const COPY = localize({
  tr: { title: "Yeni şifre belirle", lead: "Hesabın için yeni bir şifre gir.", next: "Yeni şifre", repeat: "Yeni şifre (tekrar)", save: "Şifreyi kaydet", working: "Kaydediliyor…", checking: "Bağlantı doğrulanıyor…", expired: "Bu şifre yenileme bağlantısının süresi dolmuş. Yeni bir bağlantı iste.", invalid: "Bu şifre yenileme bağlantısı geçersiz veya daha önce kullanılmış. Yeni bir bağlantı iste.", tooShort: "Şifre en az 8 karakter olmalı.", mismatch: "Şifreler eşleşmiyor.", same: "Yeni şifre eski şifreden farklı olmalı.", weak: "Bu şifre çok zayıf veya bilinen bir sızıntıda yer alıyor. Başka bir şifre seç.", failed: "Şifre güncellenemedi. Tekrar dene.", done: "Şifren güncellendi", doneLead: "Yeni şifrenle giriş yapabilirsin.", login: "Giriş ekranına dön", again: "Yeni bağlantı iste" },
  de: { title: "Neues Passwort festlegen", lead: "Gib ein neues Passwort für dein Konto ein.", next: "Neues Passwort", repeat: "Neues Passwort wiederholen", save: "Passwort speichern", working: "Wird gespeichert…", checking: "Link wird geprüft…", expired: "Dieser Link ist abgelaufen. Fordere einen neuen an.", invalid: "Dieser Link ist ungültig oder wurde bereits verwendet. Fordere einen neuen an.", tooShort: "Das Passwort muss mindestens 8 Zeichen haben.", mismatch: "Die Passwörter stimmen nicht überein.", same: "Das neue Passwort muss sich vom alten unterscheiden.", weak: "Dieses Passwort ist zu schwach oder bekannt geleakt. Wähle ein anderes.", failed: "Das Passwort konnte nicht aktualisiert werden.", done: "Passwort aktualisiert", doneLead: "Du kannst dich jetzt mit dem neuen Passwort anmelden.", login: "Zur Anmeldung", again: "Neuen Link anfordern" },
  en: { title: "Set a new password", lead: "Enter a new password for your account.", next: "New password", repeat: "Repeat new password", save: "Save password", working: "Saving…", checking: "Checking your link…", expired: "This reset link has expired. Request a new one.", invalid: "This reset link is invalid or was already used. Request a new one.", tooShort: "Password must be at least 8 characters.", mismatch: "Passwords do not match.", same: "The new password must differ from the old one.", weak: "This password is too weak or known from a leak. Choose another.", failed: "Could not update the password. Try again.", done: "Password updated", doneLead: "You can now sign in with your new password.", login: "Back to sign in", again: "Request a new link" },
} as const);

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Şifre yenile | Pasaport.io" },
      { name: "description", content: "Pasaport.io hesabın için yeni bir şifre belirle." },
      { property: "og:title", content: "Şifre yenile | Pasaport.io" },
      { property: "og:description", content: "Pasaport.io hesabın için yeni bir şifre belirle." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      ...V2_NOINDEX,
    ],
  }),
  component: ResetPassword,
});

type Phase = "checking" | "ready" | "expired" | "invalid" | "done";

function ResetPassword() {
  const { locale } = useI18n();
  const copy = COPY[locale];
  const [phase, setPhase] = useState<Phase>("checking");
  const [next, setNext] = useState("");
  const [repeat, setRepeat] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const linkState = readRecoveryLinkState(window.location.hash, window.location.search);
    if (linkState !== "pending") {
      setPhase(linkState === "expired" ? "expired" : "invalid");
      return;
    }
    let settled = false;
    const accept = () => { settled = true; setPhase("ready"); };
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (session && isRecoveryToken(session.access_token))) accept();
    });
    void supabase.auth.getSession().then(({ data: s }) => {
      if (s.session && isRecoveryToken(s.session.access_token)) accept();
    });
    const timer = window.setTimeout(() => { if (!settled) setPhase("invalid"); }, 6000);
    return () => { data.subscription.unsubscribe(); window.clearTimeout(timer); };
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const problem = validateNewPassword(next, repeat);
    if (problem) { setError(copy[problem]); return; }
    setBusy(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: next });
      if (updateError) {
        const msg = updateError.message.toLowerCase();
        setError(msg.includes("different") || msg.includes("same") ? copy.same : msg.includes("weak") || msg.includes("pwned") || msg.includes("leak") ? copy.weak : msg.includes("expired") || msg.includes("session") ? copy.expired : copy.failed);
        return;
      }
      await supabase.auth.signOut();
      setNext(""); setRepeat("");
      setPhase("done");
    } finally {
      setBusy(false);
    }
  }

  const body = phase === "checking" ? (
    <p role="status" className="mt-4 text-sm text-muted-foreground">{copy.checking}</p>
  ) : phase === "expired" || phase === "invalid" ? (
    <>
      <p role="alert" className="mt-4 rounded-xl border border-destructive/25 bg-destructive/10 p-3 text-sm font-medium text-destructive">
        <AlertCircle className="mr-2 inline size-4" aria-hidden="true" />{phase === "expired" ? copy.expired : copy.invalid}
      </p>
      <div className="mt-6 grid gap-3">
        <Button asChild size="lg"><Link to="/auth">{copy.again}</Link></Button>
      </div>
    </>
  ) : phase === "done" ? (
    <>
      <p role="status" className="mt-4 flex gap-2 rounded-xl bg-secondary p-3 text-sm text-muted-foreground">
        <CheckCircle2 className="size-4 shrink-0 text-primary" aria-hidden="true" />{copy.doneLead}
      </p>
      <Button asChild size="lg" className="mt-6 w-full"><Link to="/auth">{copy.login}</Link></Button>
    </>
  ) : (
    <form onSubmit={submit} className="mt-7 space-y-4">
      {error && (
        <p role="alert" className="rounded-xl border border-destructive/25 bg-destructive/10 p-3 text-sm font-medium text-destructive">
          <AlertCircle className="mr-2 inline size-4" aria-hidden="true" />{error}
        </p>
      )}
      <label className="block text-sm font-semibold">
        {copy.next}
        <input type="password" required minLength={8} autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-input bg-card px-3 text-sm" />
      </label>
      <label className="block text-sm font-semibold">
        {copy.repeat}
        <input type="password" required minLength={8} autoComplete="new-password" value={repeat} onChange={(e) => setRepeat(e.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-input bg-card px-3 text-sm" />
      </label>
      <Button type="submit" size="lg" className="w-full" disabled={busy}><KeyRound />{busy ? copy.working : copy.save}</Button>
      <Link to="/auth" className="block text-center text-sm font-semibold text-primary">{copy.login}</Link>
    </form>
  );

  return (
    <V2Shell level="transaction" nav="account">
      <div className="mx-auto max-w-md py-2 lg:py-12">
        <div className="w-full lg:rounded-2xl lg:border lg:border-border lg:bg-card lg:p-8 lg:shadow-card">
          <span className="grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary"><LockKeyhole /></span>
          <h1 className="mt-5 font-display text-3xl font-bold">{phase === "done" ? copy.done : copy.title}</h1>
          {phase !== "done" && <p className="mt-2 text-sm text-muted-foreground">{copy.lead}</p>}
          {body}
        </div>
      </div>
    </V2Shell>
  );
}
