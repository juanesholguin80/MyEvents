/**
 * Query key factory para registros de asistentes (§4.1 del plan), mismo
 * patrón que `eventKeys`/`speakerKeys`: un prefijo `myLists()` común a toda
 * variante de `page`/`pageSize` para poder invalidar "todas las variantes
 * cacheadas de mis registros" tras registrarse/cancelar sin enumerar cada
 * combinación de paginación guardada en caché.
 *
 * `my(page, pageSize)` incluye `pageSize` en la key (a diferencia de la
 * firma `registrationKeys.my(page)` del plan §4.1) porque este módulo
 * consume `GET /me/registrations` con dos tamaños de página distintos en
 * simultáneo: `ProfilePage` pagina con un tamaño pequeño (10), mientras
 * `EventRegistrationAction` pide una página grande (100) para descubrir si
 * el usuario ya está registrado al evento que está viendo (ver §8 del
 * plan). Sin `pageSize` en la key, ambos consumidores colisionarían en la
 * misma entrada de caché para `page = 1` y uno pisaría los datos del otro.
 */
export const registrationKeys = {
  all: ["registrations"] as const,
  myLists: () => [...registrationKeys.all, "my"] as const,
  my: (page: number, pageSize: number) => [...registrationKeys.myLists(), page, pageSize] as const,
};
