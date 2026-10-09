import type { CartLine } from "./store";

export const cartQuantity = (lines: Pick<CartLine, "quantity">[]) => lines.reduce((sum, line) => sum + line.quantity, 0);
export const cartBadge = (count: number) => count === 0 ? null : count > 99 ? "99+" : String(count);