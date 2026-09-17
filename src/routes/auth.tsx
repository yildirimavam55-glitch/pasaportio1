import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";

import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

type AuthSearch = { redirect?: string | undefined };

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): AuthSearch => ({
    redirect: typeof search["redirect"] === "string" ? search["redirect"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Giriş yap | Seyahat Servisleri Platformu" },
      { name: "description", content: "Hesabınıza giriş yapın veya yeni bir hesap oluşturun." },
      { property: "og:title", content: "Giriş yap" },
      { property: "og:description", content: "Hesabınıza giriş yapın." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function safePath(value: string | undefined): string {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/hesabim";
}

function AuthPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/auth" });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const target = safePath(search.redirect);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}${target}` },
        });
        if (error) throw error;
        setMessage("Hesabınızı doğrulamak için e-postanızı kontrol edin.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: target });
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Bir hata oluştu.");
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setMessage(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setMessage("Google ile giriş şu anda yapılamadı.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: target });
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-sm">
        <h1 className="text-2xl font-semibold tracking-tight">
          {mode === "signin" ? "Giriş yap" : "Hesap oluştur"}
        </h1>
        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-posta"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Şifre"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {mode === "signin" ? "Giriş yap" : "Kayıt ol"}
          </button>
        </form>
        <button
          type="button"
          onClick={handleGoogle}
          className="mt-3 w-full rounded-md border border-input px-4 py-2 text-sm font-medium"
        >
          Google ile devam et
        </button>
        <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-4 text-xs text-muted-foreground underline"
        >
          {mode === "signin" ? "Hesabın yok mu? Kayıt ol" : "Zaten hesabın var mı? Giriş yap"}
        </button>
        {message && <p className="mt-4 text-sm text-muted-foreground">{message}</p>}
      </div>
    </AppShell>
  );
}
