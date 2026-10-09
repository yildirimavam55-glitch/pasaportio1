import { useEffect, useRef, useState } from "react";
import { Link2, QrCode } from "lucide-react";
import { DecorativeQr, InstallationPhone, useInstallationLabels, InstallationMethodSelector, InstallationSuccess, TapIndicator, type InstallationMethod } from "./InstallationExperience";

const PHASE_MS = 2200;
const SUCCESS_MS = 3000;
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
  const labels = useInstallationLabels();
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
    const timer = window.setTimeout(() => setPhase((current) => (current + 1) % PHASE_COUNT), phase % 4 === 3 ? SUCCESS_MS : PHASE_MS);
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
    <div ref={ref} className="rounded-2xl bg-muted/50 p-4 ring-1 ring-border lg:min-h-[20rem] lg:w-full lg:p-4">
      <div className="mx-auto mb-3 w-full max-w-[17rem] lg:mb-3">
        <InstallationMethodSelector value={method} onChange={selectMethod} quickLabel={labels.quickTab} qrLabel={labels.qrTab} ariaLabel={selectorLabel} compact />
      </div>
      <div className="grid min-w-0 gap-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center lg:flex lg:justify-center">
      <InstallationPhone phase={`${method}-${methodPhase}`}>
        {method === "quick" && methodPhase < 2 ? <div className="installation-stack"><span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary"><Link2 className="size-5" /></span><p className="font-bold">{labels.link}</p><div className={`installation-action bg-primary text-primary-foreground ${methodPhase === 1 ? "install-tap-target" : ""}`}>{labels.link}{methodPhase === 1 && <TapIndicator className="bottom-3 end-3" />}</div></div>
          : method === "qr" && methodPhase < 2 ? <div className="installation-qr-wrap"><DecorativeQr />{methodPhase === 1 && <span className="installation-scanline bg-primary" />}</div>
          : methodPhase === 2 ? <div className="installation-stack"><p className="font-semibold">{adding}</p><div className="h-1.5 w-full rounded-full bg-muted"><div className="v2-progress h-full rounded-full bg-primary" /></div></div>
          : <InstallationSuccess label={ready} compact />}
      </InstallationPhone>
      <div className="min-w-0 lg:hidden" aria-live="polite">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-foreground">{method === "quick" ? <Link2 className="size-4 text-primary" /> : <QrCode className="size-4 text-primary" />}{method === "quick" ? quickLabel : qrLabel}</span>
        <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{method === "quick" ? quickDescription : qrDescription}</p>
        <ol className="mt-3 grid gap-1.5">{visibleSteps.map((step, index) => <li key={step} className={`flex min-w-0 items-center gap-2 rounded-lg px-2 py-1 text-[10px] transition-colors ${index === methodPhase ? "bg-card font-bold text-foreground ring-1 ring-border" : "text-muted-foreground"}`}><span className={`grid size-4 shrink-0 place-items-center rounded-full text-[8px] font-bold ${index <= methodPhase ? "bg-[var(--v2-service)] text-primary-foreground" : "bg-card ring-1 ring-border"}`}>{index + 1}</span><span>{step}</span></li>)}</ol>
      </div>
      </div>
    </div>
  );
}
