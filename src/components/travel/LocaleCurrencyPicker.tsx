import { useMemo, useState } from "react";
import { Check, Info, Search } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { LOCALE_REGISTRY, useI18n, type UiLocale } from "@/i18n";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import { CURRENCY_SYMBOL, type CurrencyCode } from "@/domain/currency/currencies";

type Copy = { title: string; language: string; currency: string; searchLang: string; searchCur: string; remembered: string; empty: string };
const COPY: Record<string, Copy> = {
  tr: { title: "Dil ve para birimi", language: "Dil", currency: "Para birimi", searchLang: "Dil ara", searchCur: "Para birimi ara", remembered: "Tercihlerin bu cihazda hatırlanır.", empty: "Sonuç yok" },
  de: { title: "Sprache und Währung", language: "Sprache", currency: "Währung", searchLang: "Sprache suchen", searchCur: "Währung suchen", remembered: "Deine Auswahl wird auf diesem Gerät gespeichert.", empty: "Keine Ergebnisse" },
  en: { title: "Language and currency", language: "Language", currency: "Currency", searchLang: "Search language", searchCur: "Search currency", remembered: "Your preferences are remembered on this device.", empty: "No results" },
  ar: { title: "اللغة والعملة", language: "اللغة", currency: "العملة", searchLang: "ابحث عن لغة", searchCur: "ابحث عن عملة", remembered: "يتم حفظ تفضيلاتك على هذا الجهاز.", empty: "لا توجد نتائج" },
};

function currencyName(code: string, locale: string) {
  try { return new Intl.DisplayNames([locale], { type: "currency" }).of(code) ?? code; } catch { return code; }
}

export function LocaleCurrencyPicker({ open, onOpenChange, onChooseLocale }: { open: boolean; onOpenChange: (o: boolean) => void; onChooseLocale: (code: UiLocale) => void }) {
  const mobile = useIsMobile();
  const { uiLocale, uiLocales } = useI18n();
  const currency = useCurrency();
  const c = COPY[uiLocale] ?? COPY.en!;
  const [tab, setTab] = useState<"lang" | "cur">("lang");
  const [q, setQ] = useState("");
  const tag = LOCALE_REGISTRY[uiLocale].bcp47;
  const needle = q.trim().toLocaleLowerCase(tag);

  const langs = useMemo(() => uiLocales.filter((code) => {
    const r = LOCALE_REGISTRY[code];
    return !needle || [r.nativeName, code, new Intl.DisplayNames([tag], { type: "language" }).of(code) ?? ""].some((v) => v.toLocaleLowerCase(tag).includes(needle));
  }), [uiLocales, needle, tag]);
  const curs = useMemo(() => (currency.available as CurrencyCode[]).filter((code) =>
    !needle || [code, currencyName(code, tag), currencyName(code, "en")].some((v) => v.toLocaleLowerCase(tag).includes(needle))), [currency.available, needle, tag]);

  const row = "flex min-h-14 w-full items-center gap-3 rounded-xl border border-transparent px-3 text-start transition hover:bg-secondary/60 aria-[current=true]:border-primary/10 aria-[current=true]:bg-accent/15";
  const badge = "grid size-9 shrink-0 place-items-center rounded-full border border-border bg-background text-xs font-bold";

  const body = (
    <div className="flex min-h-0 flex-1 flex-col gap-3" dir={LOCALE_REGISTRY[uiLocale].dir}>
      <div role="tablist" className="grid grid-cols-2 rounded-full bg-secondary p-1">
        {(["lang", "cur"] as const).map((t) => (
          <button key={t} role="tab" type="button" aria-selected={tab === t} onClick={() => { setTab(t); setQ(""); }}
            className="min-h-10 rounded-full text-sm font-semibold text-muted-foreground aria-selected:bg-background aria-selected:text-foreground aria-selected:shadow-sm">
            {t === "lang" ? c.language : c.currency}
          </button>
        ))}
      </div>
      <label className="flex min-h-11 items-center gap-2 rounded-full border border-border px-4">
        <Search className="size-4 text-muted-foreground" aria-hidden="true" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tab === "lang" ? c.searchLang : c.searchCur} aria-label={tab === "lang" ? c.searchLang : c.searchCur} className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
      </label>
      <ul className="-mx-1 min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain px-1" data-testid={tab === "lang" ? "language-list" : "currency-list"}>
        {tab === "lang" ? langs.map((code) => (
          <li key={code}><button type="button" aria-current={uiLocale === code} className={row} onClick={() => { onChooseLocale(code); onOpenChange(false); }}>
            <span className={badge}>{code.toUpperCase()}</span>
            <span className="min-w-0 flex-1"><span lang={LOCALE_REGISTRY[code].bcp47} dir={LOCALE_REGISTRY[code].dir} className="block text-sm font-semibold">{LOCALE_REGISTRY[code].nativeName}</span>
              <span className="block text-xs text-muted-foreground">{new Intl.DisplayNames(["en"], { type: "language" }).of(code)}</span></span>
            <span className="text-[11px] font-semibold text-muted-foreground">{code.toUpperCase()}</span>
            <Check className={`size-4 text-primary ${uiLocale === code ? "" : "invisible"}`} aria-hidden="true" />
          </button></li>
        )) : curs.map((code) => (
          <li key={code}><button type="button" aria-current={currency.code === code} className={row} onClick={() => { currency.setCurrency(code); onOpenChange(false); }}>
            <span className={badge} aria-hidden="true">{CURRENCY_SYMBOL[code]}</span>
            <span className="min-w-0 flex-1 text-sm font-semibold">{currencyName(code, tag)}</span>
            <span className="text-[11px] font-semibold text-muted-foreground">{code}</span>
            <Check className={`size-4 text-primary ${currency.code === code ? "" : "invisible"}`} aria-hidden="true" />
          </button></li>
        ))}
        {(tab === "lang" ? langs : curs).length === 0 && <li className="py-6 text-center text-sm text-muted-foreground">{c.empty}</li>}
      </ul>
      <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground"><Info className="size-3.5" aria-hidden="true" />{c.remembered}</p>
    </div>
  );

  if (mobile) return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="flex max-h-[85dvh] flex-col rounded-t-3xl px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-5">
        <SheetTitle className="font-display text-lg">{c.title}</SheetTitle>
        {body}
      </SheetContent>
    </Sheet>
  );
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[80vh] max-w-[26rem] flex-col rounded-3xl p-5">
        <DialogTitle className="font-display text-lg">{c.title}</DialogTitle>
        {body}
      </DialogContent>
    </Dialog>
  );
}
