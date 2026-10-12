import {
  allowedVariables,
  EMAIL_LOCALES,
  EMAIL_TEMPLATE_KEYS,
  FALLBACK_LOCALE,
  RTL_LOCALES,
  TEMPLATE_ACTION,
  type EmailLocale,
  type EmailTemplateKey,
  type TemplateCopy,
} from "./catalog";

/**
 * Provider-independent, safe renderer. Bodies are plain text with a tiny markup:
 *   "# Heading" line · blank line = new paragraph · "[[button:Label]]" line = CTA to the
 *   template's fixed action URL · {{variable}} placeholders from the allowlist.
 * Everything (copy and variable values) is HTML-escaped; raw HTML is never interpreted.
 * The output is a complete HTML string any future mail provider can send.
 */

export const LIMITS = { subject: 200, preheader: 250, body: 8000 } as const;
const VAR_RE = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function isTemplateKey(value: unknown): value is EmailTemplateKey {
  return typeof value === "string" && (EMAIL_TEMPLATE_KEYS as readonly string[]).includes(value);
}
export function isEmailLocale(value: unknown): value is EmailLocale {
  return typeof value === "string" && (EMAIL_LOCALES as readonly string[]).includes(value);
}

export function usedVariables(text: string): string[] {
  return [...new Set([...text.matchAll(VAR_RE)].map((m) => m[1]!))];
}

/** Returns Turkish error messages; empty array = valid. */
export function validateCopy(key: EmailTemplateKey, copy: TemplateCopy): string[] {
  const errors: string[] = [];
  const allowed = new Set(allowedVariables(key));
  if (!copy.subject.trim()) errors.push("Konu boş olamaz.");
  if (!copy.body.trim()) errors.push("Metin boş olamaz.");
  if (copy.subject.length > LIMITS.subject) errors.push(`Konu en fazla ${LIMITS.subject} karakter olabilir.`);
  if (copy.preheader.length > LIMITS.preheader) errors.push(`Önizleme metni en fazla ${LIMITS.preheader} karakter olabilir.`);
  if (copy.body.length > LIMITS.body) errors.push(`Metin en fazla ${LIMITS.body} karakter olabilir.`);
  for (const field of ["subject", "preheader", "body"] as const) {
    for (const name of usedVariables(copy[field])) {
      if (!allowed.has(name)) errors.push(`İzin verilmeyen değişken: {{${name}}}`);
    }
  }
  if (/<\s*\/?\s*[a-z!]/i.test(copy.subject + copy.preheader + copy.body)) errors.push("HTML etiketleri kullanılamaz.");
  const plain = (copy.subject + "\n" + copy.preheader + "\n" + copy.body).replace(VAR_RE, "");
  if (/https?:\/\/[^\s]*[?&](token|code|key)=/i.test(plain)) errors.push("Metne token içeren bağlantı yazılamaz.");
  return [...new Set(errors)];
}

/** Locale resolution: requested → English → Turkish. */
export function resolveCopy(
  translations: Partial<Record<EmailLocale, TemplateCopy>>,
  locale: EmailLocale,
): { copy: TemplateCopy; locale: EmailLocale; fallback: boolean } | null {
  for (const candidate of [locale, FALLBACK_LOCALE, "tr" as EmailLocale]) {
    const copy = translations[candidate];
    if (copy) return { copy, locale: candidate, fallback: candidate !== locale };
  }
  return null;
}

export function fillText(text: string, key: EmailTemplateKey, data: Record<string, string>): string {
  const allowed = new Set(allowedVariables(key));
  return text.replace(VAR_RE, (_m, name: string) => (allowed.has(name) ? String(data[name] ?? "") : ""));
}

function safeUrl(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export type RenderedEmail = { subject: string; preheader: string; html: string; text: string };

export function renderEmail(key: EmailTemplateKey, copy: TemplateCopy, locale: EmailLocale, data: Record<string, string>): RenderedEmail {
  const subject = fillText(copy.subject, key, data).replace(/[\r\n]+/g, " ").trim();
  const preheader = fillText(copy.preheader, key, data);
  const actionUrl = safeUrl(data[TEMPLATE_ACTION[key]]);
  const dir = RTL_LOCALES.includes(locale) ? "rtl" : "ltr";
  const blocks = copy.body.replace(/\r\n/g, "\n").split(/\n{2,}/);
  const html: string[] = [];
  const text: string[] = [];
  for (const raw of blocks) {
    const block = raw.trim();
    if (!block) continue;
    const button = block.match(/^\[\[button:([^\]]{1,80})\]\]$/);
    if (button) {
      const label = fillText(button[1]!, key, data);
      if (actionUrl) {
        html.push(`<p style="margin:24px 0"><a href="${escapeHtml(actionUrl)}" style="display:inline-block;background:#0b5a50;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:8px">${escapeHtml(label)}</a></p>`);
        text.push(`${label}: ${actionUrl}`);
      }
      continue;
    }
    if (block.startsWith("# ")) {
      const heading = fillText(block.slice(2), key, data);
      html.push(`<h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#0d2e2a">${escapeHtml(heading)}</h1>`);
      text.push(heading);
      continue;
    }
    const para = fillText(block, key, data);
    html.push(`<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#33413f">${escapeHtml(para).replace(/\n/g, "<br>")}</p>`);
    text.push(para);
  }
  const siteName = escapeHtml(data["siteName"] ?? "pasaport.io");
  const doc = `<!doctype html><html lang="${locale}" dir="${dir}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(subject)}</title></head><body style="margin:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif"><div style="display:none;max-height:0;overflow:hidden">${escapeHtml(preheader)}</div><div style="max-width:560px;margin:0 auto;padding:28px 22px"><p style="margin:0 0 24px;font-weight:700;font-size:18px;color:#0b5a50">${siteName}</p>${html.join("")}<hr style="border:none;border-top:1px solid #e3ebe9;margin:28px 0 14px"><p style="margin:0;font-size:12px;color:#7a8a87">${siteName}</p></div></body></html>`;
  return { subject, preheader, html: doc, text: text.join("\n\n") };
}
