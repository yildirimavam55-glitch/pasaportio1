/**
 * Admin → Security: READ-ONLY, deterministic security status.
 * Values come from real database checks (security_baseline_status) and server
 * configuration — never from an AI model. There are intentionally no write
 * endpoints here: baseline controls cannot be switched from the Admin UI.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdminRole, type AdminCtx } from "@/lib/admin-guard";

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
    return {
      checkedAt: String(s["checkedAt"] ?? new Date().toISOString()),
      controls: [
        { key: "db", label: "Veritabanı koruması", state: ok(s["databaseProtection"]) },
        { key: "isolation", label: "Müşteri izolasyonu", state: ok(s["customerIsolation"]) },
        { key: "cost", label: "Tedarikçi maliyet koruması", state: ok(s["supplierCostProtection"]) },
        { key: "roles", label: "Admin rol koruması", state: ok(s["roleProtection"]) },
        { key: "rate", label: "İstek sınırlama", state: ok(s["rateLimiting"]) },
        { key: "admin", label: "Sunucu tarafı Admin yetkisi", state: "ACTIVE" },
        { key: "qr", label: "QR / aktivasyon koruması", state: ok(s["customerIsolation"]) },
        { key: "payment", label: "Gerçek ödeme", state: "DISABLED" },
        { key: "testPayment", label: "Test ödeme modu", state: flag?.enabled ? "ENABLED" : "DISABLED" },
        { key: "provisioning", label: "Canlı eSIM tedariki", state: liveProvisioning ? "ENABLED" : "DISABLED" },
      ],
    };
  });
