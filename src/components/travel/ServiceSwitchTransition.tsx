import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { ServiceSlug } from "@/content/travel-content";

export type TransitionPhase = "outgoing" | "incoming";
type TransitionState = { target: ServiceSlug; phase: TransitionPhase } | null;
type SwitchContextValue = {
  switchService: (target: ServiceSlug, commit: () => void) => void;
  isSwitching: boolean;
  target: ServiceSlug | null;
  phase: TransitionPhase | null;
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
    const commitAt = reduced ? 10 : 400;
    const finishAt = reduced ? 40 : 1100;

    setTransition({ target, phase: "outgoing" });
    timersRef.current = [
      window.setTimeout(() => {
        setTransition({ target, phase: "incoming" });
        commit();
      }, commitAt),
      window.setTimeout(() => {
        setTransition(null);
        runningRef.current = false;
        timersRef.current = [];
      }, finishAt),
    ];
  }, []);

  return (
    <ServiceSwitchContext.Provider value={{ switchService, isSwitching: transition !== null, target: transition?.target ?? null, phase: transition?.phase ?? null }}>
      {children}
    </ServiceSwitchContext.Provider>
  );
}

export function useServiceSwitchTransition() {
  const context = useContext(ServiceSwitchContext);
  if (!context) throw new Error("useServiceSwitchTransition must be used within ServiceSwitchTransitionProvider");
  return context;
}