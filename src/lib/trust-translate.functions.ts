import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdminRole, type AdminCtx } from "@/lib/admin-guard";
import { UI_LOCALES } from "@/i18n/locales";
import { STOREFRONT_TRANSLATION_STYLE } from "@/domain/storefront/translation-style";

const input = z.object({ entries: z.record(z.string().max(120), z.string().min(1).max(900)).refine((value) => Object.keys(value).length <= 70) });

/** Generates draft translations; publishing and applying them remain Admin actions. */
export const translateTrustCopy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => input.parse(data))
  .handler(async ({ context, data }) => {
    await assertAdminRole(context as AdminCtx);
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("Çeviri servisi kullanılamıyor.");
    const targets = UI_LOCALES.filter((code) => code !== "tr");
    const translated: Record<string, Record<string, string>> = {};
    // Batches bound response size so the generated text cannot be silently truncated.
    const entries = Object.entries(data.entries);
    for (let index = 0; index < entries.length; index += 6) {
      const batch = Object.fromEntries(entries.slice(index, index + 6));
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: "Translate Turkish storefront trust and social-proof presentation copy accurately into each requested language. Preserve brand names, numbers, currency, and the meaning of commercial claims; do not invent claims. Each field must retain its source key. Return only the requested JSON via the tool. " + STOREFRONT_TRANSLATION_STYLE },
            { role: "user", content: JSON.stringify({ sources: batch, targets }) },
          ],
          tools: [{ type: "function", function: { name: "translations", parameters: { type: "object", properties: Object.fromEntries(Object.keys(batch).map((id) => [id, { type: "object", properties: Object.fromEntries(targets.map((code) => [code, { type: "string" }])), required: targets }])), required: Object.keys(batch) } } }],
          tool_choice: { type: "function", function: { name: "translations" } },
        }),
      });
      if (!res.ok) throw new Error(res.status === 429 ? "Çeviri servisi yoğun." : res.status === 402 ? "Çeviri kredisi tükendi." : "Çeviri başarısız oldu.");
      const json: any = await res.json();
      const args = json?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
      const result = typeof args === "string" ? JSON.parse(args) : args;
      for (const id of Object.keys(batch)) {
        if (!result?.[id] || targets.some((code) => typeof result[id][code] !== "string" || !result[id][code].trim())) throw new Error("Bazı çeviriler eksik; taslak değiştirilmedi.");
        translated[id] = Object.fromEntries(targets.map((code) => [code, String(result[id][code]).trim().slice(0, 900)]));
      }
    }
    return translated;
  });