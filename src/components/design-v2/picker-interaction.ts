export type PickerPress = {
  id: string;
  pointerId: number;
  startX: number;
  startY: number;
  moved: boolean;
};

const TAP_MOVE_TOLERANCE_PX = 10;

export function beginPickerPress(id: string, pointerId: number, x: number, y: number): PickerPress {
  return { id, pointerId, startX: x, startY: y, moved: false };
}

export function movePickerPress(press: PickerPress | null, pointerId: number, x: number, y: number): PickerPress | null {
  if (!press || press.pointerId !== pointerId || press.moved) return press;
  const moved = Math.hypot(x - press.startX, y - press.startY) > TAP_MOVE_TOLERANCE_PX;
  return moved ? { ...press, moved: true } : press;
}

export function completePickerPress(press: PickerPress | null, pointerId: number): string | null {
  if (!press || press.pointerId !== pointerId || press.moved) return null;
  return press.id;
}

export function isDuplicatePickerClick(
  lastSelection: { id: string; at: number } | null,
  id: string,
  now: number,
): boolean {
  return Boolean(lastSelection && lastSelection.id === id && now - lastSelection.at < 750);
}

export function getPickerKeyboardStyle(top: number, height: number) {
  const inset = 8;
  const availableHeight = Math.max(0, height - inset * 2);
  return {
    top: Math.max(0, top) + inset,
    bottom: "auto" as const,
    height: availableHeight,
    maxHeight: availableHeight,
  };
}