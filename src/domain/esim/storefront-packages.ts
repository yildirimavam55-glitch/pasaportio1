type CustomerPackageShape = {
  countryIso: string | null;
  unlimited: boolean;
  dataGb: number | null;
  validityDays: number | null;
  coverage: string[];
  networkGenerations: string[];
  networks: string[];
  salePrice: number | null;
};

// Price is deliberately excluded: customer-equivalent products collapse to
// the cheapest real storefront option without altering catalogue records.
export function customerPackageKey(pkg: CustomerPackageShape) {
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
export function dedupeStorefrontPackages<T extends CustomerPackageShape>(packages: T[]) {
  const found = new Map<string, T>();
  for (const pkg of [...packages].sort((a, b) => (a.salePrice ?? Infinity) - (b.salePrice ?? Infinity))) {
    if (!found.has(customerPackageKey(pkg))) found.set(customerPackageKey(pkg), pkg);
  }
  return [...found.values()];
}

export function sortStandardPackages<T extends CustomerPackageShape>(packages: T[]) {
  return [...packages].sort(
    (a, b) =>
      (a.dataGb ?? 0) - (b.dataGb ?? 0) ||
      (a.validityDays ?? 0) - (b.validityDays ?? 0) ||
      (a.salePrice ?? Infinity) - (b.salePrice ?? Infinity),
  );
}

export function sortUnlimitedPackages<T extends CustomerPackageShape>(packages: T[]) {
  return [...packages].sort(
    (a, b) =>
      (a.validityDays ?? 0) - (b.validityDays ?? 0) ||
      (a.salePrice ?? Infinity) - (b.salePrice ?? Infinity),
  );
}