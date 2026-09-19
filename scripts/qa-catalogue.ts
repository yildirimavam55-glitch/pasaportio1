/** One-off QA driver: runs the customer shortlist over the whole live catalogue. */
import { readFileSync } from "node:fs";
import { buildCustomerShortlist } from "@/domain/esim/shortlist";
import { coverageScopeOf } from "@/domain/esim/package-matching";

const packages = JSON.parse(readFileSync("/tmp/pkgs.json", "utf8")).map((row: any) => ({
  ...row,
  coverage: row.coverage ?? [],
}));

const destinations = [...new Set(packages.flatMap((p: any) => p.coverage))] as string[];
const scenarios = [
  { requiredGb: 1, days: 10 },
  { requiredGb: 5, days: 15 },
  { requiredGb: 10, days: 30 },
  { requiredGb: 20, days: 30 },
];

let failures = 0;
const failing = new Set<string>();
for (const iso of destinations) {
  for (const s of scenarios) {
    const r = buildCustomerShortlist(packages, { requiredGb: s.requiredGb, coverageIsos: [iso], days: s.days });
    const bad: string[] = [];
    if (r.primary.length > 5) bad.push("too-many");
    if (r.primary.filter((e) => e.package.unlimited).length > 1) bad.push("multi-unlimited");
    for (const e of r.primary) {
      const p: any = e.package;
      if (!p.coverage.includes(iso)) bad.push("coverage");
      if ((p.validityDays ?? 0) < s.days) bad.push("validity");
      if (!p.unlimited && (p.dataGb ?? 0) < s.requiredGb) bad.push("data");
      if (!(p.salePrice > 0)) bad.push("price");
    }
    const scopes = r.primary.map((e) => coverageScopeOf(e.package));
    if (scopes.includes("COUNTRY") && scopes.some((x) => x !== "COUNTRY")) bad.push("scope-mix");
    if (bad.length) { failures += 1; failing.add(iso); console.log("FAIL", iso, s.requiredGb, s.days, [...new Set(bad)].join(",")); }
  }
}

const routes = [["TR","BG","RS"],["DE","FR","ES"],["US","CA"],["JP","KR"],["AE","TR","DE"]];
let routeFail = 0;
for (const route of routes) {
  const r = buildCustomerShortlist(packages, { requiredGb: 5, coverageIsos: route, days: 14 });
  const ok = r.primary.length > 0 && r.primary.every((e) => route.every((iso) => (e.package as any).coverage.includes(iso)));
  if (!ok) { routeFail += 1; console.log("ROUTE FAIL", route.join("+"), r.primary.length); }
  else console.log("ROUTE OK", route.join("+"), r.primary.length, r.scope);
}

console.log(JSON.stringify({ destinations: destinations.length, scenarioChecks: destinations.length * 4, failures, failingCountries: failing.size, routeFail }));
