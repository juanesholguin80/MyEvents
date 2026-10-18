import { http } from "@/lib/http";
import type { SessionRead } from "@/features/sessions/types";
import type { Paginated } from "@/types/api";

export interface SessionListParams {
  page?: number;
  page_size?: number;
}

export async function listSessionsByEvent(
  eventId: number,
  params: SessionListParams = {},
): Promise<Paginated<SessionRead>> {
  const { data } = await http.get<Paginated<SessionRead>>(
    `/events/${eventId}/sessions`,
    { params: { page: params.page ?? 1, page_size: params.page_size ?? 10 } },
  );
  return data;
}

// Espejo de `SessionCreate` (app/schemas/session.py, §2.4 del plan).
export interface SessionCreateInput {
  speaker_id: number;
  title: string;
  description?: string | null;
  start_time: string;
  end_time: string;
  capacity: number;
}

// Espejo de `SessionUpdate` (todos los campos opcionales, PUT parcial).
export type SessionUpdateInput = Partial<SessionCreateInput>;

export async function createSession(
  eventId: number,
  input: SessionCreateInput,
): Promise<SessionRead> {
  const { data } = await http.post<SessionRead>(`/events/${eventId}/sessions`, input);
  return data;
}

export async function updateSession(
  eventId: number,
  sessionId: number,
  input: SessionUpdateInput,
): Promise<SessionRead> {
  const { data } = await http.put<SessionRead>(
    `/events/${eventId}/sessions/${sessionId}`,
    input,
  );
  return data;
}

export async function deleteSession(eventId: number, sessionId: number): Promise<void> {
  await http.delete(`/events/${eventId}/sessions/${sessionId}`);
}
