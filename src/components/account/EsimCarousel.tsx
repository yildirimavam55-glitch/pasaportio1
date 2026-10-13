import { Children, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

const SNAP_GAP_PX = 12;

/**
 * Horizontal scroll-snap rail for eSIM cards on mobile.
 * Cards keep a small peek of the next card so swiping is discoverable;
 * on md+ the CSS promotes the rail to a responsive grid and dots hide.
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
    setIndex(Math.min(cards.length - 1, Math.max(0, Math.round(Math.abs(el.scrollLeft) / step))));
  };

  const goTo = (i: number) => {
    const el = trackRef.current;
    if (!el) return;
    const step = stepSize();
    if (!step) return;
    const direction = getComputedStyle(el).direction === 'rtl' ? -1 : 1;
    el.scrollTo({ left: direction * i * step, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
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
      <div className="mt-1 flex items-center justify-center gap-2 md:hidden">
        <Button variant="ghost" size="icon" type="button" onClick={() => goTo(Math.max(0, index - 1))} disabled={index === 0} aria-label={`← ${label}`} className="grid size-11 place-items-center rounded-full text-muted-foreground disabled:opacity-30">
          <ChevronLeft className="size-4" />
        </Button>
        <div className="flex" >
        {cards.map((_, i) => (
          <Button variant="ghost" size="icon"
            key={i}
            type="button"
            aria-pressed={i === index}
            aria-label={`${i + 1} / ${cards.length}`}
            onClick={() => goTo(i)}
            className="size-11 rounded-full"
          ><span className={`size-2 rounded-full transition-colors ${i === index ? 'bg-primary' : 'bg-primary/20'}`} /></Button>
        ))}
        </div>
        <Button variant="ghost" size="icon" type="button" onClick={() => goTo(Math.min(cards.length - 1, index + 1))} disabled={index === cards.length - 1} aria-label={`${label} →`} className="grid size-11 place-items-center rounded-full text-muted-foreground disabled:opacity-30">
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
