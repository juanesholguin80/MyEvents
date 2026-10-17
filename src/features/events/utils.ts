import type { UserRead } from "@/features/auth/types";
import type { EventRead } from "@/features/events/types";

/**
 * Única implementación de la regla "dueño o admin" (§1 del plan: "Reglas de
 * arquitectura" exige una sola implementación reutilizable, nunca
 * reimplementada por archivo). La usan `EventDetailPage`/`EventActions`
 * (mostrar botones de gestión) y `EventFormPage` (guard de edición).
 */
export function isOwnerOrAdmin(user: UserRead | null, event: EventRead): boolean {
  if (!user) return false;
  return user.role === "admin" || user.id === event.organizer_id;
}
