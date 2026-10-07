import { Fragment, useEffect, useSyncExternalStore, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getPublicCurrencyConfig } from "@/lib/currency.functions";
import { isCurrencyCode, resolveCurrency, type CurrencyCode } from "@/domain/currency/currencies";
import { MANUAL_KEY, STORED_KEY, availableCurrencies, getCurrencyState, setCurrencyState, subscribeCurrency } from "@/domain/currency/store";

function read(key: string) { try { return localStorage.getItem(key); } catch { return null; } }
function write(key: string, value: string) { try { localStorage.setItem(key, value); } catch { /* ignore */ } }

export function useCurrency() {
  const s = useSyncExternalStore(subscribeCurrency, getCurrencyState, getCurrencyState);
  return { code: s.code, source: s.source, available: s.config ? s.config.currencies.map((c) => c.code) : [s.code], config: s.config, setCurrency: chooseCurrency };
}

/** Manual choice: overrides detection, persists in the browser and (if signed in) the account. */
export function chooseCurrency(code: CurrencyCode) {
  if (!availableCurrencies().includes(code)) return;
  write(MANUAL_KEY, code);
  write(STORED_KEY, code);
  setCurrencyState({ code, source: "manual" });
  void supabase.auth.getSession().then(({ data }) => {
    if (data.session && data.session.user.user_metadata?.["preferred_currency"] !== code) {
      void supabase.auth.updateUser({ data: { preferred_currency: code } });
    }
  });
}

/**
 * Loads the cached public FX config once, resolves the visitor's currency from THEIR
 * preferences/location (never the eSIM destination) and re-renders prices in place.
 */
export function CurrencyProvider({ children }: { children: ReactNode }) {
  const fetchConfig = useServerFn(getPublicCurrencyConfig);
  const { data } = useQuery({ queryKey: ["currency-config"], queryFn: () => fetchConfig(), staleTime: 30 * 60 * 1000, gcTime: 60 * 60 * 1000, retry: 1 });
  const { code } = useCurrency();

  useEffect(() => {
    if (!data) return;
    let cancelled = false;
    const apply = (account: string | null) => {
      if (cancelled) return;
      const resolved = resolveCurrency({
        manual: read(MANUAL_KEY), account, stored: read(STORED_KEY), country: data.country,
        browserLocales: typeof navigator !== "undefined" ? navigator.languages ?? [navigator.language] : [],
        available: data.currencies.map((c) => c.code),
      });
      setCurrencyState({ config: data, code: resolved.code, source: resolved.source });
      if (resolved.source !== "manual" && resolved.source !== "account") write(STORED_KEY, resolved.code);
    };
    setCurrencyState({ config: data });
    void supabase.auth.getSession().then(({ data: s }) => {
      const pref = s.session?.user.user_metadata?.["preferred_currency"];
      apply(isCurrencyCode(pref) ? pref : null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
        const pref = session?.user.user_metadata?.["preferred_currency"];
        apply(isCurrencyCode(pref) ? pref : null);
      }
    });
    return () => { cancelled = true; sub.subscription.unsubscribe(); };
  }, [data]);

  // Formatters are plain functions; re-keying the subtree re-renders every price at once (no page reload).
  return <Fragment key={code}>{children}</Fragment>;
}
