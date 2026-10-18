import type { EventFilters } from "@/features/events/api";

/**
 * Query key factory para eventos (§4.1 del plan). Nunca se escriben arrays de
 * keys a mano fuera de aquí, para evitar invalidaciones que fallan por typo.
 */
export const eventKeys = {
  all: ["events"] as const,
  // Prefijo común a todas las variantes de filtro, usado para invalidar
  // "todas las listas" tras una mutación (§4.1) sin tener que enumerar cada
  // combinación de filtros guardada en caché.
  lists: () => [...eventKeys.all, "list"] as const,
  list: (filters: EventFilters) => [...eventKeys.lists(), filters] as const,
  detail: (id: number) => [...eventKeys.all, "detail", id] as const,
};
