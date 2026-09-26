import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { money } from "@/components/design-v2/V2Shell";
import { customerCataloguePackageTitle } from "@/domain/esim/customer-presentation";
import { getCountryByIso } from "@/domain/geo/countries";
import type { Locale } from "@/domain/enums";
import type { EsimPackage } from "@/lib/esim-catalogue.functions";
import { localize } from "@/i18n/overlay";

const COPY = localize({
  tr: { data: "İnternet", unlimited: "Sınırsız", validity: "Geçerlilik", days: "gün", coverage: "Kapsam", countries: "ülke", network: "Ağ", technology: "Ağ teknolojisi", activation: "Aktivasyon", unknown: "Kurulum bilgileri satın alma sonrası hesabında gösterilir.", add: "Bu paketi seç", added: "Seçildi" },
  de: { data: "Daten", unlimited: "Unbegrenzt", validity: "Gültigkeit", days: "Tage", coverage: "Abdeckung", countries: "Länder", network: "Netz", technology: "Netztechnologie", activation: "Aktivierung", unknown: "Einrichtungsdaten erscheinen nach dem Kauf in deinem Konto.", add: "Dieses Paket wählen", added: "Ausgewählt" },
  en: { data: "Data", unlimited: "Unlimited", validity: "Validity", days: "days", coverage: "Coverage", countries: "countries", network: "Network", technology: "Network technology", activation: "Activation", unknown: "Setup details appear in your account after purchase.", add: "Select this plan", added: "Selected" },
});

function activationText(pkg: EsimPackage, locale: Locale, fallback: string) {
  if (pkg.activationPolicy === "ON_INSTALL") return locale === "tr" ? "Kurulumla başlar" : locale === "de" ? "Beginnt mit der Installation" : "Starts on installation";
  if (pkg.activationPolicy === "ON_FIRST_NETWORK_CONNECTION") return locale === "tr" ? "İlk ağ bağlantısında başlar" : locale === "de" ? "Beginnt bei der ersten Netzverbindung" : "Starts on first network connection";
  if (pkg.activationPolicy === "ON_PURCHASE") return locale === "tr" ? "Satın alındığında başlar" : locale === "de" ? "Beginnt beim Kauf" : "Starts on purchase";
  return fallback;
}

export function V2EsimPackageDetails({ pkg, locale, inCart, onClose, onAdd, coverageOnly = false }: { pkg: EsimPackage | null; locale: Locale; inCart: boolean; onClose: () => void; onAdd: (pkg: EsimPackage) => void; coverageOnly?: boolean }) {
  if (!pkg) return null;
  const c = COPY[locale];
  const identity = customerCataloguePackageTitle({ locale, destinationIso: pkg.countryIso, coverage: pkg.coverage, packageKind: pkg.packageKind, regionFamily: pkg.regionFamily });
  const coverage = pkg.coverage.map((code) => getCountryByIso(code)?.name[locale] ?? code).join(", ");
  const technology = pkg.networkGenerations.filter((item) => item === "4G" || item === "5G").join("/");
  const rows = [
    [c.data, pkg.unlimited ? c.unlimited : `${pkg.dataGb ?? "—"} GB`],
    [c.validity, `${pkg.validityDays ?? "—"} ${c.days}`],
    [c.coverage, `${pkg.coverage.length} ${c.countries}: ${coverage}`],
    !coverageOnly && pkg.networks.length ? [c.network, pkg.networks.join(", ")] : null,
    !coverageOnly && technology ? [c.technology, technology] : null,
    !coverageOnly && pkg.highSpeedAllowance ? ["FUP", pkg.highSpeedAllowance] : null,
    !coverageOnly ? [c.activation, activationText(pkg, locale, c.unknown)] : null,
  ].filter(Boolean) as string[][];
  return <Sheet open onOpenChange={(open) => { if (!open) onClose(); }}><SheetContent side="bottom" className="max-h-[82dvh] overflow-y-auto rounded-t-3xl pb-[calc(1rem+env(safe-area-inset-bottom))] sm:left-1/2 sm:max-w-xl sm:-translate-x-1/2 sm:rounded-3xl sm:border"><SheetHeader className="pr-10 text-left"><SheetTitle>{identity}</SheetTitle><SheetDescription>{pkg.unlimited ? c.unlimited : `${pkg.dataGb ?? "—"} GB`} · {pkg.validityDays ?? "—"} {c.days}</SheetDescription></SheetHeader><dl className="mt-4 grid gap-2 text-sm">{rows.map(([label, value]) => <div key={label} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] gap-3 border-b border-border pb-2"><dt className="text-muted-foreground">{label}</dt><dd className="break-words text-right font-semibold">{value}</dd></div>)}</dl><div className="mt-5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3"><strong className="text-xl text-foreground">{money(pkg.salePrice ?? 0, pkg.currency)}</strong><Button type="button" onClick={() => onAdd(pkg)} variant={inCart ? "secondary" : "default"}>{inCart ? c.added : c.add}</Button></div></SheetContent></Sheet>;
}