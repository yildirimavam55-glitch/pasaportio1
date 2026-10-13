/**
 * Real-time pre-purchase validation (security baseline P1-2).
 *
 * - Signed-in customers only, rate limited per user.
 * - Only PUBLISHED, customer-visible products can be validated.
 * - The response is a decision only: never supplier cost, margin or raw
 *   provider payloads. Cost/margin checks happen server-side.
 * - NEVER places an order, reserves stock or consumes provider balance.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { checkMarginProtection } from "@/domain/pricing";

export type ValidationOutcome = "OK" | "UNAVAILABLE" | "PRICE_REVIEW" | "PROVIDER_UNREACHABLE" | "NOT_CONFIGURED";

/** Public-safe shape. Adding cost/margin fields here violates the security baseline. */
export type ValidationResult = {
  outcome: ValidationOutcome;
  productId: string;
  currency: string;
  salePrice: number | null;
  message: string;
};

export const validateProductForCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ productId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<ValidationResult> => {
    const { enforceRateLimit } = await import("@/lib/rate-limit.server");
    await enforceRateLimit("checkoutValidateUser", context.userId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db: any = supabaseAdmin;

    const { data: product } = await db
      .from("service_products")
      .select("id, sale_price, provider_cost, currency, provider_available, lifecycle, customer_visible, provider_external_id, primary_provider_id")
      .eq("id", data.productId)
      .eq("lifecycle", "PUBLISHED")
      .eq("customer_visible", true)
      .maybeSingle();

    const result = (outcome: ValidationOutcome, message: string, currency?: string | null): ValidationResult => ({
      outcome,
      productId: data.productId,
      currency: currency ?? product?.currency ?? "EUR",
      salePrice: product?.sale_price == null ? null : Number(product.sale_price),
      message,
    });

    if (!product) return result("UNAVAILABLE", "Ürün bulunamadı.");
    if (!product.provider_available) return result("UNAVAILABLE", "Bu paket şu anda satın alınamıyor.");
    if (!product.primary_provider_id || !product.provider_external_id) {
      return result("NOT_CONFIGURED", "Bu paket şu anda doğrulanamıyor.");
    }

    const { data: provider } = await db
      .from("providers")
      .select("id, code, name, adapter_type, minimum_margin_percent")
      .eq("id", product.primary_provider_id)
      .maybeSingle();
    if (!provider) return result("NOT_CONFIGURED", "Bu paket şu anda doğrulanamıyor.");

    const { data: connection } = await db
      .from("provider_connections")
      .select("base_url, credential_secret_names, config")
      .eq("provider_id", provider.id)
      .order("created_at")
      .limit(1)
      .maybeSingle();

    // Fail-closed: no live supplier validation while provider API access is off.
    const { isBalanceCheckAllowed } = await import("@/lib/balance-monitor.server");
    if (!(await isBalanceCheckAllowed(db))) return result("NOT_CONFIGURED", "Bu paket şu anda doğrulanamıyor.");
    const { buildAdapter } = await import("@/providers/adapters/factory.server");
    const adapter = buildAdapter(provider, connection ?? null);
    if (!adapter.validateItem || !adapter.hasCredential()) {
      return result("NOT_CONFIGURED", "Bu paket şu anda doğrulanamıyor.");
    }

    let validated: { available: boolean; providerCost: number | null; currency: string | null };
    try {
      validated = await adapter.validateItem(product.provider_external_id);
    } catch {
      return result("PROVIDER_UNREACHABLE", "Şu anda doğrulama yapılamıyor.");
    }
    if (!validated.available) return result("UNAVAILABLE", "Bu paket şu anda mevcut değil.");

    const salePrice = product.sale_price == null ? null : Number(product.sale_price);
    const minimumMargin = provider.minimum_margin_percent == null ? null : Number(provider.minimum_margin_percent);
    const cost = validated.providerCost ?? (product.provider_cost == null ? null : Number(product.provider_cost));
    if (salePrice != null && cost != null && minimumMargin != null) {
      if (checkMarginProtection(salePrice, cost, minimumMargin).flagged) {
        return result("PRICE_REVIEW", "Bu paketin fiyatı güncelleniyor.");
      }
    }
    return result("OK", "Paket doğrulandı.");
  });
