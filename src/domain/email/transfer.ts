import { z } from "zod";
import { EMAIL_LOCALES, EMAIL_TEMPLATE_KEYS, SEED_TEMPLATES, TEMPLATE_META, type EmailLocale, type EmailTemplateKey, type TemplateCopy } from "./catalog";
import { LIMITS, validateCopy } from "./render";

/** Portable JSON format used for export, import and the code seed. */
export const EXPORT_FORMAT = "pasaportio.email-templates";
export const EXPORT_VERSION = 1;

const copySchema = z.object({
  subject: z.string().max(LIMITS.subject),
  preheader: z.string().max(LIMITS.preheader).default(""),
  body: z.string().max(LIMITS.body),
});

export const exportSchema = z.object({
  format: z.literal(EXPORT_FORMAT),
  version: z.literal(EXPORT_VERSION),
  exportedAt: z.string().optional(),
  templates: z
    .array(
      z.object({
        key: z.enum(EMAIL_TEMPLATE_KEYS),
        name: z.string().min(1).max(120),
        description: z.string().max(500).default(""),
        active: z.boolean().default(true),
        translations: z.record(z.enum(EMAIL_LOCALES), copySchema),
      }),
    )
    .max(EMAIL_TEMPLATE_KEYS.length),
});
export type TemplateBundle = z.infer<typeof exportSchema>;
export type BundleTemplate = TemplateBundle["templates"][number];

export function seedBundle(): TemplateBundle {
  return {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    templates: EMAIL_TEMPLATE_KEYS.map((key) => ({
      key,
      ...TEMPLATE_META[key],
      active: true,
      translations: { ...SEED_TEMPLATES[key] },
    })),
  };
}

export type ImportChange = {
  key: EmailTemplateKey;
  kind: "new" | "changed" | "unchanged";
  locales: { locale: EmailLocale; kind: "added" | "changed" | "removed" }[];
};

/** Parses + validates a bundle; returns problems instead of throwing. */
export function parseBundle(input: unknown): { bundle: TemplateBundle | null; errors: string[] } {
  const parsed = exportSchema.safeParse(input);
  if (!parsed.success) {
    return { bundle: null, errors: parsed.error.issues.slice(0, 20).map((i) => `${i.path.join(".") || "dosya"}: ${i.message}`) };
  }
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const t of parsed.data.templates) {
    if (seen.has(t.key)) errors.push(`${t.key}: aynı şablon iki kez var.`);
    seen.add(t.key);
    for (const [locale, copy] of Object.entries(t.translations)) {
      for (const e of validateCopy(t.key, copy as TemplateCopy)) errors.push(`${t.key} / ${locale}: ${e}`);
    }
    for (const required of ["tr", "en", "de"] as const) {
      if (!t.translations[required]) errors.push(`${t.key}: ${required.toUpperCase()} içeriği eksik.`);
    }
  }
  return { bundle: errors.length ? null : parsed.data, errors };
}

const same = (a?: TemplateCopy, b?: TemplateCopy) => !!a && !!b && a.subject === b.subject && (a.preheader ?? "") === (b.preheader ?? "") && a.body === b.body;

/** Diff between current DB state and an incoming bundle. Import never deletes templates. */
export function diffBundle(current: BundleTemplate[], incoming: TemplateBundle): ImportChange[] {
  const byKey = new Map(current.map((t) => [t.key, t]));
  return incoming.templates.map((t) => {
    const cur = byKey.get(t.key);
    if (!cur) return { key: t.key, kind: "new" as const, locales: Object.keys(t.translations).map((l) => ({ locale: l as EmailLocale, kind: "added" as const })) };
    const locales: ImportChange["locales"] = [];
    for (const l of EMAIL_LOCALES) {
      const a = cur.translations[l] as TemplateCopy | undefined;
      const b = t.translations[l] as TemplateCopy | undefined;
      if (!a && b) locales.push({ locale: l, kind: "added" });
      else if (a && !b) locales.push({ locale: l, kind: "removed" });
      else if (a && b && !same(a, b)) locales.push({ locale: l, kind: "changed" });
    }
    const metaChanged = cur.name !== t.name || cur.description !== t.description || cur.active !== t.active;
    return { key: t.key, kind: locales.length || metaChanged ? ("changed" as const) : ("unchanged" as const), locales };
  });
}
