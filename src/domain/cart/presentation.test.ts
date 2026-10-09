import { describe, expect, it } from "vitest";
import { cartBadge, cartQuantity } from "./presentation";

describe("cart quantity badge", () => {
  it("counts 2 units plus 3 units as 5", () => expect(cartQuantity([{ quantity: 2 }, { quantity: 3 }])).toBe(5));
  it("updates after quantities change", () => expect(cartQuantity([{ quantity: 4 }, { quantity: 3 }])).toBe(7));
  it("hides when empty", () => expect(cartBadge(cartQuantity([]))).toBeNull());
  it("caps above 99", () => { expect(cartBadge(99)).toBe("99"); expect(cartBadge(100)).toBe("99+"); });
});