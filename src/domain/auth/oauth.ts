/** Pure OAuth / redirect helpers. Never log tokens, secrets, or raw provider URLs. */

export const DEFAULT_AFTER_AUTH = "/account";

const LOVABLE_BROKER_HOSTS = [
  "lovable.app",
  "lovableproject.com",
  "lovableproject-dev.com",
  "gpt-eng.com",
  "gptengineer.run",
];

export function usesLovableOAuthBroker(hostname: string): boolean {
  const host = hostname.toLowerCase().split(":")[0] ?? "";
  return LOVABLE_BROKER_HOSTS.some((zone) => host === zone || host.endsWith(`.${zone}`));
}

/** Only same-app paths. Rejects protocol-relative, absolute, and callback-loop targets. */
export function safeInternalPath(value: string | undefined, fallback = DEFAULT_AFTER_AUTH): string {
  if (!value) return fallback;
  let raw = value.trim();
  try {
    raw = decodeURIComponent(raw).trim();
  } catch {
    return fallback;
  }
  if (!raw) return fallback;

  if (/^[a-z][a-z0-9+.-]*:/i.test(raw) || raw.startsWith("//") || raw.startsWith("\\\\")) {
    try {
      const url = new URL(raw);
      if (url.protocol !== "http:" && url.protocol !== "https:") return fallback;
      raw = `${url.pathname}${url.search}${url.hash}`;
    } catch {
      return fallback;
    }
  }

  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return fallback;
  if (/[\u0000-\u001F\u007F]/.test(raw)) return fallback;

  const pathname = raw.split(/[?#]/, 1)[0] ?? raw;
  if (pathname === "/auth/callback" || pathname.startsWith("/auth/callback/")) return fallback;
  return raw;
}

export function oauthCallbackPath(next: string): string {
  return `/auth/callback?next=${encodeURIComponent(safeInternalPath(next))}`;
}

export function oauthRedirectTo(origin: string, next: string): string {
  return `${origin}${oauthCallbackPath(next)}`;
}

/** Only the project's own GoTrue authorize URL may be assigned after signInWithOAuth. */
export function isTrustedAuthorizeUrl(url: string, supabaseUrl: string): boolean {
  try {
    const target = new URL(url);
    const backend = new URL(supabaseUrl);
    return target.origin === backend.origin && target.pathname === "/auth/v1/authorize";
  } catch {
    return false;
  }
}

export type OAuthCallbackParams = {
  next: string;
  code: string | null;
  error: string | null;
  errorCode: string | null;
  errorDescription: string | null;
};

export function readOAuthCallbackParams(search: string, hash = ""): OAuthCallbackParams {
  const query = new URLSearchParams(search.replace(/^\?/, ""));
  const fragment = new URLSearchParams(hash.replace(/^#/, ""));
  const pick = (key: string) => query.get(key) ?? fragment.get(key);
  return {
    next: safeInternalPath(pick("next") ?? undefined),
    code: pick("code"),
    error: pick("error"),
    errorCode: pick("error_code") ?? pick("errorCode"),
    errorDescription: pick("error_description") ?? pick("errorDescription"),
  };
}

export type OAuthCallbackKind = "ready" | "cancelled" | "error";

export function classifyOAuthCallback(params: OAuthCallbackParams): {
  kind: OAuthCallbackKind;
  reason: "access_denied" | "missing_secret" | "provider" | "other" | null;
} {
  const blob = `${params.error ?? ""} ${params.errorCode ?? ""} ${params.errorDescription ?? ""}`.toLowerCase();
  if (!params.error && !params.errorCode) return { kind: "ready", reason: null };
  if (params.error === "access_denied" || blob.includes("access_denied") || blob.includes("user cancelled")) {
    return { kind: "cancelled", reason: "access_denied" };
  }
  if (blob.includes("missing oauth secret") || blob.includes("unsupported provider")) {
    return { kind: "error", reason: "missing_secret" };
  }
  return { kind: "error", reason: "provider" };
}

const AUTH_ERROR_COPY = {
  tr: {
    invalid: "E-posta veya şifre hatalı. Tekrar dene.",
    confirm: "Önce e-postandaki doğrulama bağlantısına tıkla.",
    limit: "Çok fazla deneme yaptın. Kısa bir süre sonra tekrar dene.",
    exists: "Bu e-posta ile zaten bir hesap var. Giriş yapmayı dene.",
    weak: "Bu şifre çok zayıf. En az 8 karakter kullan ve daha güçlü bir şifre seç.",
    provider: "Bu giriş yöntemi henüz yapılandırılmadı.",
    cancelled: "Giriş iptal edildi.",
    oauth: "Sosyal giriş tamamlanamadı. Tekrar dene.",
    fallback: "Bir hata oluştu.",
  },
  de: {
    invalid: "E-Mail oder Passwort ist falsch. Versuche es erneut.",
    confirm: "Bestätige zuerst deine E-Mail-Adresse.",
    limit: "Zu viele Versuche. Bitte versuche es später erneut.",
    exists: "Für diese E-Mail besteht bereits ein Konto. Versuche dich anzumelden.",
    weak: "Dieses Passwort ist zu schwach. Mindestens 8 Zeichen und ein stärkeres Passwort wählen.",
    provider: "Diese Anmeldemethode ist noch nicht eingerichtet.",
    cancelled: "Anmeldung abgebrochen.",
    oauth: "Die soziale Anmeldung konnte nicht abgeschlossen werden. Versuche es erneut.",
    fallback: "Ein Fehler ist aufgetreten.",
  },
  en: {
    invalid: "Incorrect email or password. Try again.",
    confirm: "Confirm your email address first.",
    limit: "Too many attempts. Please try again shortly.",
    exists: "An account already exists for this email. Try signing in.",
    weak: "This password is too weak. Use at least 8 characters and choose a stronger password.",
    provider: "This sign-in method is not configured yet.",
    cancelled: "Sign-in was cancelled.",
    oauth: "Social sign-in could not be completed. Try again.",
    fallback: "Something went wrong.",
  },
} as const;

export type AuthErrorLocale = keyof typeof AUTH_ERROR_COPY;

export function authErrorLocale(locale: string): AuthErrorLocale {
  return locale === "de" || locale === "en" || locale === "tr" ? locale : "en";
}

function looksLikeSecret(value: string): boolean {
  return /secret|private.?key|client_secret|api[_-]?key|service_role|bearer\s+[a-z0-9._-]+/i.test(value);
}

export function friendlyAuthError(raw: string | null, locale: string): string {
  const message = AUTH_ERROR_COPY[authErrorLocale(locale)];
  const key = (raw ?? "").toLowerCase();
  if (!key) return message.fallback;
  if (key.includes("invalid login credentials")) return message.invalid;
  if (key.includes("email not confirmed")) return message.confirm;
  if (key.includes("rate limit") || key.includes("too many") || key.includes("over_email_send_rate_limit")) {
    return message.limit;
  }
  if (key.includes("user already registered")) return message.exists;
  if (key.includes("missing oauth secret") || key.includes("unsupported provider") || key.includes("provider is not enabled")) {
    return message.provider;
  }
  if (looksLikeSecret(raw ?? "")) return message.fallback;
  if (key.includes("weak") || key.includes("pwned") || key.includes("leaked") || key.includes("password should")) {
    return message.weak;
  }
  if (key.includes("access_denied") || key.includes("user cancelled")) return message.cancelled;
  if (key.includes("oauth") || key.includes("authorization")) return message.oauth;
  return raw ?? message.fallback;
}

export function isMissingProviderSecret(raw: string | null): boolean {
  const key = (raw ?? "").toLowerCase();
  return key.includes("missing oauth secret") || key.includes("unsupported provider");
}
