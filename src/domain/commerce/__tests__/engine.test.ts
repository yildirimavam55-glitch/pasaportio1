import { describe, expect, it } from "vitest";

import {
  provisionOrder,
  provisionUnit,
  reconcileUnit,
  type ProvisioningStore,
  type SupplierLookupResult,
  type SupplierOrderResult,
  type SupplierPort,
  type UnitRow,
} from "../engine";
import { planUnits, type ProvisioningStatus } from "../provisioning";

const LIVE = { liveSupplierCallsEnabled: true };

/** In-memory store with the same guarantees as the SQL implementation. */
function createStore(options: { paid: boolean; units: Array<Partial<UnitRow>>; failEsimWrite?: boolean }) {
  const units = new Map<string, UnitRow>();
  const esims: Array<{ id: string; unitId: string; qrPayload: string; iccid: string | null }> = [];
  const alerts: Array<{ type: string; unitId: string }> = [];
  const orderState: { fulfillment: string } = { fulfillment: "PENDING" };

  options.units.forEach((patch, index) => {
    const id = patch.id ?? `u${index + 1}`;
    units.set(id, {
      id,
      orderId: "o1",
      orderItemId: patch.orderItemId ?? "i1",
      unitIndex: patch.unitIndex ?? index + 1,
      status: patch.status ?? "PENDING",
      providerReference: patch.providerReference ?? null,
      customerEsimId: patch.customerEsimId ?? null,
      attemptCount: patch.attemptCount ?? 0,
      externalId: patch.externalId ?? "esim_10GB_TR",
      providerId: "prov-1",
      snapshot: patch.snapshot ?? {
        destinationLabel: "Türkiye",
        packageLabel: "10 GB · 30 gün",
        totalDataMb: 10000,
        validityStartRule: "FIRST_CONNECTION",
        topupSupported: false,
      },
    });
  });

  const store: ProvisioningStore = {
    async isOrderPaid() {
      return options.paid;
    },
    async loadUnit(id) {
      return units.get(id) ?? null;
    },
    async listUnits() {
      return [...units.values()];
    },
    async claimUnit(id) {
      const unit = units.get(id);
      // Atomic conditional claim: PENDING/FAILED only, and only once.
      if (!unit || (unit.status !== "PENDING" && unit.status !== "FAILED")) return null;
      const claimed: UnitRow = { ...unit, status: "IN_PROGRESS", attemptCount: unit.attemptCount + 1 };
      units.set(id, claimed);
      return claimed;
    },
    async saveReference(id, reference, providerStatus) {
      const unit = units.get(id)!;
      units.set(id, { ...unit, providerReference: reference });
      void providerStatus;
    },
    async createEsim(unit, esim) {
      if (options.failEsimWrite) throw new Error("db down");
      const id = `esim-${esims.length + 1}`;
      esims.push({ id, unitId: unit.id, qrPayload: esim.qrPayload ?? "", iccid: esim.iccid });
      return id;
    },
    async finishUnit(id, esimId) {
      const unit = units.get(id)!;
      units.set(id, { ...unit, status: "PROVISIONED", customerEsimId: esimId });
    },
    async failUnit(id, status, category, message) {
      const unit = units.get(id)!;
      units.set(id, { ...unit, status });
      void category;
      void message;
    },
    async resetUnit(id) {
      const unit = units.get(id)!;
      units.set(id, { ...unit, status: "PENDING" });
    },
    async raiseAlert(type, unitId) {
      if (!alerts.some((alert) => alert.type === type && alert.unitId === unitId)) alerts.push({ type, unitId });
    },
    async setOrderFulfillment(_orderId, status) {
      orderState.fulfillment = status;
    },
  };

  return { store, units, esims, alerts, orderState };
}

function supplier(responses: SupplierOrderResult[], lookup?: SupplierLookupResult) {
  const calls: Array<{ externalId: string; reference: string }> = [];
  const port: SupplierPort = {
    async placeOrder(input) {
      calls.push({ externalId: input.externalId, reference: input.reference });
      return responses[Math.min(calls.length - 1, responses.length - 1)]!;
    },
    ...(lookup ? { lookupOrder: async () => lookup } : {}),
  };
  return { port, calls };
}

const SUCCESS: SupplierOrderResult = {
  ok: true,
  body: {
    orderReference: "ORD-1",
    status: "completed",
    esims: [{ iccid: "8944000000000000001", matchingId: "AB12", smdpAddress: "rsp.example.com", status: "released" }],
  },
};

describe("provisioning engine — payment gate", () => {
  it("does not provision an unpaid order", async () => {
    const { store, esims } = createStore({ paid: false, units: [{}] });
    const { port, calls } = supplier([SUCCESS]);
    expect(await provisionUnit(store, port, "u1", LIVE)).toEqual({ result: "NOT_PAID" });
    expect(calls).toHaveLength(0);
    expect(esims).toHaveLength(0);
  });

  it("never calls the supplier while live purchases are disabled", async () => {
    const { store } = createStore({ paid: true, units: [{}] });
    const { port, calls } = supplier([SUCCESS]);
    expect(await provisionUnit(store, port, "u1", { liveSupplierCallsEnabled: false })).toEqual({ result: "DISABLED" });
    expect(calls).toHaveLength(0);
  });
});

