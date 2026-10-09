import { useCallback, useEffect, useState } from "react";
import type { ServiceType } from "@/domain/enums";
import { cartQuantity } from "./presentation";

/**
 * Local cart foundation (no payment, no provider transaction).
 * Only real catalogue products can ever be added — callers pass a product id.
 */
export type CartLine = {
  id: string;
  productId: string;
  serviceType: ServiceType;
  name: string;
  meta: string;
  price: number | null;
  currency: string;
  quantity: number;
  providerProductId?: string | null;
  dataGb?: number | null;
  validityDays?: number | null;
  coverage?: string[];
  /** Product identity snapshot; deliberately separate from the searched destination. */
  destinationIso?: string | null;
  packageKind?: string | null;
  regionFamily?: "EUROPE" | "EUROPE_USA" | "MIDDLE_EAST" | "ASIA" | "AFRICA" | "AMERICAS" | "GLOBAL" | null;
  isTest?: boolean;
  /** Lounge purchase snapshot (no reservation is created). */
  airport?: string | null;
  terminal?: string | null;
  date?: string | null;
  situation?: string | null;
};

const STORAGE_KEY = "travely.cart.v1";
const listeners = new Set<(lines: CartLine[]) => void>();
let lines: CartLine[] = [];
let hydrated = false;

function read(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as CartLine[]) : [];
    return Array.isArray(parsed) ? parsed.filter((line) => line && typeof line.productId === "string") : [];
  } catch {
    return [];
  }
}

function publish(next: CartLine[]) {
  lines = next;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable — cart stays in memory */
    }
  }
  listeners.forEach((listener) => listener(next));
}

export function useCart() {
  const [state, setState] = useState<CartLine[]>(lines);

  useEffect(() => {
    if (!hydrated) {
      hydrated = true;
      lines = read();
    }
    setState(lines);
    listeners.add(setState);
    return () => {
      listeners.delete(setState);
    };
  }, []);

  const addLine = useCallback((line: Omit<CartLine, "id" | "quantity"> & { quantity?: number }) => {
    if (!isCartSellableService(line.serviceType)) return;
    const quantity = Math.max(1, Math.round(line.quantity ?? 1));
    const existing = lines.find((item) => item.productId === line.productId);
    if (existing) {
      publish(lines.map((item) => (item.productId === line.productId ? { ...item, quantity: item.quantity + quantity } : item)));
      window.dispatchEvent(new Event("cart:item-added"));
      return;
    }
    publish([...lines, { ...line, quantity, id: `${line.productId}-${Date.now()}` }]);
    window.dispatchEvent(new Event("cart:item-added"));
  }, []);

  const removeLine = useCallback((productId: string) => publish(lines.filter((item) => item.productId !== productId)), []);
  const updateQuantity = useCallback((productId: string, quantity: number) => {
    const safeQuantity = Math.max(1, Math.min(9, Math.round(quantity)));
    publish(lines.map((item) => (item.productId === productId ? { ...item, quantity: safeQuantity } : item)));
  }, []);
  const clear = useCallback(() => publish([]), []);

  return { lines: state, addLine, removeLine, updateQuantity, clear, count: cartQuantity(state) };
}

/**
 * Services that may enter the cart. VIGNETTE is NOT FOR SALE until real products and a
 * commercial integration exist (the server also only prices/sells ESIM products).
 */
export const CART_SELLABLE_SERVICES = ["ESIM", "LOUNGE"] as const;
export function isCartSellableService(service: string): boolean {
  return (CART_SELLABLE_SERVICES as readonly string[]).includes(service);
}
