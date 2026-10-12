import type { SupplierLookupResult, SupplierOrderResult, SupplierPort } from "./engine";

/** Marker host used in every synthetic activation string; never resolvable. */
export const DEMO_SMDP_HOST = "demo-esim.invalid";

export type MockFailure = "TIMEOUT" | "SERVER_ERROR" | "MALFORMED" | "RATE_LIMITED" | "AUTH";

export type LabeledSupplier = SupplierPort & { readonly kind: "MOCK" | "LIVE" };

/**
 * Network-free supplier that returns clearly synthetic eSIM data (DEMO).
 * Queue failures with `failNext` to exercise recovery paths.
 */
export function createMockSupplier(options: { testEnvironment: boolean }) {
  if (!options.testEnvironment) throw new Error("Mock eSIM supplier is only available in an isolated test environment.");
  const orders = new Map<string, unknown>();
  const failures: MockFailure[] = [];
  const calls = { placeOrder: 0, lookupOrder: 0 };
  let seq = 0;

  const supplier: LabeledSupplier & { calls: typeof calls; failNext(f: MockFailure): void; dropOrder(reference: string): void } = {
    kind: "MOCK",
    calls,
    failNext(f) { failures.push(f); },
    dropOrder(reference) { orders.delete(reference); },
    async placeOrder({ reference }): Promise<SupplierOrderResult> {
      calls.placeOrder += 1;
      const failure = failures.shift();
      if (failure === "TIMEOUT") {
        // Simulates "request reached supplier, answer lost": the order exists.
        orders.set(reference, synthetic(reference, ++seq));
        return { ok: false, status: 0, timeout: true, error: "mock timeout" };
      }
      if (failure === "SERVER_ERROR") return { ok: false, status: 503, timeout: false, error: "mock 503" };
      if (failure === "RATE_LIMITED") return { ok: false, status: 429, timeout: false, error: "mock 429" };
      if (failure === "AUTH") return { ok: false, status: 401, timeout: false, error: "mock 401" };
      if (failure === "MALFORMED") return { ok: true, body: { unexpected: true } };
      const body = synthetic(reference, ++seq);
      orders.set(reference, body);
      return { ok: true, body };
    },
    async lookupOrder(reference): Promise<SupplierLookupResult> {
      calls.lookupOrder += 1;
      const body = orders.get(reference) ?? [...orders.values()].find((b: any) => b.orderReference === reference);
      return body ? { found: true, body } : { found: false, conclusive: true, status: 404 };
    },
  };
  return supplier;
}

function synthetic(reference: string, n: number) {
  const id = String(n).padStart(6, "0");
  return {
    orderReference: `DEMO-ORDER-${id}`,
    status: "DEMO",
    clientReference: reference,
    esims: [{ iccid: `DEMO-ICCID-${id}`, matchingId: `DEMO-${id}`, smdpAddress: DEMO_SMDP_HOST, status: "RELEASED" }],
  };
}

export function isDemoActivation(qrPayload: string | null | undefined): boolean {
  return typeof qrPayload === "string" && qrPayload.includes(DEMO_SMDP_HOST);
}

/** Test orders may only reach the mock supplier; real orders never reach it. */
export function assertSupplierMatchesOrder(isTestOrder: boolean, supplier: LabeledSupplier): void {
  if (isTestOrder && supplier.kind !== "MOCK") throw new Error("Test order cannot use a live supplier.");
  if (!isTestOrder && supplier.kind === "MOCK") throw new Error("Real order cannot use the mock supplier.");
}

/** Simulated usage/validity for a demo eSIM. */
export function simulateDemoUsage(totalMb: number, usedMb: number, validityDays: number, activatedAt: Date) {
  const remainingMb = Math.max(0, totalMb - usedMb);
  const expiresAt = new Date(activatedAt.getTime() + validityDays * 86_400_000).toISOString();
  return { totalMb, remainingMb, expiresAt, status: remainingMb === 0 ? "EXHAUSTED" : "ACTIVE" };
}
