import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cancelEvent,
  createEvent,
  deleteEvent,
  finishEvent,
  getEvent,
  listEvents,
  publishEvent,
  updateEvent,
} from "@/features/events/api";
import type { EventCreateInput, EventFilters, EventUpdateInput } from "@/features/events/api";
import { eventKeys } from "@/features/events/keys";
import type { EventRead } from "@/features/events/types";

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

// §4.1: crear/editar/borrar evento invalida todas las variantes de lista;
// editar/borrar además invalida el detalle puntual (ya tiene un id).
export function useCreateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: EventCreateInput) => createEvent(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
    },
  });
}

export function useUpdateEvent(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: EventUpdateInput) => updateEvent(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(id) });
    },
  });
}

export function useDeleteEvent(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => deleteEvent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(id) });
    },
  });
}

// §4.1: publicar/cancelar/finalizar invalida detalle + lista. Las tres
// transiciones comparten la misma forma de invalidación, factorizada aquí
// para no repetirla tres veces (js-combine-iterations en espíritu: una sola
// implementación en vez de tres copias casi idénticas).
function useEventTransition(id: number, transition: (id: number) => Promise<EventRead>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => transition(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
    },
  });
}

export function usePublishEvent(id: number) {
  return useEventTransition(id, publishEvent);
}

export function useCancelEvent(id: number) {
  return useEventTransition(id, cancelEvent);
}

export function useFinishEvent(id: number) {
  return useEventTransition(id, finishEvent);
}