describe("provisioning engine — success path", () => {
  it("creates exactly one eSIM per unit", async () => {
    const { store, esims, units } = createStore({ paid: true, units: [{}] });
    const { port, calls } = supplier([SUCCESS]);
    const outcome = await provisionUnit(store, port, "u1", LIVE);
    expect(outcome.result).toBe("PROVISIONED");
    expect(calls).toHaveLength(1);
    expect(esims).toHaveLength(1);
    expect(esims[0]!.qrPayload).toBe("LPA:1$rsp.example.com$AB12");
    expect(units.get("u1")!.status).toBe("PROVISIONED");
    expect(units.get("u1")!.providerReference).toBe("ORD-1");
  });

  it("marks the whole order fulfilled only when every unit succeeded", async () => {
    const { store, esims, orderState } = createStore({ paid: true, units: [{}, {}, {}] });
    const { port, calls } = supplier([SUCCESS]);
    const run = await provisionOrder(store, port, "o1", LIVE);
    expect(calls).toHaveLength(3);
    expect(esims).toHaveLength(3);
    expect(run.fulfillment).toBe("FULFILLED");
    expect(orderState.fulfillment).toBe("FULFILLED");
  });
});

describe("provisioning engine — no duplicate supplier purchases", () => {
  it("is idempotent when triggered twice", async () => {
    const { store, esims } = createStore({ paid: true, units: [{}] });
    const { port, calls } = supplier([SUCCESS]);
    await provisionUnit(store, port, "u1", LIVE);
    const second = await provisionUnit(store, port, "u1", LIVE);
    expect(second).toEqual({ result: "ALREADY_PROVISIONED" });
    expect(calls).toHaveLength(1);
    expect(esims).toHaveLength(1);
  });

  it("lets only one concurrent trigger reach the supplier", async () => {
    const { store, esims } = createStore({ paid: true, units: [{}] });
    const { port, calls } = supplier([SUCCESS]);
    const [a, b] = await Promise.all([
      provisionUnit(store, port, "u1", LIVE),
      provisionUnit(store, port, "u1", LIVE),
    ]);
    expect(calls).toHaveLength(1);
    expect(esims).toHaveLength(1);
    expect([a.result, b.result].sort()).toEqual(["BUSY", "PROVISIONED"]);
  });

  it("does not repurchase a unit that already holds a supplier reference", async () => {
    const { store } = createStore({ paid: true, units: [{ status: "FAILED", providerReference: "ORD-9" }] });
    const { port, calls } = supplier([SUCCESS]);
    expect(await provisionUnit(store, port, "u1", LIVE)).toEqual({ result: "NEEDS_RECONCILIATION" });
    expect(calls).toHaveLength(0);
  });

  it("retrying unit #1 never creates an extra unit", async () => {
    const { store, esims, units } = createStore({ paid: true, units: [{ id: "u1" }, { id: "u2", unitIndex: 2 }] });
    const { port, calls } = supplier([SUCCESS]);
    await provisionUnit(store, port, "u1", LIVE);
    await provisionUnit(store, port, "u1", LIVE);
    expect(units.size).toBe(2);
    expect(calls).toHaveLength(1);
    expect(esims).toHaveLength(1);
  });
});

