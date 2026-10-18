import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createSpeaker,
  deleteSpeaker,
  getSpeaker,
  listSpeakers,
  updateSpeaker,
} from "@/features/speakers/api";
import type {
  SpeakerCreateInput,
  SpeakerFilters,
  SpeakerUpdateInput,
} from "@/features/speakers/api";
import { speakerKeys } from "@/features/speakers/keys";

// §4.1 del plan: catálogo que cambia poco.
const SPEAKERS_STALE_TIME = 5 * 60_000;

interface UseSpeakersOptions {
  // Permite a páginas públicas (EventDetailPage) evitar disparar la query
  // cuando no hay sesión: GET /speakers exige autenticación (§2.4), a
  // diferencia de GET /events.
  enabled?: boolean;
}

export function useSpeakers(filters: SpeakerFilters = {}, options: UseSpeakersOptions = {}) {
  return useQuery({
    queryKey: speakerKeys.list(filters),
    queryFn: () => listSpeakers(filters),
    staleTime: SPEAKERS_STALE_TIME,
    enabled: options.enabled ?? true,
  });
}

export function useSpeaker(id: number) {
  return useQuery({
    queryKey: speakerKeys.detail(id),
    queryFn: () => getSpeaker(id),
    staleTime: SPEAKERS_STALE_TIME,
    enabled: Number.isFinite(id),
  });
}

// §4.1: crear/editar/borrar ponente invalida `speakerKeys.list` en
// `onSuccess` únicamente. En `onError` (p. ej. 409 SPEAKER_IN_USE al
// borrar) no se invalida nada — el listado cacheado sigue siendo válido,
// el llamador solo muestra el toast de error con normalizeApiError.
export function useCreateSpeaker() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SpeakerCreateInput) => createSpeaker(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: speakerKeys.lists() });
    },
  });
}

export function useUpdateSpeaker(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SpeakerUpdateInput) => updateSpeaker(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: speakerKeys.lists() });
      queryClient.invalidateQueries({ queryKey: speakerKeys.detail(id) });
    },
  });
}

// Sin id baked-in (a diferencia de useDeleteEvent): no hay una página de
// detalle de ponente desde la que este hook se instancie una sola vez para
// un id fijo, así que el id viaja en `mutate(id)`.
export function useDeleteSpeaker() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteSpeaker(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: speakerKeys.lists() });
    },
  });
}
