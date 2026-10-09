import { createContext, useContext } from "react";

export type CommercePanel = "cart" | "coupon" | null;
export const CommercePanels = createContext<{ panel: CommercePanel; setPanel: (panel: CommercePanel) => void }>({ panel: null, setPanel: () => {} });
export const useCommercePanels = () => useContext(CommercePanels);