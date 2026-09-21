import { useCallback, useEffect, useState } from "react";
import { QuickSearch } from "./QuickSearch";
import type { ServiceSlug } from "@/content/travel-content";

/**
 * Compact search that pins itself directly under the sticky header once the
 * customer scrolls past the hero. It renders the very same QuickSearch field,
 * country/airport data and routing as the hero search — there is no second
 * search system. The zero-height sticky wrapper keeps the bar out of the
 * layout flow, so showing it never shifts the page content.
 */
export function StickyQuickSearch({ service }: { service: ServiceSlug }) {
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  // While the list is open the bar must stay put, even though locking the page
  // clamps its scroll offset back toward the top.
  const visible = scrolled || searchOpen;
  const onSearchModeChange = useCallback((active: boolean) => setSearchOpen(active), []);

  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        // Some shells scroll on <body> instead of the window, so read both.
        const y =
          window.scrollY ||
          document.scrollingElement?.scrollTop ||
          document.body?.scrollTop ||
          0;
        // Hysteresis so the bar cannot flicker around the threshold.
        setScrolled((current) => (current ? y > 90 : y > 140));
      });
    };
    onScroll();
    // Capture: scroll events fired on <body> never bubble to window otherwise.
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll, { capture: true });
    };
  }, []);

  return (
    <div
      className={`sticky-quick-search sticky top-14 h-0 sm:top-16 ${visible ? "" : "pointer-events-none"}`}
      data-open={searchOpen || undefined}
      data-visible={visible || undefined}
    >
      <div
        aria-hidden={!visible}
        className={`mx-auto max-w-site px-3 pt-1.5 transition-[opacity,transform] duration-300 ease-out sm:px-6 ${
          visible ? "translate-y-0 opacity-100" : "invisible -translate-y-2 opacity-0"
        }`}
      >
        <div className="mx-auto max-w-finder">
          <QuickSearch
            service={service}
            onAirportSelect={() => {}}
            onSearchModeChange={onSearchModeChange}
            embedded
            compact
            lockScroll
            portalResults
          />
        </div>
      </div>
    </div>
  );
}
