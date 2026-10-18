import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cancelRegistration, listMyRegistrations, registerToEvent } from "@/features/registrations/api";
import { registrationKeys } from "@/features/registrations/keys";
import { useAuthStore } from "@/features/auth/store";
import { eventKeys } from "@/features/events/keys";

// §4.1 del plan: igual que `GET /me` (useCurrentUser), `GET /me/registrations`
// se mantiene siempre fresco tras login/mutaciones propias (staleTime 0) sin
// sorprender al usuario a media edición (refetchOnWindowFocus false).
const MY_REGISTRATIONS_STALE_TIME = 0;

interface UseMyRegistrationsOptions {
  // Permite a `EventRegistrationAction` evitar la consulta cuando el evento
  // ni siquiera está publicado (no hay nada que registrar/cancelar) o
  // cuando no hay sesión — mismo patrón que `UseSpeakersOptions.enabled`.
  enabled?: boolean;
}

export function useMyRegistrations(
  page: number,
  pageSize = 10,
  options: UseMyRegistrationsOptions = {},
) {
  const accessToken = useAuthStore((s) => s.accessToken);

  return useQuery({
    queryKey: registrationKeys.my(page, pageSize),
    queryFn: () => listMyRegistrations(page, pageSize),
    enabled: (options.enabled ?? true) && Boolean(accessToken),
    staleTime: MY_REGISTRATIONS_STALE_TIME,
    refetchOnWindowFocus: false,
  });
}

// §4.1: registrarse invalida `registrationKeys.my` (todas las variantes de
// página/tamaño, vía `myLists()`) + `eventKeys.detail(eventId)` porque el
// cupo visible puede cambiar. El id del evento es fijo para este hook
// (siempre se instancia desde `EventRegistrationAction`, para el único
// evento que esa página está mostrando) — mismo patrón que
// `useCancelEvent(id)`/`usePublishEvent(id)` en `features/events/hooks.ts`.
export function useRegisterToEvent(eventId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => registerToEvent(eventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: registrationKeys.myLists() });
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(eventId) });
    },
  });
}

// Sin id baked-in al instanciar el hook (mismo motivo que
// `useDeleteSpeaker()` en `features/speakers/hooks.ts`): a diferencia de
// `useRegisterToEvent`, este hook lo consumen tanto `EventRegistrationAction`
// (un único evento fijo) como `ProfilePage` (N filas de `GET
// /me/registrations`, cada una con su propio `event.id`) — no hay un único
// id para fijar al montar el componente, así que viaja como argumento de
// `mutate(eventId)`.
export function useCancelRegistration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (eventId: number) => cancelRegistration(eventId),
    onSuccess: (_data, eventId) => {
      queryClient.invalidateQueries({ queryKey: registrationKeys.myLists() });
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(eventId) });
    },
  });
}