describe("provisioning engine — failures", () => {
  const cases: Array<{ name: string; response: SupplierOrderResult; status: ProvisioningStatus; alert: string }> = [
    { name: "timeout", response: { ok: false, status: 0, timeout: true, error: "timeout" }, status: "RESULT_UNKNOWN", alert: "SUPPLIER_RESULT_UNKNOWN" },
    { name: "429", response: { ok: false, status: 429, timeout: false, error: "rate" }, status: "FAILED", alert: "PROVIDER_ERROR" },
    { name: "500", response: { ok: false, status: 500, timeout: false, error: "boom" }, status: "RESULT_UNKNOWN", alert: "SUPPLIER_RESULT_UNKNOWN" },
    { name: "401", response: { ok: false, status: 401, timeout: false, error: "auth" }, status: "FAILED", alert: "PROVIDER_ERROR" },
  ];

  for (const testCase of cases) {
    it(`handles ${testCase.name} without fulfilling the order`, async () => {
      const { store, units, esims, alerts } = createStore({ paid: true, units: [{}] });
      const { port } = supplier([testCase.response]);
      const outcome = await provisionUnit(store, port, "u1", LIVE);
      expect(outcome.result).toBe("FAILED");
      expect(units.get("u1")!.status).toBe(testCase.status);
      expect(esims).toHaveLength(0);
      expect(alerts.map((alert) => alert.type)).toContain(testCase.alert);
    });
  }

  it("does not blindly retry after a timeout", async () => {
    const { store } = createStore({ paid: true, units: [{}] });
    const { port, calls } = supplier([{ ok: false, status: 0, timeout: true, error: "timeout" }, SUCCESS]);
    await provisionUnit(store, port, "u1", LIVE);
    const retry = await provisionUnit(store, port, "u1", LIVE);
    expect(retry).toEqual({ result: "NEEDS_RECONCILIATION" });
    expect(calls).toHaveLength(1);
  });

  it("allows a safe retry after a rate limit", async () => {
    const { store, esims } = createStore({ paid: true, units: [{}] });
    const { port, calls } = supplier([{ ok: false, status: 429, timeout: false, error: "rate" }, SUCCESS]);
    await provisionUnit(store, port, "u1", LIVE);
    const retry = await provisionUnit(store, port, "u1", LIVE);
    expect(retry.result).toBe("PROVISIONED");
    expect(calls).toHaveLength(2);
    expect(esims).toHaveLength(1);
  });

  it("treats a malformed supplier response as unknown, not fulfilled", async () => {
    const { store, units, esims } = createStore({ paid: true, units: [{}] });
    const { port } = supplier([{ ok: true, body: { status: "ok" } }]);
    const outcome = await provisionUnit(store, port, "u1", LIVE);
    expect(outcome.result).toBe("FAILED");
    expect(units.get("u1")!.status).toBe("RESULT_UNKNOWN");
    expect(esims).toHaveLength(0);
  });

  it("keeps the supplier reference when the database write fails afterwards", async () => {
    const { store, units, alerts } = createStore({ paid: true, units: [{}], failEsimWrite: true });
    const { port } = supplier([SUCCESS]);
    expect(await provisionUnit(store, port, "u1", LIVE)).toEqual({ result: "NEEDS_RECONCILIATION" });
    expect(units.get("u1")!.providerReference).toBe("ORD-1");
    expect(units.get("u1")!.status).toBe("RESULT_UNKNOWN");
    expect(alerts.map((alert) => alert.type)).toContain("SUPPLIER_RESULT_UNKNOWN");
  });

  it("does not corrupt successful units when a sibling fails", async () => {
    const { store, esims, orderState } = createStore({ paid: true, units: [{ id: "u1" }, { id: "u2", unitIndex: 2 }] });
    const port: SupplierPort = {
      async placeOrder(input) {
        return input.reference.endsWith(":1") ? SUCCESS : { ok: false, status: 500, timeout: false, error: "boom" };
      },
    };
    const run = await provisionOrder(store, port, "o1", LIVE);
    expect(esims).toHaveLength(1);
    expect(run.fulfillment).toBe("FAILED");
    expect(orderState.fulfillment).toBe("FAILED");
  });
});

describe("provisioning engine — reconciliation", () => {
  it("completes a unit when the supplier order actually exists", async () => {
    const { store, esims } = createStore({ paid: true, units: [{ status: "RESULT_UNKNOWN" }] });
    const { port } = supplier([SUCCESS], { found: true, body: (SUCCESS as { body: unknown }).body });
    const outcome = await reconcileUnit(store, port, "u1");
    expect(outcome.result).toBe("PROVISIONED");
    expect(esims).toHaveLength(1);
  });

  it("releases a unit for retry when the supplier has no such order", async () => {
    const { store, units } = createStore({ paid: true, units: [{ status: "RESULT_UNKNOWN" }] });
    const { port } = supplier([SUCCESS], { found: false, conclusive: true, status: 404 });
    expect(await reconcileUnit(store, port, "u1")).toEqual({ result: "NO_SUPPLIER_ORDER" });
    expect(units.get("u1")!.status).toBe("PENDING");
  });

  it("keeps the unit locked when the lookup itself is inconclusive", async () => {
    const { store, units } = createStore({ paid: true, units: [{ status: "RESULT_UNKNOWN" }] });
    const { port } = supplier([SUCCESS], { found: false, conclusive: false, status: 500 });
    expect(await reconcileUnit(store, port, "u1")).toEqual({ result: "STILL_UNKNOWN", status: 500 });
    expect(units.get("u1")!.status).toBe("RESULT_UNKNOWN");
  });
});

describe("unit planning matches the engine", () => {
  it("quantity 3 produces three units and three eSIMs, no more", async () => {
    const planned = planUnits("o1", [{ orderItemId: "i1", quantity: 3 }]);
    const { store, esims } = createStore({ paid: true, units: planned.map((unit, index) => ({ id: `u${index + 1}`, unitIndex: unit.unitIndex })) });
    const { port, calls } = supplier([SUCCESS]);
    await provisionOrder(store, port, "o1", LIVE);
    expect(calls).toHaveLength(3);
    expect(esims).toHaveLength(3);
  });
});
