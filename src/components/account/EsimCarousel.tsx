import { Children, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const SNAP_GAP_PX = 12;

/**
 * Horizontal scroll-snap rail for eSIM cards on mobile.
 * Cards keep a small peek of the next card so swiping is discoverable;
 * on sm+ the CSS promotes the rail to a responsive grid and dots hide.
 */
export function EsimCarousel({ children, label }: { children: ReactNode; label: string }) {
  const cards = Children.toArray(children);
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  if (cards.length <= 1) {
    return <div className="customer-esim-track">{cards}</div>;
  }

  const stepSize = () => {
    const el = trackRef.current;
    const first = el?.firstElementChild as HTMLElement | null;
    if (!el || !first) return 0;
    const styles = getComputedStyle(el);
    const gap = parseFloat(styles.columnGap || styles.gap) || SNAP_GAP_PX;
    return first.offsetWidth + gap;
  };

  const handleScroll = () => {
    const el = trackRef.current;
    if (!el) return;
    const step = stepSize();
    if (!step) return;
    setIndex(Math.min(cards.length - 1, Math.max(0, Math.round(el.scrollLeft / step))));
  };

  const goTo = (i: number) => {
    const el = trackRef.current;
    if (!el) return;
    const step = stepSize();
    if (!step) return;
    el.scrollTo({ left: i * step, behavior: "smooth" });
  };

  return (
    <div>
      <div
        ref={trackRef}
        className="customer-esim-track"
        role="group"
        aria-label={label}
        onScroll={handleScroll}
      >
        {cards}
      </div>
      <div className="mt-1 flex items-center justify-center gap-2 sm:hidden">
        <button type="button" onClick={() => goTo(Math.max(0, index - 1))} disabled={index === 0} aria-label="‹" className="grid size-8 place-items-center rounded-full text-muted-foreground disabled:opacity-30">
          <ChevronLeft className="size-4" />
        </button>
        <div className="flex gap-1.5" aria-hidden="true">
        {cards.map((_, i) => (
          <button
            key={i}
            type="button"
            tabIndex={-1}
            aria-label={`${i + 1} / ${cards.length}`}
            onClick={() => goTo(i)}
            className={`size-2 rounded-full transition-colors ${
              i === index ? "bg-primary" : "bg-primary/20"
            }`}
          />
        ))}
        </div>
        <button type="button" onClick={() => goTo(Math.min(cards.length - 1, index + 1))} disabled={index === cards.length - 1} aria-label="›" className="grid size-8 place-items-center rounded-full text-muted-foreground disabled:opacity-30">
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}
