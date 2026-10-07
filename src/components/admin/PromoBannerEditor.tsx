import { useRef, useState } from "react";
import { ChevronDown, Copy, Languages, Loader2, TicketPercent } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CountryFlag } from "@/components/travel/CountryFlag";
import { translateBannerText } from "@/lib/promotions.functions";
import { BANNER_META, bannerHeadline, bannerOverrides, bannerParts, bannerTagline, formatDiscount, isStructuredBanner, type DiscountType } from "@/domain/promotions";
import { LOCALE_REGISTRY, UI_LOCALES } from "@/i18n/locales";

const FLAG: Record<string, string> = { tr: "TR", de: "DE", en: "GB", fr: "FR", es: "ES", it: "IT", pt: "PT", nl: "NL", pl: "PL", ar: "SA", ru: "RU", ja: "JP", ko: "KR", zh: "CN" };
const TARGETS = UI_LOCALES.filter((l) => l !== "tr");

type Props = {
  value: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
  discountType: DiscountType;
  discountValue: number;
  code: string;
  showCode: boolean;
  visible: boolean;
};

/**
 * Compact banner editor: Turkish is the source, other locales are generated once at
 * edit time and stored. Manually edited locales become overrides and are preserved.
 */
export function PromoBannerEditor({ value, onChange, discountType, discountValue, code, showCode, visible }: Props) {
  const legacyRef = useRef<Record<string, string> | null>(isStructuredBanner(value) ? null : value);
  const structured = isStructuredBanner(value);
  const tr = structured ? value["tr"] ?? "" : "";
  const overrides = structured ? bannerOverrides(value) : [];
  const ready = structured ? TARGETS.filter((l) => (value[l] ?? "").trim()).length : 0;
  const source = value[BANNER_META.source] ?? "";
  const stale = structured && ready > 0 && source !== tr;
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [previewLocale, setPreviewLocale] = useState<string>("tr");

  const setTr = (text: string) => {
    if (!text && legacyRef.current) return onChange(legacyRef.current);
    const base = structured ? value : { [BANNER_META.version]: "2" };
    onChange({ ...base, tr: text });
  };

  const setLocaleText = (locale: string, text: string) => {
    const next = new Set(overrides);
    next.add(locale);
    onChange({ ...value, [locale]: text, [BANNER_META.overrides]: [...next].join(",") });
  };

  const translate = async (overwriteManual: boolean) => {
    if (!tr.trim()) return undefined;
    if (overwriteManual && !window.confirm("Manuel düzenlenmiş çeviriler de üzerine yazılacak. Emin misiniz?")) return;
    const targets = overwriteManual ? TARGETS : TARGETS.filter((l) => !overrides.includes(l));
    if (!targets.length) { toast.info("Tüm diller manuel düzenlenmiş; korunuyor."); return undefined; }
    setBusy(true);
    try {
      const { translations } = await translateBannerText({ data: { text: tr.trim(), targets } });
      const missing = targets.filter((l) => !translations[l]);
      onChange({
        ...value,
        ...translations,
        [BANNER_META.source]: tr,
        [BANNER_META.overrides]: overwriteManual ? "" : overrides.join(","),
      });
      if (missing.length) toast.warning(`${missing.length} dil çevrilemedi; İngilizce/Türkçe gösterilecek.`);
      else toast.success(`${targets.length} dil hazır. Kaydetmeyi unutmayın.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Çeviri başarısız oldu.");
    } finally {
      setBusy(false);
    }
  };

  const headline = bannerParts(bannerHeadline(value, previewLocale), formatDiscount(discountType, discountValue || 0, previewLocale), showCode && code ? code : null);
  const tagline = structured ? bannerTagline(value, previewLocale) : "";
  const rtl = LOCALE_REGISTRY[previewLocale as keyof typeof LOCALE_REGISTRY]?.dir === "rtl";

  return (
    <div className="grid gap-2 rounded-md border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <strong className="text-sm">Kampanya bannerı</strong>
        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><CountryFlag iso="TR" />Türkçe — Ana dil</span>
      </div>
      {!structured && (
        <p className="text-[11px] text-muted-foreground">Bu kampanya eski banner formatını kullanıyor ve olduğu gibi çalışmaya devam ediyor. Türkçe metin girdiğinizde yeni formata geçer.</p>
      )}
      <label className="grid gap-1 text-xs font-semibold">
        Banner metni
        <input className="admin-field w-full font-normal" maxLength={160} placeholder="İlk siparişine özel" value={tr} onChange={(e) => setTr(e.target.value)} />
        <span className="text-[10px] font-normal text-muted-foreground">İndirim ve kupon kodu kampanya ayarlarından otomatik eklenir; buraya yazmayın.</span>
      </label>

      <details className="border-t border-border pt-2">
        <summary className="cursor-pointer text-xs font-semibold">Hero kartı başlık, açıklama ve koşulları — tüm diller</summary>
        <div className="mt-2 grid max-h-96 gap-3 overflow-y-auto">
          {UI_LOCALES.map((l) => <div key={l} className="grid gap-1.5" dir={LOCALE_REGISTRY[l].dir}>
            <strong className="text-xs">{LOCALE_REGISTRY[l].nativeName}</strong>
            {([['title', 'Başlık'], ['description', 'Açıklama'], ['conditions', 'Geçerlilik koşulları']] as const).map(([key, label]) => <label key={key} className="grid gap-1 text-[11px]">{label}<input className="admin-field w-full" maxLength={160} lang={LOCALE_REGISTRY[l].bcp47} value={value[`${key}:${l}`] ?? ''} onChange={(e) => onChange({ ...value, [`${key}:${l}`]: e.target.value })} /></label>)}
          </div>)}
        </div>
      </details>

      {structured && tr.trim() && (
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" variant={stale || !ready ? "default" : "outline"} disabled={busy} onClick={() => translate(false)}>
            {busy ? <Loader2 className="animate-spin" /> : <Languages />}
            {ready ? "Çevirileri güncelle" : "Tüm dillere çevir"}
          </Button>
          {ready > 0 && <span className="text-[11px] font-semibold text-success">✓ {ready} dil hazır</span>}
          {stale && <span className="text-[11px] font-semibold text-warning">Türkçe metin değişti.</span>}
        </div>
      )}
      {stale && overrides.length > 0 && (
        <p className="text-[10px] text-muted-foreground">
          Manuel düzenlenen diller korunur ({overrides.map((l) => l.toUpperCase()).join(", ")}).{" "}
          <button type="button" className="underline" onClick={() => translate(true)} disabled={busy}>Manuel çevirileri de üzerine yaz</button>
        </p>
      )}

      {structured && (
        <div>
          <button type="button" className="flex items-center gap-1 text-xs font-semibold text-primary" aria-expanded={open} onClick={() => setOpen(!open)}>
            Çevirileri görüntüle / düzenle <ChevronDown className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
          {open && (
            <div className="mt-2 grid max-h-80 gap-1.5 overflow-y-auto pr-1">
              {TARGETS.map((l) => {
                const info = LOCALE_REGISTRY[l];
                return (
                  <label key={l} className="grid gap-0.5 text-[11px]">
                    <span className="flex items-center gap-1.5 font-semibold">
                      <CountryFlag iso={FLAG[l] ?? "GB"} />{info.nativeName}
                      {overrides.includes(l) && <span className="rounded bg-secondary px-1 text-[9px] font-bold uppercase text-muted-foreground">manuel</span>}
                    </span>
                    <input className="admin-field w-full text-xs" lang={info.bcp47} dir={info.dir} maxLength={160} value={value[l] ?? ""} onChange={(e) => setLocaleText(l, e.target.value)} />
                  </label>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="grid gap-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold text-muted-foreground">Önizleme{!visible ? " (banner gizli)" : ""}</span>
          <select aria-label="Önizleme dili" className="admin-field h-7 py-0 text-[11px]" value={previewLocale} onChange={(e) => setPreviewLocale(e.target.value)}>
            {UI_LOCALES.map((l) => <option key={l} value={l}>{l.toUpperCase()}</option>)}
          </select>
        </div>
        <div dir={rtl ? "rtl" : "ltr"} className={`flex items-center gap-2 rounded-xl border border-primary/15 bg-accent-soft px-3 py-1.5 text-primary ${visible ? "" : "opacity-60"}`}>
          <TicketPercent className="size-4 shrink-0" />
          <p className="min-w-0 flex-1 text-[13px] font-semibold leading-snug [overflow-wrap:anywhere]">
            {headline.before}{headline.code && <strong translate="no">{headline.code}</strong>}{headline.after}
            {tagline && <span className="block text-[12px] font-medium text-primary/80">{tagline}</span>}
          </p>
          {headline.code && <Copy className="size-4 shrink-0" />}
        </div>
      </div>
    </div>
  );
}
