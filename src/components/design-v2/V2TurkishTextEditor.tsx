import { useState } from "react";
import { V2_TEXT_FIELDS, type V2Section } from "@/domain/storefront/v2";
import { LOCALE_REGISTRY, type UiLocale } from "@/i18n/locales";
import { aggregateTranslationStatus, manualEdit, sourceEdit, TRANSLATION_TARGETS, TRANSLATION_STATUS_LABELS } from "@/domain/storefront/translation-workflow";

/** Fixed Turkish source. Preview language never selects which source field is edited. */
export function V2TurkishTextEditor({ section, onChange, previewLocale, demo = false }: { section: V2Section; onChange: (patch: Partial<V2Section>) => void; previewLocale: UiLocale; demo?: boolean }) {
  const [manual, setManual] = useState(false);
  const [target, setTarget] = useState<Exclude<UiLocale, "tr">>("de");
  const fields = V2_TEXT_FIELDS[section.type];
  const edit = (key: string, value: string, code: UiLocale) => onChange({ text: { ...section.text, [key]: code === "tr" ? sourceEdit(section.text[key], value) : manualEdit(section.text[key], code, value) }, ...(section.type === "SEARCH_HERO" && key === "title" ? { heroTextMode: { ...section.heroTextMode, [code]: "custom" as const } } : {}) });
  const values = fields.map(([key]) => section.text[key]);
  return <div className="space-y-3">
    <strong className="block text-sm">TR – Hauptsprache / Ana dil</strong>
    <p className="text-xs text-muted-foreground">Türkçe içerik burada düzenlenir. Önizleme dili bu alanları değiştirmez.</p>
    {fields.map(([key, label]) => <label key={key} className="block text-xs">{label} · TR
      <textarea aria-label={`TR:${key}`} lang="tr" dir="ltr" className="admin-field mt-1 w-full" rows={key === "title" || key === "eyebrow" ? 1 : 2} value={section.text[key]?.tr ?? ""} onChange={event => edit(key, event.target.value, "tr")} />
    </label>)}
    <div className="grid grid-cols-2 gap-1" aria-label="13 Übersetzungsstatus">{TRANSLATION_TARGETS.map(code => {
      const status = aggregateTranslationStatus(values, code);
      return <span key={code} data-translation-locale={code} data-translation-status={status} className="rounded border border-border p-1 text-[10px]">{code.toUpperCase()} · {TRANSLATION_STATUS_LABELS[status]}{demo && status === "AUTO_TRANSLATED" ? " · DEMO" : ""}</span>;
    })}</div>
    <button type="button" className="rounded border border-border px-3 py-2 text-xs" aria-expanded={manual} onClick={() => { if (!manual && previewLocale !== "tr") setTarget(previewLocale); setManual(!manual); }}>Übersetzung bearbeiten</button>
    {manual && <fieldset className="space-y-2 rounded border border-border p-2"><legend>Manuelle Korrektur / Elle düzeltme</legend>
      <label className="block text-xs">Zielsprache<select aria-label="Korrektursprache" className="admin-field mt-1 w-full" value={target} onChange={e => setTarget(e.target.value as typeof target)}>{TRANSLATION_TARGETS.map(code => <option key={code} value={code}>{LOCALE_REGISTRY[code].nativeName}</option>)}</select></label>
      {fields.map(([key, label]) => <label key={key} className="block text-xs">{label} · {target.toUpperCase()}<textarea aria-label={`MANUAL:${key}`} lang={LOCALE_REGISTRY[target].bcp47} dir={LOCALE_REGISTRY[target].dir} className="admin-field mt-1 w-full" rows={2} value={section.text[key]?.[target] ?? ""} placeholder="Fehlt / Eksik" onChange={e => edit(key, e.target.value, target)} /></label>)}
    </fieldset>}
  </div>;
}
