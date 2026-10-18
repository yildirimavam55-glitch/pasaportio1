import { describe, expect, it } from "vitest";
import {
  classifyOAuthCallback,
  friendlyAuthError,
  isMissingProviderSecret,
  isTrustedAuthorizeUrl,
  oauthCallbackPath,
  oauthRedirectTo,
  readOAuthCallbackParams,
  safeInternalPath,
  usesLovableOAuthBroker,
} from "./oauth";

describe("usesLovableOAuthBroker", () => {
  it("keeps the hosted Lovable app on the broker", () => {
    expect(usesLovableOAuthBroker("pasaportio1.lovable.app")).toBe(true);
    expect(usesLovableOAuthBroker("id-preview--abc.lovable.app")).toBe(true);
    expect(usesLovableOAuthBroker("project.lovableproject.com")).toBe(true);
  });

  it("uses independent Supabase OAuth on localhost and custom hosts", () => {
    expect(usesLovableOAuthBroker("127.0.0.1")).toBe(false);
    expect(usesLovableOAuthBroker("localhost")).toBe(false);
    expect(usesLovableOAuthBroker("pasaport.io")).toBe(false);
  });
});

describe("safeInternalPath", () => {
  it("accepts in-app paths including /admin after a session exists", () => {
    expect(safeInternalPath("/admin")).toBe("/admin");
    expect(safeInternalPath("/account?tab=esims")).toBe("/account?tab=esims");
  });

  it("rejects open redirects and callback loops", () => {
    expect(safeInternalPath("https://evil.example/phish")).toBe("/phish");
    expect(safeInternalPath("//evil.example")).toBe("/account");
    expect(safeInternalPath("/\\evil")).toBe("/account");
    expect(safeInternalPath("/auth/callback")).toBe("/account");
    expect(safeInternalPath("/auth/callback?next=/admin")).toBe("/account");
    expect(safeInternalPath("javascript:alert(1)")).toBe("/account");
  });

  it("keeps only the path when a full same-app URL is passed", () => {
    expect(safeInternalPath("http://127.0.0.1:43145/admin")).toBe("/admin");
  });
});

describe("oauth callback URL", () => {
  it("embeds a safe next path for PKCE return", () => {
    expect(oauthCallbackPath("/admin")).toBe("/auth/callback?next=%2Fadmin");
    expect(oauthRedirectTo("http://127.0.0.1:43145", "/account")).toBe(
      "http://127.0.0.1:43145/auth/callback?next=%2Faccount",
    );
    expect(oauthCallbackPath("https://evil.example")).toBe("/auth/callback?next=%2F");
  });

  it("reads code, next and cancellation from the query", () => {
    const params = readOAuthCallbackParams("?code=abc&next=%2Fadmin", "");
    expect(params.code).toBe("abc");
    expect(params.next).toBe("/admin");
    expect(classifyOAuthCallback(params).kind).toBe("ready");
    expect(classifyOAuthCallback(readOAuthCallbackParams("?error=access_denied", "")).kind).toBe("cancelled");
    expect(classifyOAuthCallback(readOAuthCallbackParams("?error=server_error&error_description=missing%20oauth%20secret", "")).reason).toBe("missing_secret");
  });
});

describe("trusted authorize URL", () => {
  const supabase = "https://wiqqlvhtrexlbnzifrks.supabase.co";
  it("allows only this project's GoTrue authorize endpoint", () => {
    expect(isTrustedAuthorizeUrl(`${supabase}/auth/v1/authorize?provider=google`, supabase)).toBe(true);
    expect(isTrustedAuthorizeUrl("https://accounts.google.com/o/oauth2/v2/auth", supabase)).toBe(false);
    expect(isTrustedAuthorizeUrl("https://evil.example/auth/v1/authorize", supabase)).toBe(false);
  });
});

describe("friendlyAuthError", () => {
  it("maps email and OAuth failures without echoing secrets", () => {
    expect(friendlyAuthError("Invalid login credentials", "tr")).toBe("E-posta veya şifre hatalı. Tekrar dene.");
    expect(friendlyAuthError("Email not confirmed", "tr")).toContain("doğrulama");
    expect(friendlyAuthError("User already registered", "tr")).toContain("zaten bir hesap");
    expect(friendlyAuthError("Password should contain at least one character", "tr")).toContain("zayıf");
    expect(friendlyAuthError("Unsupported provider: missing OAuth secret", "tr")).toBe("Bu giriş yöntemi henüz yapılandırılmadı.");
    expect(friendlyAuthError("Unsupported provider: missing OAuth secret", "tr")).not.toMatch(/secret/i);
    expect(friendlyAuthError("client_secret=abc leaked", "tr")).toBe("Bir hata oluştu.");
    expect(isMissingProviderSecret("Unsupported provider: missing OAuth secret")).toBe(true);
  });
});
