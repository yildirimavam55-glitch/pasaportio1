export const RESOURCE_AHEAD_PX = 400;
export const REVEAL_ENTRY_PX = 24;
export const REVEAL_DURATION_MS = 500;
export const REVEAL_DISTANCE_PX = 14;
export const cardRevealDelay = (index: number) => Math.min(250, Math.max(0, index) * 60);
export const withinEntry = (top: number, height: number, ahead = REVEAL_ENTRY_PX) => top <= height + ahead;

type Listener = () => void;
const groups = new Map<number, { observer: IntersectionObserver; targets: Map<Element, Listener>; cleanup: () => void }>();

/** Two shared observers: resource preparation and visual entry are independent. */
export function observeViewport(node: Element, ahead: number, ready: Listener): () => void {
  if (typeof IntersectionObserver === "undefined") { ready(); return () => {}; }
  try {
    let group = groups.get(ahead);
    if (!group) {
      const targets = new Map<Element, Listener>();
      const finish = (target: Element) => {
        const callback = targets.get(target);
        if (!callback) return;
        targets.delete(target);
        observer.unobserve(target);
        callback();
      };
      const observer = new IntersectionObserver(entries => {
        for (const entry of entries) if (entry.isIntersecting || withinEntry(entry.boundingClientRect.top, window.innerHeight, ahead)) finish(entry.target);
      }, { rootMargin: `${ahead}px 0px`, threshold: 0 });
      let frame = 0;
      // A jump can cross the entire intersection between frames. Never strand its content.
      const check = () => {
        if (frame) return;
        frame = requestAnimationFrame(() => {
          frame = 0;
          for (const target of targets.keys()) if (withinEntry(target.getBoundingClientRect().top, window.innerHeight, ahead)) finish(target);
        });
      };
      window.addEventListener("scroll", check, { passive: true });
      window.addEventListener("hashchange", check);
      window.addEventListener("resize", check);
      group = { observer, targets, cleanup: () => {
        observer.disconnect(); cancelAnimationFrame(frame);
        window.removeEventListener("scroll", check); window.removeEventListener("hashchange", check); window.removeEventListener("resize", check);
      } };
      groups.set(ahead, group);
    }
    group.targets.set(node, ready);
    group.observer.observe(node);
    const current = group;
    return () => {
      current.targets.delete(node); current.observer.unobserve(node);
      if (!current.targets.size) { current.cleanup(); groups.delete(ahead); }
    };
  } catch { ready(); return () => {}; }
}