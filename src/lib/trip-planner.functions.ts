import { createServerFn } from "@tanstack/react-start";
import { estimateUsageNeed } from "@/domain/esim/usage-recommendation";
import type { UsageKind } from "@/domain/experience/types";

export type TripPlanInput = { countries: string[]; startDate: string; endDate: string; usage: UsageKind[]; locale: string };
export type TripRecommendation = { packageId: string; reason: string };
export type TripPlanResult = { recommendations: TripRecommendation[]; days: number; requiredGb: number };

/** Whole trip length in days, clamped so prompts and estimates stay sane. */
export function tripDays(startDate: string, endDate: string): number {
  const start = Date.parse(startDate);
  const end = Date.parse(endDate);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 7;
  return Math.min(90, Math.max(1, Math.round((end - start) / 86_400_000) + 1));
}

const VALID_USAGE: UsageKind[] = ["MESSAGING", "MAPS", "SOCIAL", "VIDEO"];

/**
 * AI trip planner: compares real published catalogue packages for the traveler's
 * destinations, dates and usage, and returns up to three reasoned recommendations.
 * Package data always comes from the live catalogue — the model only ranks and explains.
 */
export const recommendTripPackages = createServerFn({ method: "POST" })
  .inputValidator((input: TripPlanInput) => {
    const countries = (input?.countries ?? []).map((iso) => String(iso).toUpperCase().slice(0, 2)).filter(Boolean).slice(0, 10);
    if (!countries.length) throw new Error("En az bir ülke seç");
    const usage = (input?.usage ?? []).filter((u): u is UsageKind => VALID_USAGE.includes(u as UsageKind));
    return {
      countries,
      startDate: String(input?.startDate ?? "").slice(0, 10),
      endDate: String(input?.endDate ?? "").slice(0, 10),
      usage: usage.length ? usage : (["MESSAGING", "MAPS"] as UsageKind[]),
      locale: ["tr", "de", "en"].includes(input?.locale) ? input.locale : "en",
    };
  })
  .handler(async ({ data }): Promise<TripPlanResult> => {
    const days = tripDays(data.startDate, data.endDate);
    const estimate = estimateUsageNeed({ days, usage: data.usage });
    const { loadEsimPackages } = await import("@/lib/esim-catalogue.functions");
    const packages = await loadEsimPackages(data.countries);
    if (!packages.length) return { recommendations: [], days, requiredGb: estimate.requiredGb };

    // Prefer plans covering every destination, then fill with strong single-country options.
    const full = packages.filter((p) => data.countries.every((iso) => p.coverage.includes(iso)));
    const rest = packages.filter((p) => !full.includes(p));
    const candidates = [...full, ...rest]
      .filter((p) => p.salePrice != null && p.salePrice > 0)
      .sort((a, b) => (b.coverage.length >= data.countries.length ? 1 : 0) - (a.coverage.length >= data.countries.length ? 1 : 0) || (a.salePrice ?? 0) - (b.salePrice ?? 0))
      .slice(0, 40)
      .map((p) => ({
        id: p.id,
        gb: p.unlimited ? "unlimited" : p.dataGb,
        days: p.validityDays,
        price: p.salePrice,
        currency: p.currency,
        covers: p.coverage.length,
        coversAll: data.countries.every((iso) => p.coverage.includes(iso)),
        fiveG: p.supports5g === true,
      }));

    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("AI yapılandırması eksik");
    const lang = data.locale === "tr" ? "Turkish" : data.locale === "de" ? "German" : "English";
    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key, Authorization: `Bearer ${key}`, "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        stream: true,
        store: false,
        reasoning: { effort: "low" },
        instructions: `You are a travel eSIM advisor. Compare the candidate plans and pick the best 1-3 for the trip. Prefer plans that cover ALL destinations, enough data for the estimated need, validity >= trip days, then lowest price. Never invent plans or prices; only use candidate ids. Write each reason in ${lang}, one short sentence, factual.`,
        input: `Trip: ${data.countries.join(", ")}; ${days} days; estimated need ~${estimate.requiredGb} GB.\nCandidates (JSON):\n${JSON.stringify(candidates)}`,
        text: {
          format: {
            type: "json_schema",
            name: "trip_recommendations",
            strict: true,
            schema: {
              type: "object",
              properties: {
                recommendations: {
                  type: "array",
                  maxItems: 3,
                  items: {
                    type: "object",
                    properties: { packageId: { type: "string" }, reason: { type: "string" } },
                    required: ["packageId", "reason"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["recommendations"],
              additionalProperties: false,
            },
          },
        },
      }),
    });
    if (!res.ok || !res.body) {
      const msg = res.status === 402 ? "AI kredisi yetersiz" : res.status === 429 ? "Çok fazla istek, biraz sonra tekrar deneyin" : res.status === 403 ? "AI erişimi reddedildi" : `Öneri alınamadı (${res.status})`;
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
          if (ev.type === "error" || ev.type === "response.failed") throw new Error("Öneri alınamadı");
        } catch (e) { if (e instanceof Error && e.message === "Öneri alınamadı") throw e; }
      }
    }
    if (refused) throw new Error("Model bu isteği yanıtlamayı reddetti");
    const match = out.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Öneri yanıtı okunamadı");
    const parsed = JSON.parse(match[0]) as { recommendations?: Array<{ packageId?: unknown; reason?: unknown }> };
    const validIds = new Set(candidates.map((c) => c.id));
    const recommendations = (parsed.recommendations ?? [])
      .flatMap((r) => {
        const packageId = String(r?.packageId ?? "");
        const reason = String(r?.reason ?? "").trim().slice(0, 300);
        return validIds.has(packageId) && reason ? [{ packageId, reason }] : [];
      })
      .slice(0, 3);
    return { recommendations, days, requiredGb: estimate.requiredGb };
  });
