import { useEffect, useRef, useState } from "react";
import { Link2, QrCode } from "lucide-react";
import { DecorativeQr, InstallationMethodSelector, InstallationSuccess, type InstallationMethod } from "./InstallationExperience";

const PHASE_MS = 1250;
const PHASE_COUNT = 8;

type InstallAnimationProps = {
  quickSteps: readonly string[];
  qrSteps: readonly string[];
  ready: string;
  adding: string;
  quickLabel: string;
  quickDescription: string;
  qrLabel: string;
  qrDescription: string;
  selectorLabel: string;
  quickSelectorLabel: string;
  qrSelectorLabel: string;
  onStateChange?: (method: "quick" | "qr", phase: number) => void;
};

export function V2InstallAnimation({ quickSteps, qrSteps, ready, adding, quickLabel, quickDescription, qrLabel, qrDescription, selectorLabel, quickSelectorLabel, qrSelectorLabel, onStateChange }: InstallAnimationProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [phase, setPhase] = useState(0);
  const [restartKey, setRestartKey] = useState(0);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => setReduced(mq.matches);
    updateMotion();
    mq.addEventListener("change", updateMotion);
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") return () => mq.removeEventListener("change", updateMotion);
    const observer = new IntersectionObserver(([entry]) => setVisible(Boolean(entry?.isIntersecting)), { threshold: 0.35 });
    observer.observe(node);
    return () => { observer.disconnect(); mq.removeEventListener("change", updateMotion); };
  }, []);

  useEffect(() => {
    if (reduced || !visible) return;
    const timer = window.setTimeout(() => setPhase((current) => (current + 1) % PHASE_COUNT), PHASE_MS);
    return () => window.clearTimeout(timer);
  }, [phase, reduced, restartKey, visible]);

  const current = reduced ? (phase < 4 ? 3 : 7) : phase;
  const method = current < 4 ? "quick" : "qr";
  const methodPhase = current % 4;
  const selectMethod = (selected: InstallationMethod) => {
    setPhase(selected === "quick" ? 0 : 4);
    setRestartKey((currentKey) => currentKey + 1);
  };

  useEffect(() => { onStateChange?.(method, methodPhase); }, [method, methodPhase, onStateChange]);
  const visibleSteps = method === "quick" ? quickSteps : qrSteps;

  return (
    <div ref={ref} className="rounded-2xl bg-muted/50 p-4 ring-1 ring-border lg:h-[20rem] lg:w-full lg:p-5">
      <div className="mx-auto mb-3 w-full max-w-[17rem] lg:mb-4">
        <InstallationMethodSelector value={method} onChange={selectMethod} quickLabel={quickSelectorLabel} qrLabel={qrSelectorLabel} ariaLabel={selectorLabel} compact />
      </div>
      <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-4 lg:flex lg:items-center lg:justify-center">
      <div aria-hidden="true" className="relative mx-auto h-[12.5rem] w-[6.5rem] rounded-[1.4rem] bg-foreground/90 p-1.5 shadow-lg lg:h-[15.5rem] lg:w-[8rem] lg:rounded-[1.7rem] lg:p-2">
        <div className="relative h-full w-full overflow-hidden rounded-[1.05rem] bg-card">
          <div className="absolute left-1/2 top-1.5 z-20 h-1.5 w-8 -translate-x-1/2 rounded-full bg-foreground/80 lg:top-2 lg:h-2 lg:w-12" />
          <div className={`absolute inset-x-2 top-10 transition-all duration-300 lg:inset-x-3 lg:top-20 ${method === "quick" && methodPhase < 2 ? "opacity-100" : "translate-y-2 opacity-0"}`}>
            <div className="rounded-xl bg-secondary p-2 text-center ring-1 ring-border lg:p-3">
              <span className="mx-auto grid size-7 place-items-center rounded-lg bg-primary-soft text-primary lg:size-10"><Link2 className="size-4 lg:size-5" /></span>
              <p className="mt-1 text-[8px] font-bold text-foreground lg:text-[11px]">{quickLabel}</p>
              <div className="relative mt-2 rounded-lg bg-primary px-1.5 py-1 text-[6px] font-bold text-primary-foreground lg:text-[8px]">travely.link/install{methodPhase === 1 && <span className="absolute -bottom-2 -right-1 size-5 rounded-full border-2 border-cta bg-cta/30 motion-safe:animate-pulse" />}</div>
            </div>
          </div>
          <div className={`absolute inset-x-3 top-9 aspect-square transition-all duration-300 lg:inset-x-5 lg:top-14 ${method === "qr" && methodPhase < 2 ? "opacity-100" : "translate-y-2 scale-90 opacity-0"}`}>
            <DecorativeQr className="size-full" />
            {methodPhase === 1 && <span className="v2-scanline absolute inset-x-[-4px] top-0 h-0.5 rounded-full bg-[var(--v2-service)] shadow-[0_0_8px_var(--v2-service)]" />}
          </div>
          <div className={`absolute inset-x-3 top-14 text-center transition-all duration-300 lg:inset-x-5 lg:top-28 ${methodPhase === 2 ? "opacity-100" : "translate-y-2 opacity-0"}`}>
            <span className="text-[9px] font-semibold text-foreground lg:text-xs">{adding}</span>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted"><div className="v2-progress h-full rounded-full bg-[var(--v2-service)]" /></div>
          </div>
          <div className={`absolute inset-x-2 top-11 transition-all duration-300 lg:top-24 ${methodPhase === 3 ? "opacity-100" : "translate-y-2 opacity-0"}`}><InstallationSuccess label={ready} compact /></div>
        </div>
      </div>
      <div className="min-w-0 lg:hidden" aria-live="polite">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-foreground">{method === "quick" ? <Link2 className="size-4 text-primary" /> : <QrCode className="size-4 text-primary" />}{method === "quick" ? quickLabel : qrLabel}</span>
        <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{method === "quick" ? quickDescription : qrDescription}</p>
        <ol className="mt-3 grid gap-1.5">{visibleSteps.map((step, index) => <li key={step} className={`flex min-w-0 items-center gap-2 rounded-lg px-2 py-1 text-[10px] transition-colors ${index === methodPhase ? "bg-card font-bold text-foreground ring-1 ring-border" : "text-muted-foreground"}`}><span className={`grid size-4 shrink-0 place-items-center rounded-full text-[8px] font-bold ${index <= methodPhase ? "bg-[var(--v2-service)] text-primary-foreground" : "bg-card ring-1 ring-border"}`}>{index + 1}</span><span>{step}</span></li>)}</ol>
      </div>
      </div>
    </div>
  );
}
