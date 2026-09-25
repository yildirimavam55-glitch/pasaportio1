import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";

/** Decorative, intentionally non-scannable QR-like pattern (no timing patterns, no encoded data). */
const CELLS = [
  "0010110", "1101001", "0110100", "1001011", "0101101", "1010010", "0111001",
];

function FakeQr() {
  const finder = (x: number, y: number) => (
    <g key={`${x}-${y}`}>
      <rect x={x} y={y} width="7" height="7" rx="1.5" className="fill-foreground" />
      <rect x={x + 1} y={y + 1} width="5" height="5" rx="1" className="fill-card" />
      <rect x={x + 2} y={y + 2} width="3" height="3" rx="0.6" className="fill-foreground" />
    </g>
  );
  return (
    <svg viewBox="0 0 21 21" aria-hidden className="size-full">
      {finder(0, 0)}
      {finder(14, 0)}
      {finder(0, 14)}
      {CELLS.map((row, r) =>
        row.split("").map((v, c) => (v === "1" ? <rect key={`${r}-${c}`} x={8 + (c % 6)} y={8 + r * 1.8} width="1" height="1" rx="0.3" className="fill-foreground/70" /> : null)),
      )}
      <rect x="15" y="15" width="1.2" height="1.2" rx="0.3" className="fill-foreground/70" />
      <rect x="17.5" y="17" width="1.2" height="1.2" rx="0.3" className="fill-foreground/70" />
    </svg>
  );
}

const STEP_MS = 2400;

export function V2InstallAnimation({ steps, ready, adding, onPhaseChange }: { steps: readonly string[]; ready: string; adding: string; onPhaseChange?: (phase: number) => void }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    setReduced(!!mq?.matches);
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setVisible(!!e?.isIntersecting), { threshold: 0.35 });
    io.observe(node);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (reduced || !visible) return;
    const id = window.setInterval(() => setPhase((p) => (p + 1) % 4), STEP_MS);
    return () => window.clearInterval(id);
  }, [visible, reduced]);

  const p = reduced ? 3 : phase;

  useEffect(() => {
    onPhaseChange?.(p);
  }, [onPhaseChange, p]);

  return (
    <div ref={ref} className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-4 rounded-2xl bg-muted/50 p-4 ring-1 ring-border lg:flex lg:h-[20rem] lg:w-full lg:items-center lg:justify-center lg:p-6">
      <div aria-hidden className="relative mx-auto h-[12.5rem] w-[6.5rem] rounded-[1.4rem] bg-foreground/90 p-1.5 shadow-lg lg:h-[19rem] lg:w-[9.8rem] lg:rounded-[2rem] lg:p-2">
        <div className="relative h-full w-full overflow-hidden rounded-[1.05rem] bg-card">
          <div className="absolute left-1/2 top-1.5 h-1.5 w-8 -translate-x-1/2 rounded-full bg-foreground/80 lg:top-2 lg:h-2 lg:w-12" />
          {/* QR */}
          <div className={`absolute inset-x-3 top-9 aspect-square transition-all duration-500 lg:inset-x-5 lg:top-14 ${p <= 1 ? "translate-y-0 scale-100 opacity-100" : "translate-y-2 scale-90 opacity-0"}`}>
            <FakeQr />
            {p === 1 && <span className="v2-scanline absolute inset-x-[-4px] top-0 h-0.5 rounded-full bg-[var(--v2-service)] shadow-[0_0_8px_var(--v2-service)]" />}
          </div>
          {/* Adding */}
          <div className={`absolute inset-x-3 top-14 text-center transition-all duration-500 lg:inset-x-5 lg:top-28 ${p === 2 ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}>
            <span className="text-[9px] font-semibold text-foreground lg:text-xs">{adding}</span>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
              <div className={`h-full rounded-full bg-[var(--v2-service)] ${p === 2 ? "v2-progress" : "w-0"}`} />
            </div>
          </div>
          {/* Ready */}
          <div className={`absolute inset-x-2 top-10 flex flex-col items-center transition-all duration-500 lg:top-20 ${p === 3 ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}>
            <div className="flex h-8 items-end gap-1 lg:h-14 lg:gap-1.5">
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className="w-1.5 rounded-sm bg-[var(--v2-service)] transition-all duration-300 lg:w-2" style={{ height: p === 3 ? `${(i + 1) * 25}%` : "10%", transitionDelay: reduced ? "0ms" : `${i * 150}ms` }} />
              ))}
            </div>
            <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-[var(--v2-service)]/12 px-2 py-1 text-[9px] font-bold text-[var(--v2-service)] lg:px-3 lg:py-1.5 lg:text-xs">
              <Check className="size-3" />{ready}
            </span>
          </div>
        </div>
      </div>
      <ol className="grid gap-2 lg:hidden">
        {steps.map((step, i) => {
          const on = i === p;
          return (
            <li key={step} className={`flex min-w-0 items-center gap-2 rounded-xl px-2 py-1.5 text-xs transition-colors duration-300 ${on ? "bg-card font-bold text-foreground shadow-sm ring-1 ring-[var(--v2-service)]/40" : "text-muted-foreground"}`}>
              <span className={`grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-bold transition-colors ${on || (reduced && i <= p) ? "bg-[var(--v2-service)] text-primary-foreground" : "bg-card text-muted-foreground ring-1 ring-border"}`}>{i + 1}</span>
              <span className="min-w-0 leading-tight">{step}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
