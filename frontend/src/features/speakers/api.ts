import { http } from "@/lib/http";
import type { SpeakerRead } from "@/features/speakers/types";
import type { Paginated } from "@/types/api";

export interface SpeakerFilters {
  name?: string;
  page?: number;
  page_size?: number;
}

// §2.4 del plan: GET /speakers requiere autenticación (cualquier rol), a
// diferencia de GET /events que es público. El 401 sin token lo maneja el
// interceptor de lib/http.ts como cualquier otra request autenticada.
export async function listSpeakers(filters: SpeakerFilters = {}): Promise<Paginated<SpeakerRead>> {
  const { data } = await http.get<Paginated<SpeakerRead>>("/speakers", {
    params: {
      name: filters.name || undefined,
      page: filters.page ?? 1,
      page_size: filters.page_size ?? 10,
    },
  });
  return data;
}

export async function getSpeaker(id: number): Promise<SpeakerRead> {
  const { data } = await http.get<SpeakerRead>(`/speakers/${id}`);
  return data;
}

// Espejo de `SpeakerCreate`.
export interface SpeakerCreateInput {
  full_name: string;
  bio?: string | null;
  email: string;
}

// Espejo de `SpeakerUpdate` (todos los campos opcionales, PUT parcial).
export type SpeakerUpdateInput = Partial<SpeakerCreateInput>;

export async function createSpeaker(input: SpeakerCreateInput): Promise<SpeakerRead> {
  const { data } = await http.post<SpeakerRead>("/speakers", input);
  return data;
}

export async function updateSpeaker(
  id: number,
  input: SpeakerUpdateInput,
): Promise<SpeakerRead> {
  const { data } = await http.put<SpeakerRead>(`/speakers/${id}`, input);
  return data;
}

// §2.4: DELETE /speakers/{id} es admin-only (ni el organizador puede), y
// devuelve 409 SPEAKER_IN_USE si el ponente tiene sesiones asociadas. Ambas
// reglas las aplica el backend; aquí solo se expone la llamada.
export async function deleteSpeaker(id: number): Promise<void> {
  await http.delete(`/speakers/${id}`);
}
