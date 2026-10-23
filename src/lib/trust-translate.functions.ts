import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdminRole, type AdminCtx } from "@/lib/admin-guard";
import { cmsTranslationInput } from "./cms-translation.server";

/** Independent server-only adapter. Always disabled until separately configured AND owner-approved. */
export const translateTrustCopy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => cmsTranslationInput.parse(data))
  .handler(async ({ context, data }) => {
    const { runCmsTranslation } = await import("./cms-translation.server");
    return runCmsTranslation(data, {
      verifyAdmin: () => assertAdminRole(context as AdminCtx),
      env: process.env, fetch,
      consumeBudget: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        // Existing atomic limiter, no schema changes. A failed check consumes capacity and fails closed.
        // Global 10 requests/day; per-admin 2/minute. At most 2 × 8192 output tokens per request.
        for (const policy of [{ bucket: "cms-translation:global:daily", limit: 10, seconds: 86400 }, { bucket: `cms-translation:user:${(context as AdminCtx).userId}`, limit: 2, seconds: 60 }]) {
          const { data: allowed, error } = await (supabaseAdmin as any).rpc("consume_rate_limit", { _bucket: policy.bucket, _limit: policy.limit, _window_seconds: policy.seconds });
          if (error || allowed !== true) throw new Error("E_TRANSLATION_BUDGET: Çeviri sınırı dolu veya kontrol kullanılamıyor.");
        }
      },
    });
  });
