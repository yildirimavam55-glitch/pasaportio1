import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdminRole, type AdminCtx } from "@/lib/admin-guard";

export type ReviewTranslations = { tr: string; de: string; en: string };

/** Admin-only: translate a customer review into TR/DE/EN for review management. Public pages keep the original text. */
export const translateReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { text: string; language: string }) => {
    const text = String(input?.text ?? "").trim().slice(0, 2000);
    const language = String(input?.language ?? "").slice(0, 10);
    if (!text) throw new Error("Yorum metni boş");
    return { text, language };
  })
  .handler(async ({ data, context }): Promise<ReviewTranslations> => {
    await assertAdminRole(context as AdminCtx);
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("AI yapılandırması eksik");
    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key, Authorization: `Bearer ${key}`, "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        stream: true,
        store: false,
        reasoning: { effort: "low" },
        instructions: "You translate short customer reviews faithfully. Keep meaning, tone and length; do not add or embellish claims. Reply with only a JSON object with string keys tr, de, en (Turkish, German, English). If the source is already in one of those languages, return it unchanged for that key.",
        input: `Source language code: ${data.language}\nReview:\n${data.text}`,
      }),
    });
    if (!res.ok || !res.body) {
      const msg = res.status === 402 ? "AI kredisi yetersiz" : res.status === 429 ? "Çok fazla istek, biraz sonra tekrar deneyin" : res.status === 403 ? "AI erişimi reddedildi" : `Çeviri başarısız (${res.status})`;
      throw new Error(msg);
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "", out = "", refused = false;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const frames = buffer.split("\n\n");
      buffer = frames.pop() ?? "";
      for (const frame of frames) {
        const line = frame.split("\n").find((l) => l.startsWith("data:"));
        if (!line) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const ev = JSON.parse(payload);
          if (ev.type === "response.output_text.delta") out += ev.delta ?? "";
          if (ev.type === "response.refusal.delta") refused = true;
          if (ev.type === "error" || ev.type === "response.failed") throw new Error("Çeviri başarısız");
        } catch (e) { if (e instanceof Error && e.message === "Çeviri başarısız") throw e; }
      }
    }
    if (refused) throw new Error("Model bu yorumu çevirmeyi reddetti");
    const match = out.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Çeviri yanıtı okunamadı");
    const parsed = JSON.parse(match[0]);
    const clean = (v: unknown) => String(v ?? "").trim().slice(0, 2000);
    return { tr: clean(parsed.tr), de: clean(parsed.de), en: clean(parsed.en) };
  });
