import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { PlaneTakeoff, Smartphone, Wifi } from "lucide-react";
import type { ServiceSlug } from "@/content/travel-content";

type TransitionPhase = "entering" | "leaving";
type TransitionState = { target: ServiceSlug; phase: TransitionPhase } | null;
type SwitchContextValue = {
  switchService: (target: ServiceSlug, commit: () => void) => void;
  isSwitching: boolean;
};

const ServiceSwitchContext = createContext<SwitchContextValue | null>(null);

export function ServiceSwitchTransitionProvider({ children }: { children: ReactNode }) {
  const [transition, setTransition] = useState<TransitionState>(null);
  const runningRef = useRef(false);
  const timersRef = useRef<number[]>([]);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const switchService = useCallback((target: ServiceSlug, commit: () => void) => {
    if (runningRef.current) return;
    runningRef.current = true;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const commitAt = reduced ? 35 : 260;
    const leaveAt = reduced ? 45 : 440;
    const finishAt = reduced ? 110 : 650;

    setTransition({ target, phase: "entering" });
    timersRef.current = [
      window.setTimeout(commit, commitAt),
      window.setTimeout(() => setTransition({ target, phase: "leaving" }), leaveAt),
      window.setTimeout(() => {
        setTransition(null);
        runningRef.current = false;
        timersRef.current = [];
      }, finishAt),
    ];
  }, []);

  return (
    <ServiceSwitchContext.Provider value={{ switchService, isSwitching: transition !== null }}>
      {children}
      {transition && <ServiceTransitionOverlay target={transition.target} phase={transition.phase} />}
    </ServiceSwitchContext.Provider>
  );
}

export function useServiceSwitchTransition() {
  const context = useContext(ServiceSwitchContext);
  if (!context) throw new Error("useServiceSwitchTransition must be used within ServiceSwitchTransitionProvider");
  return context;
}

function ServiceTransitionOverlay({ target, phase }: { target: ServiceSlug; phase: TransitionPhase }) {
  const lounge = target === "lounge";
  return (
    <div
      className="service-switch-overlay"
      data-phase={phase}
      data-target={target}
      role="status"
      aria-live="polite"
      aria-label={lounge ? "Lounge" : "eSIM"}
    >
      <div className="service-switch-icon" aria-hidden="true">
        {lounge ? (
          <PlaneTakeoff className="service-switch-main-icon" />
        ) : (
          <span className="service-switch-connectivity">
            <Smartphone className="service-switch-main-icon" />
            <Wifi className="service-switch-signal-icon" />
          </span>
        )}
      </div>
    </div>
  );
}