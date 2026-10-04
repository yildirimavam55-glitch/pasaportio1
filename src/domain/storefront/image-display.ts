/** Presentation-only image crop values. Kept independent of uploaded media. */
export type ImageDisplay = { zoom: number; x: number; y: number; fit: "cover" | "contain" };

export const DEFAULT_IMAGE_DISPLAY: ImageDisplay = { zoom: 100, x: 50, y: 50, fit: "cover" };
export const ESIM_DESKTOP_IMAGE_DISPLAY: ImageDisplay = { ...DEFAULT_IMAGE_DISPLAY, y: 65 };

const clamp = (value: unknown, min: number, max: number, fallback: number) => {
  const number = Number(value);
  return value == null || !Number.isFinite(number) ? fallback : Math.min(max, Math.max(min, number));
};

export function sanitizeImageDisplay(value: unknown, defaults: ImageDisplay = DEFAULT_IMAGE_DISPLAY): ImageDisplay {
  const input = value && typeof value === "object" ? value as Partial<ImageDisplay> : {};
  return {
    zoom: clamp(input.zoom, 100, 180, defaults.zoom),
    x: clamp(input.x, 0, 100, defaults.x),
    y: clamp(input.y, 0, 100, defaults.y),
    fit: input.fit === "contain" ? "contain" : "cover",
  };
}