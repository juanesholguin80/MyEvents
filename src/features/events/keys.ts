import type { EventFilters } from "@/features/events/api";

/**
 * Query key factory para eventos (§4.1 del plan). Nunca se escriben arrays de
 * keys a mano fuera de aquí, para evitar invalidaciones que fallan por typo.
 */
export const eventKeys = {
  all: ["events"] as const,
  list: (filters: EventFilters) => [...eventKeys.all, "list", filters] as const,
  detail: (id: number) => [...eventKeys.all, "detail", id] as const,
};
