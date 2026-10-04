import type { CartLine } from "@/domain/cart/store";
import type { Locale } from "@/domain/enums";
import { customerCataloguePackageTitle } from "@/domain/esim/customer-presentation";
import { localize } from "@/i18n/overlay";

export const CART_COPY = localize({
  tr: { title: "Sepet", continueShopping: "Alışverişe devam et", lead: "Seçtiğin paketleri kontrol et.", empty: "Sepetin boş", emptyText: "Bir ülke seç ve paketini ekle.", browse: "eSIM paketlerine bak", days: "gün", countries: "ülke", unit: "Birim", qty: "Adet", remove: "Kaldır", total: "Toplam", review: "Siparişi gözden geçir", dec: "Azalt", inc: "Artır", test: "TEST" },
  de: { title: "Warenkorb", continueShopping: "Weiter einkaufen", lead: "Prüfe deine ausgewählten Pakete.", empty: "Dein Warenkorb ist leer", emptyText: "Wähle ein Land und füge ein Paket hinzu.", browse: "eSIM-Pakete ansehen", days: "Tage", countries: "Länder", unit: "Stück", qty: "Anzahl", remove: "Entfernen", total: "Gesamt", review: "Bestellung prüfen", dec: "Weniger", inc: "Mehr", test: "TEST" },
  en: { title: "Cart", continueShopping: "Continue shopping", lead: "Review your selected packages.", empty: "Your cart is empty", emptyText: "Pick a country and add a package.", browse: "Browse eSIM packages", days: "days", countries: "countries", unit: "Unit", qty: "Qty", remove: "Remove", total: "Total", review: "Review order", dec: "Decrease", inc: "Increase", test: "TEST" },
});

/** Same line facts as the production cart, just laid out for V2. */
export function lineFacts(line: CartLine, c: (typeof CART_COPY)["tr"]) {
  return [
    line.meta,
    line.validityDays ? `${line.validityDays} ${c.days}` : null,
    line.coverage && line.coverage.length > 1 ? `${line.coverage.length} ${c.countries}` : null,
    line.airport,
    line.terminal,
    line.date,
  ].filter(Boolean).join(" · ");
}

/** Re-localizes stored eSIM lines from their real product snapshot. */
export function lineTitle(line: CartLine, locale: Locale) {
  if (line.serviceType !== "ESIM" || !line.coverage?.length) return line.name;
  return customerCataloguePackageTitle({
    locale,
    coverage: line.coverage,
    destinationIso: line.destinationIso ?? null,
    packageKind: line.packageKind ?? null,
    regionFamily: line.regionFamily ?? null,
  });
}

