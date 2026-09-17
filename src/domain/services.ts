import type { ServiceType } from "./enums";

/**
 * Service registry — the modular multi-service backbone.
 * Adding a new service type = add a definition here + a detail model,
 * NOT a rewrite of the platform.
 */
export type ServiceDefinition = {
  type: ServiceType;
  slug: string;
  /** Build-time default; the DB `services` table is the runtime source of truth. */
  enabledByDefault: boolean;
  customerVisibleByDefault: boolean;
  /** Table holding the service-specific detail model. */
  detailTable: string | null;
  routePath: string | null;
  sortOrder: number;
};

export const SERVICE_DEFINITIONS: Record<ServiceType, ServiceDefinition> = {
  ESIM: {
    type: "ESIM",
    slug: "esim",
    enabledByDefault: true,
    customerVisibleByDefault: true,
    detailTable: "esim_product_details",
    routePath: "/esim",
    sortOrder: 1,
  },
  LOUNGE: {
    type: "LOUNGE",
    slug: "lounge",
    enabledByDefault: true,
    customerVisibleByDefault: true,
    detailTable: "lounge_product_details",
    routePath: "/lounge",
    sortOrder: 2,
  },
  CAR_RENTAL: {
    type: "CAR_RENTAL",
    slug: "car-rental",
    enabledByDefault: false,
    customerVisibleByDefault: false,
    detailTable: null,
    routePath: null,
    sortOrder: 3,
  },
  TRANSFER: {
    type: "TRANSFER",
    slug: "transfer",
    enabledByDefault: false,
    customerVisibleByDefault: false,
    detailTable: null,
    routePath: null,
    sortOrder: 4,
  },
};

export type ServiceRuntimeConfig = {
  service_type: ServiceType;
  slug: string;
  enabled: boolean;
  customer_visible: boolean;
  sort_order: number;
};

export function visibleServices(config: ServiceRuntimeConfig[]): ServiceRuntimeConfig[] {
  return config
    .filter((s) => s.enabled && s.customer_visible)
    .sort((a, b) => a.sort_order - b.sort_order);
}

/** Common product layer — service agnostic. Detail models stay separate. */
export type CatalogueProduct = {
  id: string;
  serviceType: ServiceType;
  slug: string;
  name: string;
  currency: string;
  salePrice: number | null;
  featured: boolean;
  badge: string | null;
  sortOrder: number;
};
