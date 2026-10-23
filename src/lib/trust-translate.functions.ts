import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { type AdminCtx } from "@/lib/admin-guard";
import { cmsTranslationInput } from "./cms-translation.server";

/** Independent server-only adapter. Always disabled until separately configured AND owner-approved. */
export const translateTrustCopy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => cmsTranslationInput.parse(data))
  .handler(async ({ context, data }) => {
    const { handleCmsTranslation } = await import("./cms-translation.server");
    return handleCmsTranslation(context as AdminCtx, data);
  });
