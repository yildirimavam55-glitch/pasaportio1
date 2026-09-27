import { useEffect, useState, type ComponentType } from "react";
import { CalendarDays, ChevronDown, Database, Globe2, Info, Signal } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { money } from "@/components/design-v2/V2Shell";
import { customerCataloguePackageTitle } from "@/domain/esim/customer-presentation";
import { flagOf, getCountryByIso } from "@/domain/geo/countries";
import type { Locale } from "@/domain/enums";
import type { EsimPackage } from "@/lib/esim-catalogue.functions";
import { localize } from "@/i18n/overlay";

const COPY = localize({
  tr: { title: "Paket detayları", subtitle: "Seçtiğin eSIM paketi hakkında bilgiler.", data: "Veri", dataHelp: "Kullanılabilir toplam veri miktarı.", unlimited: "Sınırsız", unlimitedHelp: "Sınırsız veri paketi.", validity: "Geçerlilik", validityHelp: "Paketin geçerlilik süresi.", days: "gün", coverage: "Kapsama", coverageOne: "Bu paketin kapsadığı destinasyon.", coverageMany: "Bu paketin kapsadığı ülkeler.", countries: "ülke", showCountries: "Ülkeleri gör", hideCountries: "Listeyi gizle", tech: "Bağlantı", techHelp: "Desteklenen ağ teknolojisi.", techNote: "Mevcut ağ teknolojisi konuma, cihaza ve yerel şebeke koşullarına göre değişebilir.", add: "Bu paketi seç", added: "Seçildi" },
  de: { title: "Paketdetails", subtitle: "Infos zu deinem gewählten eSIM-Paket.", data: "Daten", dataHelp: "Insgesamt verfügbares Datenvolumen.", unlimited: "Unbegrenzt", unlimitedHelp: "Paket mit unbegrenztem Datenvolumen.", validity: "Gültigkeit", validityHelp: "Gültigkeitsdauer des Pakets.", days: "Tage", coverage: "Abdeckung", coverageOne: "Reiseziel, das dieses Paket abdeckt.", coverageMany: "Länder, die dieses Paket abdeckt.", countries: "Länder", showCountries: "Länder anzeigen", hideCountries: "Liste ausblenden", tech: "Verbindung", techHelp: "Unterstützte Netztechnologie.", techNote: "Die verfügbare Netztechnologie kann je nach Standort, Gerät und lokalem Netz variieren.", add: "Dieses Paket wählen", added: "Ausgewählt" },
  en: { title: "Package details", subtitle: "Information about your selected eSIM package.", data: "Data", dataHelp: "Total data available to use.", unlimited: "Unlimited", unlimitedHelp: "Unlimited data package.", validity: "Validity", validityHelp: "How long the package is valid.", days: "days", coverage: "Coverage", coverageOne: "Destination covered by this package.", coverageMany: "Countries covered by this package.", countries: "countries", showCountries: "See countries", hideCountries: "Hide list", tech: "Connection", techHelp: "Supported network technology.", techNote: "Available network technology may vary by location, device and local network conditions.", add: "Select this plan", added: "Selected" },
});

type Row = { key: string; icon: ComponentType<{ className?: string }>; label: string; value: string; help: string; extra?: React.ReactNode };

export function V2EsimPackageDetails({ pkg, locale, inCart, onClose, onAdd }: { pkg: EsimPackage | null; locale: Locale; inCart: boolean; onClose: () => void; onAdd: (pkg: EsimPackage) => void }) {
  const [showList, setShowList] = useState(false);
  useEffect(() => setShowList(false), [pkg?.id]);
  if (!pkg) return null;
  const c = COPY[locale];
  const identity = customerCataloguePackageTitle({ locale, destinationIso: pkg.countryIso, coverage: pkg.coverage, packageKind: pkg.packageKind, regionFamily: pkg.regionFamily });
  const names = pkg.coverage.map((code) => getCountryByIso(code)?.name[locale] ?? code);
  const single = pkg.coverage.length === 1;
  const flagIso = single ? pkg.coverage[0] : null;
  // Supplier-published generations only; never inferred.
  const technology = [...new Set(pkg.networkGenerations.map((g) => g.trim().toUpperCase()).filter(Boolean))].join(" / ");
  const rows: Row[] = [
    { key: "data", icon: Database, label: c.data, value: pkg.unlimited ? c.unlimited : `${pkg.dataGb ?? "—"} GB`, help: pkg.unlimited ? c.unlimitedHelp : c.dataHelp },
    { key: "validity", icon: CalendarDays, label: c.validity, value: `${pkg.validityDays ?? "—"} ${c.days}`, help: c.validityHelp },
    {
      key: "coverage", icon: Globe2, label: c.coverage,
      value: single ? names[0] ?? "—" : `${pkg.coverage.length} ${c.countries}`,
      help: single ? c.coverageOne : c.coverageMany,
      extra: single ? null : (
        <div className="mt-2">
          <button type="button" onClick={() => setShowList((v) => !v)} aria-expanded={showList} className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
            {showList ? c.hideCountries : c.showCountries}<ChevronDown className={`h-3.5 w-3.5 transition-transform ${showList ? "rotate-180" : ""}`} />
          </button>
          {showList ? <ul className="mt-2 flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">{pkg.coverage.map((iso, i) => <li key={iso} className="rounded-full bg-muted px-2 py-0.5 text-xs text-foreground">{flagOf(iso)} {names[i]}</li>)}</ul> : null}
        </div>
      ),
    },
    ...(technology ? [{ key: "tech", icon: Signal, label: c.tech, value: technology, help: c.techHelp }] : []),
  ];
  return (
    <Sheet open onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent side="bottom" className="max-h-[86dvh] overflow-y-auto overflow-x-hidden rounded-t-3xl bg-card pb-[calc(1rem+env(safe-area-inset-bottom))] sm:left-1/2 sm:max-w-[560px] sm:-translate-x-1/2 sm:rounded-3xl sm:border">
        <SheetHeader className="pr-10 text-start">
          <SheetTitle className="text-lg">{c.title}</SheetTitle>
          <SheetDescription className="text-xs">{c.subtitle}</SheetDescription>
        </SheetHeader>
        <div className="mt-3 flex items-center gap-3 rounded-2xl bg-primary-soft px-3 py-2.5">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-card text-xl" aria-hidden>{flagIso ? flagOf(flagIso) : <Globe2 className="h-5 w-5 text-primary" />}</span>
          <strong className="min-w-0 break-words text-base text-foreground">{identity}</strong>
        </div>
        <ul className="mt-2 divide-y divide-border">
          {rows.map(({ key, icon: Icon, label, value, help, extra }) => (
            <li key={key} className="flex gap-3 py-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-muted text-primary"><Icon className="h-4 w-4" /></span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <span className="text-sm font-medium text-foreground">{label}</span>
                  <span className="ms-auto break-words text-end text-sm font-bold text-foreground">{value}</span>
                </div>
                <p className="text-xs text-muted-foreground">{help}</p>
                {extra}
              </div>
            </li>
          ))}
        </ul>
        {technology ? <p className="mt-1 flex gap-2 rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />{c.techNote}</p> : null}
        <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <strong className="text-xl text-foreground">{money(pkg.salePrice ?? 0, pkg.currency)}</strong>
          <Button type="button" onClick={() => onAdd(pkg)} variant={inCart ? "secondary" : "default"}>{inCart ? c.added : c.add}</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
