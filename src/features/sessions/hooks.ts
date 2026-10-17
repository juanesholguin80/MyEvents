import { useQuery } from "@tanstack/react-query";
import { listSessionsByEvent } from "@/features/sessions/api";
import { sessionKeys } from "@/features/sessions/keys";

const SESSIONS_STALE_TIME = 30_000;

/**
 * Hook mínimo de Fase 3: solo lectura paginada de sesiones de un evento.
 * El resto de hooks de sesiones (crear/editar/borrar) se agrega en Fase 5.
 */
export function useSessionsByEvent(eventId: number, page = 1, pageSize = 10) {
  return useQuery({
    queryKey: sessionKeys.byEvent(eventId, page, pageSize),
    queryFn: () => listSessionsByEvent(eventId, { page, page_size: pageSize }),
    enabled: Number.isFinite(eventId),
    staleTime: SESSIONS_STALE_TIME,
  });
}
