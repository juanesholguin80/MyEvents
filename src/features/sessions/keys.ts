/**
 * Query key factory para sesiones (§4.1 del plan). `byEventAll` es el
 * prefijo común a todas las variantes de página de un evento dado — lo usan
 * las mutaciones de Fase 5 (crear/editar/borrar sesión) para invalidar
 * "todas las páginas de este evento" sin tener que enumerar cada
 * combinación de `page`/`pageSize` cacheada, mismo patrón que
 * `eventKeys.lists()`.
 */
export const sessionKeys = {
  all: ["sessions"] as const,
  byEventAll: (eventId: number) => [...sessionKeys.all, "byEvent", eventId] as const,
  byEvent: (eventId: number, page = 1, pageSize = 10) =>
    [...sessionKeys.byEventAll(eventId), page, pageSize] as const,
};
