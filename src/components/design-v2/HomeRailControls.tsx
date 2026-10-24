import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from '@/components/ui/button';

const reducedMotion = () => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Shared discoverability for homepage horizontal rails: edge state, arrow paging, one-time mobile swipe hint. */
export function useRailControls<T extends HTMLElement>(deps: unknown[] = []) {
  const ref = useRef<T>(null);
  const [edge, setEdge] = useState({ start: true, end: true });
  const update = useCallback(() => {
    const node = ref.current;
    if (!node) return;
    const pos = Math.abs(node.scrollLeft);
    setEdge({ start: pos < 4, end: pos + node.clientWidth >= node.scrollWidth - 4 });
  }, []);
  useEffect(() => {
    update();
    const node = ref.current;
    window.addEventListener("resize", update);
    if (!node) return () => window.removeEventListener("resize", update);
    const ro = new ResizeObserver(update);ro.observe(node);
    const wheel=(event:WheelEvent)=>{
      if(event.ctrlKey||Math.abs(event.deltaX)>Math.abs(event.deltaY)||node.scrollWidth<=node.clientWidth+4)return;
      const rtl=getComputedStyle(node).direction==='rtl';const delta=event.deltaY*(rtl?-1:1);const position=Math.abs(node.scrollLeft);
      if((event.deltaY<0&&position<4)||(event.deltaY>0&&position+node.clientWidth>=node.scrollWidth-4))return;
      event.preventDefault();node.scrollBy({left:delta,behavior:'instant'});
    };
    node.addEventListener('wheel',wheel,{passive:false});
    return () => { ro.disconnect(); node.removeEventListener('wheel',wheel);window.removeEventListener("resize", update); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  const scroll = (next: boolean) => {
    const node = ref.current;
    if (!node) return;
    const rtl = getComputedStyle(node).direction === "rtl";
    node.scrollBy({ left: node.clientWidth * 0.8 * (next ? 1 : -1) * (rtl ? -1 : 1), behavior: reducedMotion() ? "instant" : "smooth" });
  };
  return { ref, edge, update, scroll };
}

export function RailArrows({ edge, scroll, previous, next }: { edge: { start: boolean; end: boolean }; scroll: (next: boolean) => void; previous: string; next: string }) {
  if (edge.start && edge.end) return null;
  return <>
    <Button type="button" variant="outline" size="icon" className="home-rail-arrow is-prev" aria-label={previous} title={previous} disabled={edge.start} onClick={() => scroll(false)}><ChevronLeft className="size-4 lg:size-5 rtl:rotate-180" aria-hidden /></Button>
    <Button type="button" variant="outline" size="icon" className="home-rail-arrow is-next" aria-label={next} title={next} disabled={edge.end} onClick={() => scroll(true)}><ChevronRight className="size-4 lg:size-5 rtl:rotate-180" aria-hidden /></Button>
  </>;
}
