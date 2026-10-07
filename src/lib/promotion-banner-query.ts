import { queryOptions } from "@tanstack/react-query";
import { getPromotionBanner } from "@/lib/promotions.functions";

/** Shared so the root loader can resolve the banner during SSR and the strip renders in the first frame. */
export const promotionBannerQuery = queryOptions({ queryKey: ["promotion-banner"], queryFn: () => getPromotionBanner(), staleTime: 0, refetchInterval: 15_000, refetchOnWindowFocus: true });

/** Same-origin tabs refresh immediately after an Admin save; polling also reaches separate devices. */
export const PROMOTION_CHANGE_KEY = "pasaport.promotion.updated";
export function notifyPromotionChanged() {
  try { localStorage.setItem(PROMOTION_CHANGE_KEY, String(Date.now())); } catch { /* private browsing */ }
  window.dispatchEvent(new Event(PROMOTION_CHANGE_KEY));
}
