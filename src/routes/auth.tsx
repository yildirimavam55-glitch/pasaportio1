import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { AlertCircle, ArrowLeft, CheckCircle2, Eye, EyeOff, Info, LockKeyhole, Mail, Signal } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/domain/experience/config";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useI18n } from "@/i18n";

const AUTH_COPY = {
  tr: { back: "Ana sayfaya dön", eyebrow: "Seyahatin tek yerde", featureTitle: "Bağlantın, dinlenme molan ve seyahatlerin.", features: ["eSIM ve Lounge hizmetlerini seyahat bazında takip et", "Satın alımların değişse bile geçmişini koru", "Hesabına güvenle eriş"], secure: "Güvenli kimlik doğrulama · Yönetici yetkileri ayrı atanır", welcome: "Tekrar hoş geldin", create: "Seyahat hesabını oluştur", resetTitle: "Şifreni yenile", lead: "Seyahatlerine ve hizmetlerine tek yerden ulaş.", resetLead: "Bağlantıyı gönderebilmemiz için e-posta adresini yaz.", email: "E-posta", password: "Şifre", passwordPlaceholder: "En az 8 karakter", show: "Şifreyi göster", hide: "Şifreyi gizle", forgot: "Şifremi unuttum", working: "İşleniyor…", signIn: "Giriş yap", signUp: "Kayıt ol", send: "Bağlantı gönder", or: "veya", google: "Google ile devam et", apple: "Apple ile devam et", switchSignUp: "Hesabın yok mu? Kayıt ol", switchSignIn: "Giriş ekranına dön", check: "E-postanı kontrol et", sent: "adresine bir doğrulama bağlantısı gönderdik. Hesabını etkinleştirmek için e-postandaki bağlantıya tıkla.", spam: "E-posta gelmediyse spam klasörünü kontrol etmeyi unutma.", resetSent: "Şifre yenileme bağlantısını e-posta adresine gönderdik.", oauthGoogle: "Google ile giriş şu anda yapılamadı.", oauthApple: "Apple ile giriş şu anda yapılamadı." },
  de: { back: "Zur Startseite", eyebrow: "Deine Reise an einem Ort", featureTitle: "Verbindung, Lounge und Reisen im Blick.", features: ["eSIM- und Lounge-Dienste pro Reise verwalten", "Deine Historie bleibt bei Änderungen erhalten", "Sicher auf dein Konto zugreifen"], secure: "Sichere Anmeldung · Administratorrechte werden separat vergeben", welcome: "Willkommen zurück", create: "Reisekonto erstellen", resetTitle: "Passwort zurücksetzen", lead: "Greife zentral auf deine Reisen und Dienste zu.", resetLead: "Gib deine E-Mail-Adresse ein, um den Link zu erhalten.", email: "E-Mail", password: "Passwort", passwordPlaceholder: "Mindestens 8 Zeichen", show: "Passwort anzeigen", hide: "Passwort verbergen", forgot: "Passwort vergessen", working: "Wird verarbeitet…", signIn: "Anmelden", signUp: "Registrieren", send: "Link senden", or: "oder", google: "Mit Google fortfahren", apple: "Mit Apple fortfahren", switchSignUp: "Noch kein Konto? Registrieren", switchSignIn: "Zur Anmeldung", check: "Prüfe deine E-Mails", sent: "Wir haben einen Bestätigungslink an diese Adresse gesendet. Öffne den Link, um dein Konto zu aktivieren.", spam: "Prüfe auch deinen Spam-Ordner, falls die E-Mail nicht ankommt.", resetSent: "Wir haben den Link zum Zurücksetzen an deine E-Mail-Adresse gesendet.", oauthGoogle: "Die Anmeldung mit Google ist derzeit nicht möglich.", oauthApple: "Die Anmeldung mit Apple ist derzeit nicht möglich." },
  en: { back: "Back to home", eyebrow: "Your travel in one place", featureTitle: "Your connection, lounge and trips.", features: ["Manage eSIM and Lounge services by trip", "Keep your history when purchases change", "Access your account securely"], secure: "Secure authentication · Administrator access is assigned separately", welcome: "Welcome back", create: "Create your travel account", resetTitle: "Reset your password", lead: "Access your trips and services in one place.", resetLead: "Enter your email address so we can send the link.", email: "Email", password: "Password", passwordPlaceholder: "At least 8 characters", show: "Show password", hide: "Hide password", forgot: "Forgot password", working: "Working…", signIn: "Sign in", signUp: "Create account", send: "Send link", or: "or", google: "Continue with Google", apple: "Continue with Apple", switchSignUp: "No account? Create one", switchSignIn: "Back to sign in", check: "Check your email", sent: "We sent a confirmation link to this address. Open it to activate your account.", spam: "Check your spam folder if the email does not arrive.", resetSent: "We sent a password reset link to your email address.", oauthGoogle: "Google sign-in is currently unavailable.", oauthApple: "Apple sign-in is currently unavailable." },
} as const;
type AuthSearch = { redirect?: string | undefined };
export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): AuthSearch => ({
    redirect: typeof search["redirect"] === "string" ? search["redirect"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Giriş yap | travely" },
      { name: "description", content: "Seyahatlerinize ulaşmak için giriş yapın veya hesap oluşturun." },
      { property: "og:title", content: "Giriş yap | travely" },
      { property: "og:description", content: "Seyahat hesabınıza güvenle giriş yapın." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});
function safePath(value: string | undefined) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/account";
}
function friendlyAuthError(raw: string | null, locale: "tr" | "de" | "en") {
  const key = (raw ?? "").toLowerCase();
  const messages = {
    tr: { invalid: "E-posta veya şifre hatalı. Tekrar dene.", confirm: "Önce e-postandaki doğrulama bağlantısına tıkla.", limit: "Çok fazla deneme yaptın. Kısa bir süre sonra tekrar dene.", exists: "Bu e-posta ile zaten bir hesap var. Giriş yapmayı dene.", fallback: "Bir hata oluştu." },
    de: { invalid: "E-Mail oder Passwort ist falsch. Versuche es erneut.", confirm: "Bestätige zuerst deine E-Mail-Adresse.", limit: "Zu viele Versuche. Bitte versuche es später erneut.", exists: "Für diese E-Mail besteht bereits ein Konto. Versuche dich anzumelden.", fallback: "Ein Fehler ist aufgetreten." },
    en: { invalid: "Incorrect email or password. Try again.", confirm: "Confirm your email address first.", limit: "Too many attempts. Please try again shortly.", exists: "An account already exists for this email. Try signing in.", fallback: "Something went wrong." },
  } as const;
  const message = messages[locale];
  if (key.includes("invalid login credentials")) return message.invalid;
  if (key.includes("email not confirmed")) return message.confirm;
  if (key.includes("rate limit") || key.includes("too many"))
    return message.limit;
  if (key.includes("user already registered"))
    return message.exists;
  return raw ?? message.fallback;
}
function AuthPage() {
  const { locale } = useI18n();
  const copy = AUTH_COPY[locale];
  const navigate = useNavigate();
  const search = useSearch({ from: "/auth" });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup" | "reset">("signin");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<"error" | "info">("error");
  const [busy, setBusy] = useState(false);
  const [signedUp, setSignedUp] = useState(false);
  const [oauthBusy, setOauthBusy] = useState<"google" | "apple" | null>(null);
  const target = safePath(search.redirect);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      if (mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/account`,
        });
        if (error) throw error;
        setTone("info");
        setMessage(copy.resetSent);
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}${target}` },
        });
        if (error) throw error;
        setSignedUp(true);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        void navigate({ to: target });
      }
    } catch (error) {
      setTone("error");
      setMessage(friendlyAuthError(error instanceof Error ? error.message : null, locale));
    } finally {
      setBusy(false);
    }
  }

  async function handleOAuth(provider: "google" | "apple") {
    setMessage(null);
    setOauthBusy(provider);
    try {
      const result = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: `${window.location.origin}${target}`,
      });
      if (result.error) {
        setTone("error");
        setMessage(
          provider === "google"
            ? copy.oauthGoogle
            : copy.oauthApple,
        );
        return;
      }
      if (!result.redirected) void navigate({ to: target });
    } finally {
      setOauthBusy(null);
    }
  }

  if (signedUp) {
    return (
      <main className="grid min-h-screen place-items-center bg-background px-5 py-10">
        <div className="w-full max-w-md text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-primary-soft text-primary">
            <Mail className="size-7" />
          </span>
          <h1 className="mt-6 font-display text-3xl font-bold">{copy.check}</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            <strong className="text-foreground">{email}</strong> {copy.sent}
          </p>
          <div className="mt-8 space-y-3">
            <Button
              type="button"
              onClick={() => {
                setSignedUp(false);
                setMode("signin");
              }}
              className="w-full"
              size="lg"
            >
              {copy.switchSignIn}
            </Button>
            <p className="text-xs text-muted-foreground">
              {copy.spam}
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="grid min-h-screen bg-background lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-primary p-12 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 opacity-15 [background:radial-gradient(circle_at_70%_20%,white,transparent_35%)]" />
        <Link to="/" search={{ service: "esim" }} className="relative flex items-center gap-2">
          <span className="grid size-10 place-items-center rounded-full bg-white/15">
            <Signal />
          </span>
          <strong className="font-display text-2xl">{BRAND.name}</strong>
        </Link>
        <div className="relative max-w-lg">
          <p className="text-sm font-bold uppercase opacity-70">{copy.eyebrow}</p>
          <h1 className="mt-4 font-display text-5xl font-bold leading-tight">
            {copy.featureTitle}
          </h1>
          <div className="mt-8 grid gap-3 text-sm">
            {copy.features.map((item) => (
              <span key={item} className="flex items-center gap-2">
                <CheckCircle2 className="size-5" />
                {item}
              </span>
            ))}
          </div>
        </div>
        <p className="relative text-sm opacity-60">
          {copy.secure}
        </p>
      </section>
      <section className="flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-md">
          <Button asChild variant="ghost" className="mb-8 -ml-3">
            <Link to="/" search={{ service: "esim" }}>
              <ArrowLeft /> {copy.back}
            </Link>
          </Button>
          <span className="grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary">
            <LockKeyhole />
          </span>
          <h1 className="mt-5 font-display text-3xl font-bold">
            {mode === "signin"
              ? copy.welcome
              : mode === "signup"
                ? copy.create
                : copy.resetTitle}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "reset"
              ? copy.resetLead
              : copy.lead}
          </p>
          {message && (
            <p
              role="status"
              className={
                tone === "error"
                  ? "mt-4 rounded-xl border border-destructive/25 bg-destructive/10 p-3 text-sm font-medium text-destructive"
                  : "mt-4 rounded-xl bg-secondary p-3 text-sm text-muted-foreground"
              }
            >
              {tone === "error" ? <AlertCircle className="mr-2 inline size-4" aria-hidden="true" /> : <Info className="mr-2 inline size-4" aria-hidden="true" />}{message}
            </p>
          )}
          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            <label className="block text-sm font-semibold">
              {copy.email}
              <div className="relative mt-2">
                <Mail className="absolute left-3 top-3.5 size-5 text-muted-foreground" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="sen@example.com"
                  className="min-h-12 w-full rounded-xl border border-input bg-card pl-11 pr-3 text-sm"
                />
              </div>
            </label>
            {mode !== "reset" && (
              <label className="block text-sm font-semibold">
                {copy.password}
                <div className="relative mt-2">
                  <LockKeyhole className="absolute left-3 top-3.5 size-5 text-muted-foreground" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={copy.passwordPlaceholder}
                    className="min-h-12 w-full rounded-xl border border-input bg-card px-11 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-1 top-1 grid size-10 place-items-center text-muted-foreground"
                    aria-label={showPassword ? copy.hide : copy.show}
                  >
                    {showPassword ? <EyeOff /> : <Eye />}
                  </button>
                </div>
              </label>
            )}
            {mode === "signin" && (
              <button
                type="button"
                onClick={() => setMode("reset")}
                className="text-sm font-semibold text-primary"
              >
                {copy.forgot}
              </button>
            )}
            <Button type="submit" disabled={busy} className="w-full" size="lg">
              {busy
                ? copy.working
                : mode === "signin"
                  ? copy.signIn
                  : mode === "signup"
                    ? copy.signUp
                    : copy.send}
            </Button>
          </form>
          {mode !== "reset" && (
            <>
              <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                {copy.or}
                <span className="h-px flex-1 bg-border" />
              </div>
              <div className="grid gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void handleOAuth("google")}
                  disabled={oauthBusy !== null}
                  className="w-full gap-2"
                  size="lg"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5">
                    <path
                      fill="#4285F4"
                      d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.4a5.5 5.5 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.6-5.2 3.6-8.8Z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.1-4 1.1a7 7 0 0 1-6.6-4.8H1.4v3.1A12 12 0 0 0 12 24Z"
                    />
                    <path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.6V6.7H1.4a12 12 0 0 0 0 10.6l4-2.9Z" />
                    <path
                      fill="#EA4335"
                      d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.7l4 3.1A7 7 0 0 1 12 4.8Z"
                    />
                  </svg>
                  {copy.google}
                </Button>
                <Button
                  type="button"
                  onClick={() => void handleOAuth("apple")}
                  disabled={oauthBusy !== null}
                  className="w-full gap-2 bg-foreground text-background hover:bg-foreground/90"
                  size="lg"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5" fill="currentColor">
                    <path d="M16.4 12.8c0-2.2 1.8-3.3 1.9-3.4-1-1.5-2.6-1.7-3.2-1.7-1.4-.1-2.6.8-3.3.8-.7 0-1.7-.8-2.8-.8-1.5 0-2.8.9-3.6 2.2-1.5 2.6-.4 6.5 1.1 8.6.7 1 1.6 2.2 2.7 2.2 1.1 0 1.5-.7 2.8-.7 1.3 0 1.6.7 2.7.7 1.1 0 1.9-1.1 2.6-2.1.5-.8.8-1.5 1-2-2.3-.9-2.9-3-2.9-3.8ZM14.6 5.6c.6-.7 1-1.7.9-2.7-.9 0-2 .6-2.6 1.3-.6.7-1 1.7-.9 2.6 1 .1 2-.5 2.6-1.2Z" />
                  </svg>
                  {copy.apple}
                </Button>
              </div>
            </>
          )}
          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="mt-5 text-sm font-semibold text-primary"
          >
            {mode === "signin" ? copy.switchSignUp : copy.switchSignIn}
          </button>
        </div>
      </section>
    </main>
  );
}
