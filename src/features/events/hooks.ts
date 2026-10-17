import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getEvent, listEvents } from "@/features/events/api";
import type { EventFilters } from "@/features/events/api";
import { eventKeys } from "@/features/events/keys";

// §4.1 del plan: los eventos cambian con cierta frecuencia (nuevas publicaciones).
const EVENTS_STALE_TIME = 30_000;

export function useEvents(filters: EventFilters) {
  return useQuery({
    queryKey: eventKeys.list(filters),
    queryFn: () => listEvents(filters),
    staleTime: EVENTS_STALE_TIME,
    // evita el parpadeo a skeleton al cambiar de página: mantiene la página
    // anterior visible mientras la siguiente se resuelve.
    placeholderData: keepPreviousData,
  });
}

export function useEvent(id: number) {
  return useQuery({
    queryKey: eventKeys.detail(id),
    queryFn: () => getEvent(id),
    staleTime: EVENTS_STALE_TIME,
    enabled: Number.isFinite(id),
  });
}
