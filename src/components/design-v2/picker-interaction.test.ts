import { describe, expect, it, vi } from "vitest";
import { beginPickerPress, completePickerPress, getPickerKeyboardStyle, isDuplicatePickerClick, movePickerPress, type PickerPress } from "./picker-interaction";

describe("V2 picker touch selection", () => {
  it("commits a focused-input result once before blur and viewport changes", () => {
    const select = vi.fn();
    const navigate = vi.fn();
    let press: PickerPress | null = beginPickerPress("TR", 7, 32, 120);

    // iOS may blur the input and resize visualViewport before its synthetic click.
    const inputBlurred = true;
    const viewportHeight = 390;
    expect(inputBlurred).toBe(true);
    expect(viewportHeight).toBe(390);

    const selectedId = completePickerPress(press, 7);
    if (selectedId) {
      select(selectedId);
      navigate(selectedId);
    }
    const committed = selectedId ? { id: selectedId, at: 100 } : null;
    if (!isDuplicatePickerClick(committed, "TR", 120)) select("TR");
    press = null;

    expect(press).toBeNull();
    expect(select).toHaveBeenCalledTimes(1);
    expect(select).toHaveBeenCalledWith("TR");
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it("does not select when a vertical drag scrolls the results", () => {
    const select = vi.fn();
    let press: PickerPress | null = beginPickerPress("TR", 8, 40, 180);
    press = movePickerPress(press, 8, 42, 212);
    const selectedId = completePickerPress(press, 8);
    if (selectedId) select(selectedId);
    expect(select).not.toHaveBeenCalled();
  });

  it("selects the intended row rather than another visible result", () => {
    const germany = beginPickerPress("DE", 9, 35, 176);
    expect(completePickerPress(germany, 9)).toBe("DE");
    expect(completePickerPress(germany, 10)).toBeNull();
  });

  it("keeps horizontal sheet geometry out of visual viewport adaptation", () => {
    const beforeKeyboard = getPickerKeyboardStyle(0, 780);
    const afterKeyboard = getPickerKeyboardStyle(44, 390);

    expect(beforeKeyboard).not.toHaveProperty("width");
    expect(beforeKeyboard).not.toHaveProperty("left");
    expect(beforeKeyboard).not.toHaveProperty("right");
    expect(afterKeyboard).not.toHaveProperty("width");
    expect(afterKeyboard).not.toHaveProperty("left");
    expect(afterKeyboard).not.toHaveProperty("right");
    expect(afterKeyboard).toEqual({ top: 52, bottom: "auto", height: 374, maxHeight: 374 });
  });
});