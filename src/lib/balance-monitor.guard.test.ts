import { beforeEach, describe, expect, it, vi } from "vitest";

// Fake DB: only feature_flags is answered; everything else records a call.
let flagResponse: () => Promise<{ data: any; error: any }>;
const writes: string[] = [];
const buildAdapter = vi.fn();

function fakeDb() {
  return {
    from(table: string) {
      const chain: any = {
        select: () => chain,
        eq: () => chain,
        order: () => chain,
        limit: () => chain,
        gte: () => chain,
        neq: () => chain,
        not: () => chain,
        in: () => chain,
        maybeSingle: () => (table === "feature_flags" ? flagResponse() : Promise.resolve({ data: null, error: null })),
        insert: () => { writes.push(table); return Promise.resolve({ error: null }); },
        update: () => { writes.push(table); return chain; },
        upsert: () => { writes.push(table); return Promise.resolve({ error: null }); },
        then: (r: any) => r({ data: table === "providers" ? [{ id: "p1", code: "ESIM_GO", name: "eSIM Go", active: true }] : [], error: null }),
      };
      return chain;
    },
  };
}

vi.mock("@/integrations/supabase/client.server", () => ({ get supabaseAdmin() { return fakeDb(); } }));
vi.mock("@/providers/adapters/factory.server", () => ({ buildAdapter }));

import { isBalanceCheckAllowed, runBalanceCheck, runDueBalanceChecks } from "./balance-monitor.server";

const cases: Array<[string, () => Promise<{ data: any; error: any }>]> = [
  ["flag false", async () => ({ data: { enabled: false }, error: null })],
  ["flag missing", async () => ({ data: null, error: null })],
  ["read error", async () => ({ data: null, error: { message: "boom" } })],
  ["exception", async () => { throw new Error("db down"); }],
];

describe("balance check is fail-closed on provider.sync", () => {
  beforeEach(() => { writes.length = 0; buildAdapter.mockReset(); });

  for (const [name, resp] of cases) {
    it(`blocks when ${name}`, async () => {
      flagResponse = resp;
      expect(await isBalanceCheckAllowed(fakeDb())).toBe(false);

      const fetcher = vi.fn();
      const manual = await runBalanceCheck(fakeDb(), { id: "p1", name: "x" }, fetcher, "MANUAL");
      expect(fetcher).not.toHaveBeenCalled();
      expect(manual.errorCode).toBe("PROVIDER_SYNC_DISABLED");

      const scheduled = await runDueBalanceChecks();
      expect(scheduled.results).toEqual([]);
      expect(buildAdapter).not.toHaveBeenCalled();
      expect(writes).toEqual([]);
    });
  }

  it("allows only when flag is explicitly true", async () => {
    flagResponse = async () => ({ data: { enabled: true }, error: null });
    expect(await isBalanceCheckAllowed(fakeDb())).toBe(true);
  });
});
