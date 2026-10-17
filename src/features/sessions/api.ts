import { http } from "@/lib/http";
import type { SessionRead } from "@/features/sessions/types";
import type { Paginated } from "@/types/api";

export interface SessionListParams {
  page?: number;
  page_size?: number;
}

/**
 * Fase 3 solo necesita la lectura paginada de sesiones de un evento
 * (GET /events/{event_id}/sessions). El resto de api.ts de sesiones
 * (crear/editar/borrar) se agrega en Fase 5.
 */
export async function listSessionsByEvent(
  eventId: number,
  params: SessionListParams = {},
): Promise<Paginated<SessionRead>> {
  const { data } = await http.get<Paginated<SessionRead>>(
    `/events/${eventId}/sessions`,
    { params: { page: params.page ?? 1, page_size: params.page_size ?? 10 } },
  );
  return data;
}
