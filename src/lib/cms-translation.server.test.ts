import { describe, expect, it, vi } from "vitest";
import { runCmsTranslation, validTranslation, CMS_TRANSLATION_DISABLED, type TranslationDependencies } from "./cms-translation.server";
import { TRANSLATION_TARGETS } from "@/domain/storefront/translation-workflow";
function deps(): TranslationDependencies {
  return { verifyAdmin: vi.fn(async () => {}), consumeBudget: vi.fn(async () => {}), fetch: vi.fn(), env: {} };
}
function enabled() {
  const d = deps(); d.env = { CMS_TRANSLATION_ENABLED: "true", CMS_TRANSLATION_APPROVED: "true", CMS_TRANSLATION_PROVIDER: "openai", CMS_TRANSLATION_API_KEY: "synthetic-offline-only", CMS_TRANSLATION_MODEL: "gpt-4.1-mini" }; return d;
}
const reply = (data: unknown) => new Response(JSON.stringify({ choices: [{ finish_reason: "stop", message: { content: JSON.stringify(data) } }] }), { status: 200 });
const field = (text = "Synthetic translation") => Object.fromEntries(TRANSLATION_TARGETS.map(code => [code, text]));

describe("independent CMS translation service – fake provider, no database or network", () => {
  it("rejects anonymous/non-admin before config, budget or provider", async () => {
    const d = enabled(); d.verifyAdmin = vi.fn(async () => { throw new Error("ADMIN_REQUIRED"); });
    await expect(runCmsTranslation({ entries: { title: "Kaynak" } }, d)).rejects.toThrow("ADMIN_REQUIRED");
    expect(d.consumeBudget).not.toHaveBeenCalled(); expect(d.fetch).not.toHaveBeenCalled();
  });
  it("is fail-closed without configuration, approval or an allowed model", async () => {
    for (const missing of ["CMS_TRANSLATION_API_KEY", "CMS_TRANSLATION_APPROVED", "CMS_TRANSLATION_ENABLED", "CMS_TRANSLATION_PROVIDER", "CMS_TRANSLATION_MODEL"]) {
      const d = enabled(); delete d.env[missing];
      await expect(runCmsTranslation({ entries: { title: "Kaynak" } }, d)).rejects.toThrow(CMS_TRANSLATION_DISABLED);
      expect(d.fetch).not.toHaveBeenCalled(); expect(d.consumeBudget).not.toHaveBeenCalled();
    }
  });
  it("does not call provider when atomic budget is unavailable/exhausted", async () => {
    const d = enabled(); d.consumeBudget = vi.fn(async () => { throw new Error("BUDGET_UNAVAILABLE"); });
    await expect(runCmsTranslation({ entries: { title: "Kaynak" } }, d)).rejects.toThrow("BUDGET_UNAVAILABLE"); expect(d.fetch).not.toHaveBeenCalled();
  });
  it("limits input size and does not spend budget on invalid input", async () => {
    const d = enabled();
    await expect(runCmsTranslation({ entries: Object.fromEntries(Array.from({ length: 7 }, (_, i) => [`key${i}`, "Kaynak"])) }, d)).rejects.toThrow();
    expect(d.consumeBudget).not.toHaveBeenCalled(); expect(d.fetch).not.toHaveBeenCalled();
  });
  it("uses fixed independent endpoint, explicit schema, bounded tokens, and returns 13 locales", async () => {
    const d = enabled(); d.fetch = vi.fn(async () => reply({ title: field() }));
    const result = await runCmsTranslation({ entries: { title: "Kaynak" } }, d);
    expect(Object.keys(result.translations["title"]!)).toHaveLength(13); expect(result.failures).toEqual({});
    const call = vi.mocked(d.fetch).mock.calls[0]!;
    expect(call[0]).toBe("https://api.openai.com/v1/chat/completions");
    const request = JSON.parse(String(call[1]?.body)); expect(request.max_completion_tokens).toBe(8192);
    expect(request.response_format.json_schema.strict).toBe(true);
    expect(d.verifyAdmin).toHaveBeenCalledOnce(); expect(d.consumeBudget).toHaveBeenCalledOnce();
  });
  it("preserves successful fields while reporting missing locales and malformed values", async () => {
    const d = enabled(); d.fetch = vi.fn(async () => reply({ title: field(), subtitle: { de: "Incomplete" } }));
    const result = await runCmsTranslation({ entries: { title: "Kaynak", subtitle: "Başka" } }, d);
    expect(result.translations["title"]).toBeDefined(); expect(result.failures["subtitle"]).toBe("E_TRANSLATION_VALIDATION"); expect(result.translations["subtitle"]).toBeUndefined();
  });
  it("honors eligible target list without translating manual/unchanged languages", async () => {
    const d = enabled(); d.fetch = vi.fn(async () => reply({ title: { es: "Synthetic" } }));
    const result = await runCmsTranslation({ entries: { title: "Kaynak" }, targets: { title: ["es"] } }, d);
    expect(result.translations["title"]).toEqual({ es: "Synthetic" });
  });
  it("keeps partial batch success and never exposes provider messages or retries automatically", async () => {
    const d = enabled(); d.fetch = vi.fn().mockResolvedValueOnce(reply({ a: field(), b: field(), c: field() })).mockRejectedValueOnce(new Error("PRIVATE_UPSTREAM_DETAILS"));
    const result = await runCmsTranslation({ entries: { a: "Bir", b: "İki", c: "Üç", d: "Dört" } }, d);
    expect(Object.keys(result.translations)).toHaveLength(3); expect(result.failures["d"]).toBe("E_TRANSLATION_PROVIDER"); expect(JSON.stringify(result)).not.toContain("PRIVATE_UPSTREAM_DETAILS"); expect(d.fetch).toHaveBeenCalledTimes(2);
  });
  it("rejects oversized, malformed and truncated responses", async () => {
    for (const response of [new Response("x".repeat(160001)), new Response("not-json"), new Response(JSON.stringify({ choices: [{ finish_reason: "length", message: { content: "{}" } }] }))]) {
      const d = enabled(); d.fetch = vi.fn(async () => response);
      expect((await runCmsTranslation({ entries: { title: "Kaynak" } }, d)).failures["title"]).toBe("E_TRANSLATION_PROVIDER");
    }
  });
  it("preserves brands, placeholders, numbers and units, rejects additions and HTML", () => {
    expect(validTranslation("Pasaport.io eSIM 5 GB {{name}} %s", "{{name}} %s Pasaport.io eSIM 5 GB")).toBe(true);
    for (const text of ["Pasaport.io eSIM 10 GB {{name}} %s", "Pasaport.io eSIM 5 GB %s", "<b>Pasaport.io eSIM 5 GB {{name}} %s</b>", "Otherbrand eSIM 5 GB {{name}} %s", "Pasaport.io eSIM 5 GB {{name}} %s 99"]) expect(validTranslation("Pasaport.io eSIM 5 GB {{name}} %s", text)).toBe(false);
  });
});
