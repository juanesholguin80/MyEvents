import { http } from "@/lib/http";
import type { EventRead, EventStatus } from "@/features/events/types";
import type { Paginated } from "@/types/api";

export interface EventFilters {
  name?: string;
  status?: EventStatus;
  date_from?: string;
  date_to?: string;
  page?: number;
  page_size?: number;
}

export async function listEvents(filters: EventFilters = {}): Promise<Paginated<EventRead>> {
  const { data } = await http.get<Paginated<EventRead>>("/events", {
    params: {
      name: filters.name || undefined,
      status: filters.status,
      date_from: filters.date_from || undefined,
      date_to: filters.date_to || undefined,
      page: filters.page ?? 1,
      page_size: filters.page_size ?? 10,
    },
  });
  return data;
}

export async function getEvent(id: number): Promise<EventRead> {
  const { data } = await http.get<EventRead>(`/events/${id}`);
  return data;
}

// Espejo de `EventCreate` (app/schemas/event.py): el cliente nunca envía
// `status`/`organizer_id`, el backend los decide siempre.
export interface EventCreateInput {
  name: string;
  description?: string | null;
  location: string;
  start_date: string;
  end_date: string;
  capacity: number;
}

// Espejo de `EventUpdate`: todos los campos opcionales (PUT parcial).
export type EventUpdateInput = Partial<EventCreateInput>;

export async function createEvent(input: EventCreateInput): Promise<EventRead> {
  const { data } = await http.post<EventRead>("/events", input);
  return data;
}

export async function updateEvent(
  id: number,
  input: EventUpdateInput,
): Promise<EventRead> {
  const { data } = await http.put<EventRead>(`/events/${id}`, input);
  return data;
}

export async function deleteEvent(id: number): Promise<void> {
  await http.delete(`/events/${id}`);
}

export async function publishEvent(id: number): Promise<EventRead> {
  const { data } = await http.patch<EventRead>(`/events/${id}/publish`);
  return data;
}

export async function cancelEvent(id: number): Promise<EventRead> {
  const { data } = await http.patch<EventRead>(`/events/${id}/cancel`);
  return data;
}

export async function finishEvent(id: number): Promise<EventRead> {
  const { data } = await http.patch<EventRead>(`/events/${id}/finish`);
  return data;
}
