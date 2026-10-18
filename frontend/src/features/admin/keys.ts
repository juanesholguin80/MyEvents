/**
 * Query key factory para la administración de usuarios (§4.1 del plan),
 * mismo patrón que `speakerKeys`/`eventKeys`: un prefijo `lists()` común a
 * todas las páginas cacheadas para poder invalidar "todo el listado" tras
 * una mutación sin enumerar cada página.
 */
export const adminUserKeys = {
  all: ["admin", "users"] as const,
  lists: () => [...adminUserKeys.all, "list"] as const,
  list: (page: number, pageSize: number) =>
    [...adminUserKeys.lists(), { page, pageSize }] as const,
  detail: (id: number) => [...adminUserKeys.all, "detail", id] as const,
};
