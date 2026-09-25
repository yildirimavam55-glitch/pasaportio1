import type { EsimPackage } from "@/lib/esim-catalogue.functions";

// Price is deliberately excluded: customer-equivalent products collapse to
// the cheapest real storefront option without altering catalogue records.
export function customerPackageKey(pkg: EsimPackage) {
  return [
    pkg.countryIso,
    pkg.unlimited ? "U" : pkg.dataGb,
    pkg.validityDays,
    [...pkg.coverage].sort().join(","),
    pkg.networkGenerations.join(","),
    [...pkg.networks].sort().join(","),
  ].join("|");
}

/** Existing approved storefront deduplication, shared by country and region views. */
export function dedupeStorefrontPackages(packages: EsimPackage[]) {
  const found = new Map<string, EsimPackage>();
  for (const pkg of [...packages].sort((a, b) => (a.salePrice ?? Infinity) - (b.salePrice ?? Infinity))) {
    if (!found.has(customerPackageKey(pkg))) found.set(customerPackageKey(pkg), pkg);
  }
  return [...found.values()];
}

export function sortStandardPackages(packages: EsimPackage[]) {
  return [...packages].sort(
    (a, b) =>
      (a.dataGb ?? 0) - (b.dataGb ?? 0) ||
      (a.validityDays ?? 0) - (b.validityDays ?? 0) ||
      (a.salePrice ?? Infinity) - (b.salePrice ?? Infinity),
  );
}

export function sortUnlimitedPackages(packages: EsimPackage[]) {
  return [...packages].sort(
    (a, b) =>
      (a.validityDays ?? 0) - (b.validityDays ?? 0) ||
      (a.salePrice ?? Infinity) - (b.salePrice ?? Infinity),
  );
}