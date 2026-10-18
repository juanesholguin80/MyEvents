import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createSession,
  deleteSession,
  listSessionsByEvent,
  updateSession,
} from "@/features/sessions/api";
import type { SessionCreateInput, SessionUpdateInput } from "@/features/sessions/api";
import { sessionKeys } from "@/features/sessions/keys";

const SESSIONS_STALE_TIME = 30_000;

export function useSessionsByEvent(eventId: number, page = 1, pageSize = 10) {
  return useQuery({
    queryKey: sessionKeys.byEvent(eventId, page, pageSize),
    queryFn: () => listSessionsByEvent(eventId, { page, page_size: pageSize }),
    enabled: Number.isFinite(eventId),
    staleTime: SESSIONS_STALE_TIME,
  });
}

// §4.1 del plan: crear/editar/borrar sesión invalida `sessionKeys.byEvent`
// — en concreto todas las páginas cacheadas del evento (`byEventAll`), no
// solo la variante de página actual.
export function useCreateSession(eventId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SessionCreateInput) => createSession(eventId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.byEventAll(eventId) });
    },
  });
}

export function useUpdateSession(eventId: number, sessionId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SessionUpdateInput) => updateSession(eventId, sessionId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.byEventAll(eventId) });
    },
  });
}

export function useDeleteSession(eventId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: number) => deleteSession(eventId, sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.byEventAll(eventId) });
    },
  });
}
