import { useEffect, useRef, useState } from "react";
import { usePublishedTheme } from "@/components/PublishedTheme";
import { observeViewport } from "@/components/travel/viewport-observer";

/** Decorative only: the row stays visible even before hydration or without motion. */
export function useTrustIconEntry() {
  const ref = useRef<HTMLUListElement>(null);
  const seen = useRef(false);
  const [entered, setEntered] = useState(false);
  const enabled = usePublishedTheme().homepageScrollAnimations;
  useEffect(() => {
    const node = ref.current;
    if (!node || seen.current || !enabled) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) { seen.current = true; return; }
    const stop = observeViewport(node, 0, () => {
      seen.current = true;
      setEntered(true);
    });
    const motion = () => { if (mq.matches) { stop(); seen.current = true; setEntered(false); } };
    mq.addEventListener("change", motion);
    return () => { stop(); mq.removeEventListener("change", motion); };
  }, [enabled]);
  return { ref, entered: enabled && entered };
}