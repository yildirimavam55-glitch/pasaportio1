import { useEffect, useRef, useState } from "react";
import { observeViewport, RESOURCE_AHEAD_PX } from "./viewport-observer";

/** Fetch through existing query keys before arrival, independently of motion preferences. */
export function useNearViewport() {
  const ref = useRef<HTMLElement | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) { setReady(true); return; }
    return observeViewport(node, RESOURCE_AHEAD_PX, () => setReady(true));
  }, []);
  return { ref, ready };
}