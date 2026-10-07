import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Below-the-fold entrance: short opacity + transform, runs once, honours reduced motion.
 * Content renders visible (server and first client render agree); only items that are
 * genuinely below the viewport after hydration are hidden and then animated in, so
 * anything already on screen is never invisible.
 */
export function Reveal({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [state, setState] = useState<"shown" | "pending" | "revealed">("shown");

  useEffect(() => {
    const node = ref.current;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (!node || reduced || typeof IntersectionObserver === "undefined") return;
    // On screen or immediately adjacent: keep it visible, no animation.
    if (node.getBoundingClientRect().top < window.innerHeight + 80) return;
    setState("pending");
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setState("revealed");
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -5% 0px", threshold: 0.05 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const stateClass = state === "pending" ? "reveal-pending" : "is-revealed";
  return (
    <div
      ref={ref}
      className={`reveal-item ${stateClass} ${className}`}
      style={state === "revealed" && delay ? { transitionDelay: `${Math.min(delay, 120)}ms` } : undefined}
    >
      {children}
    </div>
  );
}
