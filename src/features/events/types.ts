export type EventStatus = "draft" | "published" | "cancelled" | "finished";

/**
 * Espejo literal de `ALLOWED_TRANSITIONS` en
 * `backend/app/services/event_service.py` (§2.4 del plan). La UI calcula
 * los botones de transición disponibles a partir de esta tabla en vez de
 * mostrar todos los botones y dejar que el 409 los filtre. Un estado es
 * terminal cuando su entrada está vacía (sin botones de edición/borrado
 * tampoco, según la máquina de estados documentada en el plan).
 */
export const EVENT_TRANSITIONS: Record<EventStatus, EventStatus[]> = {
  draft: ["published"],
  published: ["cancelled", "finished"],
  cancelled: [],
  finished: [],
};

export interface EventRead {
  id: number;
  organizer_id: number;
  status: EventStatus;
  name: string;
  description: string | null;
  location: string;
  start_date: string;
  end_date: string;
  capacity: number;
  created_at: string;
  updated_at: string;
}
