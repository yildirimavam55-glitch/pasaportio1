import { useRef } from "react";

/** Retain the renderer's interface without observers, motion state or scroll effects. */
export function useTrustIconEntry() {
  const ref = useRef<HTMLDivElement>(null);
  return { ref, entered: false };
}