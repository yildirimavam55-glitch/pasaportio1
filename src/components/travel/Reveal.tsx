import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePublishedTheme } from "@/components/PublishedTheme";
import { cardRevealDelay, observeViewport, REVEAL_ENTRY_PX, RESOURCE_AHEAD_PX, withinEntry } from "./viewport-observer";

/**
 * Below-the-fold entrance: short opacity + transform, runs once, honours reduced motion.
 * Content renders visible (server and first client render agree); only items that are
 * genuinely below the viewport after hydration are hidden and then animated in, so
 * anything already on screen is never invisible.
 */
export function Reveal({ children, delay = 0, className = "", stagger = false }: { children: ReactNode; delay?: number; className?: string; stagger?: boolean }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [state, setState] = useState<"shown" | "pending" | "revealed">("shown");
  const seen = useRef(false);
  const enabled = usePublishedTheme().homepageScrollAnimations;

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    return observeViewport(node, RESOURCE_AHEAD_PX, () => {
      // Promote existing lazy images; src and shared query caches remain untouched.
      node.querySelectorAll<HTMLImageElement>('img[loading="lazy"]').forEach(img => { img.loading = "eager"; });
    });
  }, []);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const show = () => { seen.current = true; setState("shown"); };
    if (!enabled || mq.matches || seen.current || withinEntry(node.getBoundingClientRect().top, window.innerHeight)) { show(); return; }
    const cards = stagger ? node.querySelectorAll<HTMLElement>("[data-reveal-card]") : [];
    Array.from(cards).forEach((card, index) => card.style.setProperty("--reveal-card-delay", `${cardRevealDelay(index)}ms`));
    setState("pending");
    const stop = observeViewport(node, REVEAL_ENTRY_PX, () => { seen.current = true; setState("revealed"); });
    const motion = () => { if (mq.matches) { stop(); show(); } };
    mq.addEventListener("change", motion);
    node.addEventListener("focusin", show);
    return () => { stop(); mq.removeEventListener("change", motion); node.removeEventListener("focusin", show); };
  }, [enabled, stagger]);

  const stateClass = state === "pending" ? "reveal-pending" : "is-revealed";
  return (
    <div
      ref={ref}
      data-scroll-reveal={state}
      data-scroll-motion={enabled ? "on" : "off"}
      className={`reveal-item ${stateClass} ${stagger ? "homepage-reveal-stagger" : ""} ${className}`}
      style={state === "revealed" && delay ? { transitionDelay: `${Math.min(delay, 250)}ms` } : undefined}
    >
      {children}
    </div>
  );
}
