/**
 * Real-time pre-purchase validation foundation.
 *
 * Catalogue sync alone is not enough for checkout safety: before any future
 * real order, the selected internal product is re-checked against the provider.
 * This NEVER places an order, reserves stock or consumes provider balance.
 */
import { createServerFn } from "@tanstack/react-start";
import { checkMarginProtection } from "@/domain/pricing";

export type ValidationOutcome =
  | "OK"
  | "UNAVAILABLE"
  | "PRICE_REVIEW"
  | "PROVIDER_UNREACHABLE"
  | "NOT_CONFIGURED";

export type ValidationResult = {
  outcome: ValidationOutcome;
  productId: string;
  storedCost: number | null;
  validatedCost: number | null;
  currency: string;
  salePrice: number | null;
  marginPercent: number | null;
  minimumMarginPercent: number | null;
  message: string;
};

/**
 * Validate an internal product against its provider. Public-safe: it returns
 * a decision, never provider credentials or raw provider payloads.
 */
export const validateProductForCheckout = createServerFn({ method: "POST" })
  .inputValidator((input: { productId: string }) => ({ productId: String(input?.productId ?? "") }))
  .handler(async ({ data }): Promise<ValidationResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db: any = supabaseAdmin;

    const { data: product } = await db
      .from("service_products")
      .select("id, name, sale_price, provider_cost, currency, provider_available, lifecycle, customer_visible, provider_external_id, primary_provider_id")
      .eq("id", data.productId)
      .maybeSingle();

    const fail = (outcome: ValidationOutcome, message: string): ValidationResult => ({
      outcome,
      productId: data.productId,
      storedCost: product?.provider_cost == null ? null : Number(product.provider_cost),
      validatedCost: null,
      currency: product?.currency ?? "EUR",
      salePrice: product?.sale_price == null ? null : Number(product.sale_price),
      marginPercent: null,
      minimumMarginPercent: null,
      message,
    });

    if (!product) return fail("UNAVAILABLE", "Ürün bulunamadı.");
    if (!product.provider_available || product.lifecycle === "UNAVAILABLE") {
      return fail("UNAVAILABLE", "Bu paket şu anda satın alınamıyor.");
    }
    if (!product.primary_provider_id || !product.provider_external_id) {
      return fail("NOT_CONFIGURED", "Ürün bir provider ile eşleşmemiş.");
    }

    const { data: provider } = await db
      .from("providers")
      .select("id, code, name, adapter_type, minimum_margin_percent")
      .eq("id", product.primary_provider_id)
      .maybeSingle();
    if (!provider) return fail("NOT_CONFIGURED", "Provider tanımı bulunamadı.");

    const { data: connection } = await db
      .from("provider_connections")
      .select("base_url, credential_secret_names, config")
      .eq("provider_id", provider.id)
      .order("created_at")
      .limit(1)
      .maybeSingle();

    const { buildAdapter } = await import("@/providers/adapters/factory.server");
    const adapter = buildAdapter(provider, connection ?? null);
    if (!adapter.validateItem || !adapter.hasCredential()) {
      return fail("NOT_CONFIGURED", "Provider doğrulaması henüz yapılandırılmadı.");
    }

    let validated: { available: boolean; providerCost: number | null; currency: string | null };
    try {
      validated = await adapter.validateItem(product.provider_external_id);
    } catch {
      return fail("PROVIDER_UNREACHABLE", "Provider şu anda yanıt vermiyor.");
    }

    const salePrice = product.sale_price == null ? null : Number(product.sale_price);
    const minimumMargin =
      provider.minimum_margin_percent == null ? null : Number(provider.minimum_margin_percent);
    const cost = validated.providerCost ?? (product.provider_cost == null ? null : Number(product.provider_cost));

    if (!validated.available) return fail("UNAVAILABLE", "Bu paket provider tarafında şu anda mevcut değil.");

    let marginPercent: number | null = null;
    if (salePrice != null && cost != null) {
      const check = checkMarginProtection(salePrice, cost, minimumMargin ?? 0);
      marginPercent = Math.round(check.marginPercent * 10) / 10;
      if (minimumMargin != null && check.flagged) {
        return {
          outcome: "PRICE_REVIEW",
          productId: product.id,
          storedCost: product.provider_cost == null ? null : Number(product.provider_cost),
          validatedCost: cost,
          currency: validated.currency ?? product.currency ?? "EUR",
          salePrice,
          marginPercent,
          minimumMarginPercent: minimumMargin,
          message: "Provider maliyeti değişti, fiyat gözden geçirilmeli.",
        };
      }
    }

    return {
      outcome: "OK",
      productId: product.id,
      storedCost: product.provider_cost == null ? null : Number(product.provider_cost),
      validatedCost: cost,
      currency: validated.currency ?? product.currency ?? "EUR",
      salePrice,
      marginPercent,
      minimumMarginPercent: minimumMargin,
      message: "Paket doğrulandı.",
    };
  });
