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
