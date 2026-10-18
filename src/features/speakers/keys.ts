import type { SpeakerFilters } from "@/features/speakers/api";

/**
 * Query key factory para ponentes (§4.1 del plan), mismo patrón que
 * `eventKeys`: un prefijo `lists()` común a todas las variantes de filtro
 * para poder invalidar "todas las listas" tras una mutación sin enumerar
 * cada combinación cacheada.
 */
export const speakerKeys = {
  all: ["speakers"] as const,
  lists: () => [...speakerKeys.all, "list"] as const,
  list: (filters: SpeakerFilters) => [...speakerKeys.lists(), filters] as const,
  detail: (id: number) => [...speakerKeys.all, "detail", id] as const,
};
