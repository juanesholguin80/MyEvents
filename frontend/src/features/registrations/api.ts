import { http } from "@/lib/http";
import type {
  RegistrationRead,
  RegistrationWithEventRead,
} from "@/features/registrations/types";
import type { Paginated } from "@/types/api";

// §2.4 del plan: ninguno de los tres endpoints lleva body — el usuario ya
// viene resuelto del token de autenticación, el backend nunca necesita que
// el cliente le diga a qué usuario registrar/cancelar.
export async function registerToEvent(eventId: number): Promise<RegistrationRead> {
  const { data } = await http.post<RegistrationRead>(`/events/${eventId}/register`);
  return data;
}

export async function cancelRegistration(eventId: number): Promise<void> {
  await http.delete(`/events/${eventId}/register`);
}

export async function listMyRegistrations(
  page = 1,
  pageSize = 10,
): Promise<Paginated<RegistrationWithEventRead>> {
  const { data } = await http.get<Paginated<RegistrationWithEventRead>>("/me/registrations", {
    params: { page, page_size: pageSize },
  });
  return data;
}
