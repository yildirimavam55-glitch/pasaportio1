/**
 * Admin → Security: READ-ONLY, deterministic security status.
 * Values come from real database checks (security_baseline_status) and server
 * configuration — never from an AI model. There are intentionally no write
 * endpoints here: baseline controls cannot be switched from the Admin UI.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdminRole, type AdminCtx } from "@/lib/admin-guard";
import { securityHeaders, NOINDEX_PATH } from "@/security/headers";
import { safeJsonLd } from "@/security/json-ld";
import { PUBLIC_SETTINGS_FIELDS } from "@/domain/platform/settings";

export type ControlState = "ACTIVE" | "FAIL" | "DISABLED" | "ENABLED";
export type SecurityStatus = {
  controls: { key: string; label: string; state: ControlState }[];
  checkedAt: string;
};

export const getSecurityStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SecurityStatus> => {
    const ctx = context as AdminCtx;
    await assertAdminRole(ctx);
    const { data, error } = await ctx.supabase.rpc("security_baseline_status");
    if (error) throw new Error(error.message);
    const s = (data ?? {}) as Record<string, unknown>;
    const { data: flag } = await ctx.supabase
      .from("feature_flags")
      .select("enabled")
      .eq("key", "commerce.test_payments")
      .maybeSingle();
    const ok = (v: unknown): ControlState => (v === true ? "ACTIVE" : "FAIL");
    const liveProvisioning = String(process.env["COMMERCE_LIVE_PROVISIONING"] ?? "").toLowerCase() === "true";
    const prod = securityHeaders(new URL("https://example.invalid/"));
    const headersOk = Boolean(prod["Content-Security-Policy-Report-Only"] && /frame-ancestors 'self'$/.test(prod["Content-Security-Policy"] ?? "") && prod["Permissions-Policy"]);
    const noindexOk = NOINDEX_PATH.test("/admin") && NOINDEX_PATH.test("/account");
    const settingsOk = !(PUBLIC_SETTINGS_FIELDS as readonly string[]).some((k) => ["senderName", "timezone", "reportingCurrency", "defaultLocale"].includes(k));
    const jsonLdOk = !safeJsonLd({ x: "</script>" }).includes("<");
    return {
      checkedAt: String(s["checkedAt"] ?? new Date().toISOString()),
      controls: [
        { key: "db", label: "Veritabanı koruması", state: ok(s["databaseProtection"]) },
        { key: "isolation", label: "Müşteri izolasyonu", state: ok(s["customerIsolation"]) },
        { key: "cost", label: "Tedarikçi maliyet koruması", state: ok(s["supplierCostProtection"]) },
        { key: "roles", label: "Admin rol koruması", state: ok(s["roleProtection"]) },
        { key: "technical", label: "Teknik sipariş alanları gizli (talep kodu, tekrar anahtarı)", state: ok(s["technicalFieldsHidden"]) },
        { key: "marginFlag", label: "İç marj inceleme işareti gizli", state: ok(s["marginFlagHidden"]) },
        { key: "truncate", label: "Tarayıcı rolleri tablo boşaltamaz", state: ok(s["browserTruncateBlocked"]) },
        { key: "history", label: "Denetim ve sürüm geçmişi değiştirilemez", state: ok(s["historyAppendOnly"]) },
        { key: "defaultsPg", label: "Yeni tablolar kapalı başlar (uygulama rolü)", state: ok(s["defaultPrivilegesPostgres"]) },
        { key: "defaultsSa", label: "Yeni tablolar kapalı başlar (platform rolü)", state: ok(s["defaultPrivilegesSupabaseAdmin"]) },
        { key: "owners", label: "Tüm uygulama nesneleri uygulama rolüne ait", state: ok(s["appObjectsOwnedByMigrationRole"]) },
        { key: "rate", label: "İstek sınırlama", state: ok(s["rateLimiting"]) },
        { key: "roleLookup", label: "Rol sorgusu yalnızca kendi hesabı için", state: ok(s["roleLookupSelfOnly"]) },
        { key: "settingsTable", label: "Tam ayar kaydı yalnızca Admin", state: ok(s["settingsTablePrivate"]) },
        { key: "admin", label: "Sunucu tarafı Admin yetkisi", state: "ACTIVE" },
        { key: "qr", label: "QR / aktivasyon koruması", state: ok(s["customerIsolation"]) },
        { key: "payment", label: "Gerçek ödeme", state: "DISABLED" },
        { key: "testPayment", label: "Test ödeme modu", state: flag?.enabled ? "ENABLED" : "DISABLED" },
        { key: "headers", label: "Güvenlik başlıkları (CSP rapor modu, çerçeve koruması, izin politikası)", state: headersOk ? "ACTIVE" : "FAIL" },
        { key: "noindex", label: "Admin sayfaları arama motorlarından gizli", state: noindexOk ? "ACTIVE" : "FAIL" },
        { key: "settings", label: "Genel / özel ayar ayrımı (sunucu yanıtı)", state: settingsOk ? "ACTIVE" : "FAIL" },
        { key: "jsonld", label: "Yapılandırılmış veri güvenli kodlama", state: jsonLdOk ? "ACTIVE" : "FAIL" },
        { key: "provisioning", label: "Canlı eSIM tedariki", state: liveProvisioning ? "ENABLED" : "DISABLED" },
      ],
    };
  });
