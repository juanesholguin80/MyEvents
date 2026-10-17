/**
 * Query key factory para sesiones (§4.1 del plan). Fase 3 solo necesita la
 * lectura paginada por evento; el resto del CRUD anidado llega en Fase 5.
 */
export const sessionKeys = {
  all: ["sessions"] as const,
  byEvent: (eventId: number, page = 1, pageSize = 10) =>
    [...sessionKeys.all, "byEvent", eventId, page, pageSize] as const,
};
