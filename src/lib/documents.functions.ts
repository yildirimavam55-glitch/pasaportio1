/**
 * Admin → Belgeler: PDF preview with synthetic data only. Admin role verified first.
 * Nothing is stored, numbered or sent; templates come from the code seed until the
 * template tables are approved.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdminRole, type AdminCtx } from "@/lib/admin-guard";
import { DOCUMENT_KINDS, DOCUMENT_LOCALES, sampleData, type DocumentKind, type DocumentLocale } from "@/domain/documents/catalog";

export const previewDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { kind: string; locale: string }) => {
    if (!(DOCUMENT_KINDS as readonly string[]).includes(input?.kind)) throw new Error("Geçersiz belge türü.");
    if (!(DOCUMENT_LOCALES as readonly string[]).includes(input?.locale)) throw new Error("Geçersiz dil.");
    return { kind: input.kind as DocumentKind, locale: input.locale as DocumentLocale };
  })
  .handler(async ({ context, data }) => {
    await assertAdminRole(context as AdminCtx);
    const { renderDocument } = await import("@/domain/documents/render");
    const { loadDocumentFonts } = await import("@/domain/documents/fonts.server");
    const result = await renderDocument(data.kind, data.locale, sampleData(data.kind), await loadDocumentFonts());
    let bin = "";
    for (let i = 0; i < result.bytes.length; i++) bin += String.fromCharCode(result.bytes[i]!);
    return { base64: btoa(bin), locale: result.locale, fallback: result.fallback, pages: result.pages, size: result.bytes.length };
  });
