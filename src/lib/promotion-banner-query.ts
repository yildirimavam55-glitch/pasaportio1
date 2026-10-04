import { queryOptions } from "@tanstack/react-query";
import { getPromotionBanner } from "@/lib/promotions.functions";

/** Shared so the root loader can resolve the banner during SSR and the strip renders in the first frame. */
export const promotionBannerQuery = queryOptions({ queryKey: ["promotion-banner"], queryFn: () => getPromotionBanner(), staleTime: 60_000 });
