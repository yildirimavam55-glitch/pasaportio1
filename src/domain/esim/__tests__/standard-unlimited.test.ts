import { describe, expect, it } from "vitest";
import { standardUnlimitedOnly, type PlanTier } from "@/domain/esim/supplier-metadata";

type R = { id: string; k: string | null; t: PlanTier | null; cost: number };
const pick = (rows: R[]) => standardUnlimitedOnly(rows, (r) => r.k, (r) => r.t);

describe("standard Unlimited = Essential tier", () => {
  it("Germany Unlimited 3 days uses the Essential cost €4.04, not Lite or Plus", () => {
    const out = pick([{ id: "UL", k: "DE|U|3", t: "LITE", cost: 3.37 }, { id: "ULE", k: "DE|U|3", t: "ESSENTIAL", cost: 4.04 }, { id: "ULP", k: "DE|U|3", t: "PLUS", cost: 8.08 }]);
    expect(out.map((r) => r.cost)).toEqual([4.04]);
  });
  it("keeps fixed-data packages and structures without an Essential product", () => {
    const out = pick([{ id: "a", k: null, t: null, cost: 1 }, { id: "b", k: "XX|U|7", t: "PLUS", cost: 9 }]);
    expect(out.map((r) => r.id)).toEqual(["a", "b"]);
  });
});
