import { localize } from "@/i18n/overlay";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CalendarDays } from "lucide-react";
import { PublicShell } from "@/components/travel/PublicShell";
import { getPublishedLegalCenter } from "@/lib/legal-center.functions";
import { useI18n } from "@/i18n";
import { LOCALE_REGISTRY, type UiLocale } from "@/i18n/locales";
import type { LegalDocument, LegalDocumentId } from "@/domain/legal/content";
import { LegalRichText } from "@/components/legal/LegalRichText";

const COPY = localize({
  tr: { missing: "EKSİK YASAL BİLGİ", draft: "Bu yasal belge henüz yayınlanmadı.", updated: "Son güncelleme" },
  de: { missing: "FEHLENDE RECHTLICHE ANGABEN", draft: "Dieses Rechtsdokument wurde noch nicht veröffentlicht.", updated: "Zuletzt aktualisiert" },
  en: { missing: "MISSING LEGAL INFORMATION", draft: "This legal document has not been published yet.", updated: "Last updated" },
}) as const;

/** Picks the requested language, then English, then the Turkish master — never an empty page. */
export function legalText(doc: Pick<LegalDocument, "title" | "body">, locale: UiLocale) {
  const pick = (map: Record<UiLocale, string>) => map[locale]?.trim() ? { value: map[locale], locale } : map.en?.trim() ? { value: map.en, locale: "en" as UiLocale } : { value: map.tr, locale: "tr" as UiLocale };
  return { title: pick(doc.title), body: pick(doc.body) };
}

/** Shared customer-facing document view — also used by the Admin preview. */
export function LegalDocumentView({ doc, locale, lastUpdatedLabel }: { doc: LegalDocument; locale: UiLocale; lastUpdatedLabel: string }) {
  const text = legalText(doc, locale);
  const dir = LOCALE_REGISTRY[text.body.locale].dir;
  return (
    <article className="mx-auto min-h-[55vh] w-full max-w-4xl px-4 py-12 sm:px-6 sm:py-16" lang={text.body.locale} dir={dir}>
      <header className="border-b border-border pb-7">
        <p className="text-xs font-bold uppercase text-primary">pasaport.io · Legal</p>
        <h1 className="mt-2 font-display text-3xl font-bold [overflow-wrap:anywhere] sm:text-4xl">{text.title.value}</h1>
        {doc.lastUpdated && <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><CalendarDays className="size-4" />{lastUpdatedLabel}: {doc.lastUpdated}</p>}
      </header>
      <div className="mt-8"><LegalRichText source={text.body.value} /></div>
    </article>
  );
}

export function LegalPage({ documentId }: { documentId: LegalDocumentId }) {
  const { uiLocale, locale } = useI18n();
  const query = useQuery({ queryKey: ["legal-center", "published"], queryFn: () => getPublishedLegalCenter(), staleTime: 60_000 });
  const doc = query.data?.documents[documentId];
  const copy = COPY[locale];
  return (
    <PublicShell hideStickySearch>
      {doc ? <LegalDocumentView doc={doc} locale={uiLocale} lastUpdatedLabel={copy.updated} /> : (
        <article className="mx-auto min-h-[55vh] max-w-4xl px-4 py-12 sm:px-6 sm:py-16" lang={uiLocale} dir={LOCALE_REGISTRY[uiLocale].dir}>
          <p className="text-xs font-bold uppercase text-primary">pasaport.io · Legal</p>
          {!query.isPending && (
            <div className="mt-6 rounded-md border border-warning/40 bg-warning/10 p-5">
              <AlertTriangle className="size-6 text-warning" />
              <h1 className="mt-3 font-display text-xl font-bold">{copy.missing}</h1>
              <p className="mt-2 text-sm text-muted-foreground">{copy.draft}</p>
            </div>
          )}
        </article>
      )}
    </PublicShell>
  );
}
