import { useEffect, useRef, useState } from "react";
import { usePublishedTheme } from "@/components/PublishedTheme";

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
    const show = () => {
      seen.current = true;
      setEntered(true);
    };
    if (typeof IntersectionObserver === "undefined") { show(); return; }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) { show(); observer.disconnect(); }
    }, { threshold: 0 });
    observer.observe(node);
    const motion = () => { if (mq.matches) { observer.disconnect(); seen.current = true; setEntered(false); } };
    mq.addEventListener("change", motion);
    return () => { observer.disconnect(); mq.removeEventListener("change", motion); };
  }, [enabled]);
  return { ref, entered: enabled && entered };
}