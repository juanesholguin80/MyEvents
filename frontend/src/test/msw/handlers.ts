import { http, HttpResponse } from "msw";
import type { Role, TokenPair, UserRead } from "@/features/auth/types";
import type { EventRead, EventStatus } from "@/features/events/types";
import type {
  RegistrationRead,
  RegistrationWithEventRead,
} from "@/features/registrations/types";
import type { SessionRead } from "@/features/sessions/types";
import type { SpeakerRead } from "@/features/speakers/types";
import type { ApiError, Paginated } from "@/types/api";

interface SeedUser extends UserRead {
  password: string;
}

function createSeedData() {
  const users: SeedUser[] = [
    {
      id: 1,
      email: "admin@example.com",
      full_name: "Admin Principal",
      role: "admin",
      is_active: true,
      password: "AdminPass123",
    },
    {
      id: 2,
      email: "organizador@example.com",
      full_name: "Organizador Uno",
      role: "organizador",
      is_active: true,
      password: "OrgPass123",
    },
    {
      id: 3,
      email: "asistente@example.com",
      full_name: "Asistente Uno",
      role: "asistente",
      is_active: true,
      password: "AsisPass123",
    },
    {
      id: 4,
      email: "asistente2@example.com",
      full_name: "Asistente Dos",
      role: "asistente",
      is_active: true,
      password: "AsisPass123",
    },
  ];

  const events: EventRead[] = [
    {
      id: 1,
      organizer_id: 2,
      status: "published",
      name: "Conferencia de Tecnología",
      description: "Charlas sobre el estado del arte en IA.",
      location: "Bogotá, Colombia",
      start_date: "2026-11-01T09:00:00Z",
      end_date: "2026-11-01T18:00:00Z",
      capacity: 2,
      created_at: "2026-09-01T00:00:00Z",
      updated_at: "2026-09-01T00:00:00Z",
    },
    {
      id: 2,
      organizer_id: 2,
      status: "draft",
      name: "Taller Privado",
      description: null,
      location: "Medellín, Colombia",
      start_date: "2026-12-01T09:00:00Z",
      end_date: "2026-12-01T12:00:00Z",
      capacity: 20,
      created_at: "2026-09-02T00:00:00Z",
      updated_at: "2026-09-02T00:00:00Z",
    },
    {
      id: 3,
      organizer_id: 2,
      status: "cancelled",
      name: "Evento Cancelado",
      description: null,
      location: "Cali, Colombia",
      start_date: "2026-08-01T09:00:00Z",
      end_date: "2026-08-01T12:00:00Z",
      capacity: 30,
      created_at: "2026-07-01T00:00:00Z",
      updated_at: "2026-07-15T00:00:00Z",
    },
    {
      id: 4,
      organizer_id: 2,
      status: "finished",
      name: "Evento Finalizado",
      description: null,
      location: "Barranquilla, Colombia",
      start_date: "2026-06-01T09:00:00Z",
      end_date: "2026-06-01T12:00:00Z",
      capacity: 40,
      created_at: "2026-05-01T00:00:00Z",
      updated_at: "2026-06-02T00:00:00Z",
    },
  ];

  const speakers: SpeakerRead[] = [
    {
      id: 1,
      full_name: "Ana Pérez",
      bio: "Experta en inteligencia artificial.",
      email: "ana@example.com",
    },
  ];

  const sessions: SessionRead[] = [
    {
      id: 1,
      speaker_id: 1,
      event_id: 1,
      title: "Charla de apertura",
      description: null,
      start_time: "2026-11-01T09:30:00Z",
      end_time: "2026-11-01T10:30:00Z",
      capacity: 2,
    },
  ];

  const registrations: RegistrationRead[] = [];

  return { users, events, speakers, sessions, registrations };
}

let db = createSeedData();
let nextUserId = 5;
let nextEventId = 5;
let nextSpeakerId = 2;
let nextSessionId = 2;
let nextRegistrationId = 1;

export function resetDb() {
  db = createSeedData();
  nextUserId = 5;
  nextEventId = 5;
  nextSpeakerId = 2;
  nextSessionId = 2;
  nextRegistrationId = 1;
}

function apiError(detail: string, code: string, fields: ApiError["fields"] = null) {
  return { detail, code, fields } satisfies ApiError;
}

function errorResponse(
  status: number,
  detail: string,
  code: string,
  fields: ApiError["fields"] = null,
) {
  return HttpResponse.json(apiError(detail, code, fields), { status });
}

function toUserRead(user: SeedUser): UserRead {
  const { password, ...userRead } = user;
  return userRead;
}

function getAuthUser(request: Request): UserRead | null {
  const header = request.headers.get("Authorization");
  const match = header?.match(/^Bearer access-(\d+)$/);
  if (!match) return null;
  const user = db.users.find((u) => u.id === Number(match[1]));
  return user ? toUserRead(user) : null;
}

function parsePaging(searchParams: URLSearchParams) {
  const page = Number(searchParams.get("page") ?? "1");
  const page_size = Number(searchParams.get("page_size") ?? "10");
  return { page, page_size };
}

function paginate<T>(items: T[], page: number, page_size: number): Paginated<T> {
  const start = (page - 1) * page_size;
  return {
    items: items.slice(start, start + page_size),
    total: items.length,
    page,
    page_size,
  };
}

function isEventVisibleTo(event: EventRead, user: UserRead | null): boolean {
  if (event.status !== "draft") return true;
  if (!user) return false;
  return user.role === "admin" || user.id === event.organizer_id;
}

function isOwnerOrAdmin(user: UserRead | null, organizerId: number): boolean {
  if (!user) return false;
  return user.role === "admin" || user.id === organizerId;
}

const TERMINAL_STATUSES: EventStatus[] = ["cancelled", "finished"];

function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export const handlers = [
  http.get("/health", () => HttpResponse.json({ status: "ok" })),

  http.post("/api/v1/auth/register", async ({ request }) => {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
      full_name?: string;
    };
    if (!body.password) {
      return errorResponse(422, "La contraseña es obligatoria.", "VALIDATION_ERROR", {
        password: "La contraseña es obligatoria.",
      });
    }
    if (db.users.some((u) => u.email === body.email)) {
      return errorResponse(
        409,
        "Ya existe una cuenta con ese correo.",
        "EMAIL_ALREADY_EXISTS",
      );
    }
    const user: SeedUser = {
      id: nextUserId++,
      email: body.email ?? "",
      full_name: body.full_name ?? "",
      role: "asistente",
      is_active: true,
      password: body.password,
    };
    db.users.push(user);
    return HttpResponse.json(toUserRead(user), { status: 201 });
  }),

  http.post("/api/v1/auth/login", async ({ request }) => {
    const body = (await request.json()) as { email?: string; password?: string };
    const user = db.users.find(
      (u) => u.email === body.email && u.password === body.password && u.is_active,
    );
    if (!user) {
      return errorResponse(
        401,
        "Correo o contraseña incorrectos.",
        "INVALID_CREDENTIALS",
      );
    }
    const tokens: TokenPair = {
      access_token: `access-${user.id}`,
      refresh_token: `refresh-${user.id}`,
    };
    return HttpResponse.json(tokens);
  }),

  http.post("/api/v1/auth/refresh", async ({ request }) => {
    const body = (await request.json()) as { refresh_token?: string };
    const match = body.refresh_token?.match(/^refresh-(\d+)$/);
    const user = match ? db.users.find((u) => u.id === Number(match[1])) : undefined;
    if (!user) {
      return errorResponse(401, "Token inválido.", "INVALID_TOKEN");
    }
    return HttpResponse.json({ access_token: `access-${user.id}` });
  }),

  http.get("/api/v1/me", ({ request }) => {
    const user = getAuthUser(request);
    if (!user) return errorResponse(401, "No autenticado.", "INVALID_TOKEN");
    return HttpResponse.json(user);
  }),

  http.get("/api/v1/admin/users", ({ request }) => {
    const user = getAuthUser(request);
    if (!user || user.role !== "admin") {
      return errorResponse(403, "Rol insuficiente.", "INSUFFICIENT_ROLE");
    }
    const { page, page_size } = parsePaging(new URL(request.url).searchParams);
    return HttpResponse.json(paginate(db.users.map(toUserRead), page, page_size));
  }),

  http.get("/api/v1/admin/users/:id", ({ request, params }) => {
    const user = getAuthUser(request);
    if (!user || user.role !== "admin") {
      return errorResponse(403, "Rol insuficiente.", "INSUFFICIENT_ROLE");
    }
    const target = db.users.find((u) => u.id === Number(params.id));
    if (!target) return errorResponse(404, "Usuario no encontrado.", "USER_NOT_FOUND");
    return HttpResponse.json(toUserRead(target));
  }),

  http.patch("/api/v1/admin/users/:id", async ({ request, params }) => {
    const user = getAuthUser(request);
    if (!user || user.role !== "admin") {
      return errorResponse(403, "Rol insuficiente.", "INSUFFICIENT_ROLE");
    }
    const targetId = Number(params.id);
    if (targetId === user.id) {
      return errorResponse(
        403,
        "No puedes modificar tu propia cuenta.",
        "CANNOT_MODIFY_SELF",
      );
    }
    const target = db.users.find((u) => u.id === targetId);
    if (!target) return errorResponse(404, "Usuario no encontrado.", "USER_NOT_FOUND");
    const body = (await request.json()) as { role?: Role; is_active?: boolean };
    if (body.role !== undefined) target.role = body.role;
    if (body.is_active !== undefined) target.is_active = body.is_active;
    return HttpResponse.json(toUserRead(target));
  }),

  http.get("/api/v1/events", ({ request }) => {
    const authUser = getAuthUser(request);
    const params = new URL(request.url).searchParams;
    const name = params.get("name");
    const status = params.get("status") as EventStatus | null;
    const dateFrom = params.get("date_from");
    const dateTo = params.get("date_to");

    let visible = db.events.filter((e) => isEventVisibleTo(e, authUser));
    if (status) visible = visible.filter((e) => e.status === status);
    if (name) {
      const needle = name.toLowerCase();
      visible = visible.filter((e) => e.name.toLowerCase().includes(needle));
    }
    if (dateFrom) visible = visible.filter((e) => e.start_date >= dateFrom);
    if (dateTo) visible = visible.filter((e) => e.start_date <= dateTo);

    const { page, page_size } = parsePaging(params);
    return HttpResponse.json(paginate(visible, page, page_size));
  }),

  http.post("/api/v1/events", async ({ request }) => {
    const user = getAuthUser(request);
    if (!user || (user.role !== "organizador" && user.role !== "admin")) {
      return errorResponse(403, "Rol insuficiente.", "INSUFFICIENT_ROLE");
    }
    const body = (await request.json()) as {
      name?: string;
      description?: string | null;
      location?: string;
      start_date?: string;
      end_date?: string;
      capacity?: number;
    };
    const fields: Record<string, string> = {};
    if (!body.name) fields.name = "El nombre es obligatorio.";
    if (!body.location) fields.location = "La ubicación es obligatoria.";
    if (!body.capacity || body.capacity <= 0) {
      fields.capacity = "Debe ser mayor a 0.";
    }
    if (
      body.start_date &&
      body.end_date &&
      new Date(body.end_date) <= new Date(body.start_date)
    ) {
      fields.end_date = "La fecha fin no puede ser menor o igual a la fecha de inicio.";
    }
    if (Object.keys(fields).length > 0) {
      return errorResponse(422, "Datos inválidos.", "VALIDATION_ERROR", fields);
    }
    const now = new Date().toISOString();
    const event: EventRead = {
      id: nextEventId++,
      organizer_id: user.id,
      status: "draft",
      name: body.name!,
      description: body.description ?? null,
      location: body.location!,
      start_date: body.start_date!,
      end_date: body.end_date!,
      capacity: body.capacity!,
      created_at: now,
      updated_at: now,
    };
    db.events.push(event);
    return HttpResponse.json(event, { status: 201 });
  }),

  http.get("/api/v1/events/:id", ({ request, params }) => {
    const authUser = getAuthUser(request);
    const event = db.events.find((e) => e.id === Number(params.id));
    if (!event || !isEventVisibleTo(event, authUser)) {
      return errorResponse(404, "Evento no encontrado.", "EVENT_NOT_FOUND");
    }
    return HttpResponse.json(event);
  }),

  http.put("/api/v1/events/:id", async ({ request, params }) => {
    const user = getAuthUser(request);
    const event = db.events.find((e) => e.id === Number(params.id));
    if (!event) return errorResponse(404, "Evento no encontrado.", "EVENT_NOT_FOUND");
    if (!isOwnerOrAdmin(user, event.organizer_id)) {
      return errorResponse(403, "No tienes permisos sobre este evento.", "EVENT_FORBIDDEN");
    }
    if (TERMINAL_STATUSES.includes(event.status)) {
      return errorResponse(
        409,
        "El evento no se puede modificar en su estado actual.",
        "INVALID_EVENT_STATE",
      );
    }
    const body = (await request.json()) as Partial<
      Pick<
        EventRead,
        "name" | "description" | "location" | "start_date" | "end_date" | "capacity"
      >
    >;
    const nextStart = body.start_date ?? event.start_date;
    const nextEnd = body.end_date ?? event.end_date;
    if (new Date(nextEnd) <= new Date(nextStart)) {
      return errorResponse(
        422,
        "La fecha fin no puede ser menor o igual a la fecha de inicio.",
        "INVALID_EVENT_DATA",
        { end_date: "La fecha fin no puede ser menor o igual a la fecha de inicio." },
      );
    }
    Object.assign(event, body, { updated_at: new Date().toISOString() });
    return HttpResponse.json(event);
  }),

  http.delete("/api/v1/events/:id", ({ request, params }) => {
    const user = getAuthUser(request);
    const index = db.events.findIndex((e) => e.id === Number(params.id));
    if (index === -1) {
      return errorResponse(404, "Evento no encontrado.", "EVENT_NOT_FOUND");
    }
    const event = db.events[index];
    if (!isOwnerOrAdmin(user, event.organizer_id)) {
      return errorResponse(403, "No tienes permisos sobre este evento.", "EVENT_FORBIDDEN");
    }
    if (TERMINAL_STATUSES.includes(event.status)) {
      return errorResponse(
        409,
        "El evento no se puede modificar en su estado actual.",
        "INVALID_EVENT_STATE",
      );
    }
    db.events.splice(index, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  http.patch("/api/v1/events/:id/publish", ({ request, params }) => {
    const user = getAuthUser(request);
    const event = db.events.find((e) => e.id === Number(params.id));
    if (!event) return errorResponse(404, "Evento no encontrado.", "EVENT_NOT_FOUND");
    if (!isOwnerOrAdmin(user, event.organizer_id)) {
      return errorResponse(403, "No tienes permisos sobre este evento.", "EVENT_FORBIDDEN");
    }
    if (event.status !== "draft") {
      return errorResponse(
        409,
        "Solo un evento en borrador se puede publicar.",
        "INVALID_EVENT_STATE",
      );
    }
    event.status = "published";
    event.updated_at = new Date().toISOString();
    return HttpResponse.json(event);
  }),

  http.patch("/api/v1/events/:id/cancel", ({ request, params }) => {
    const user = getAuthUser(request);
    const event = db.events.find((e) => e.id === Number(params.id));
    if (!event) return errorResponse(404, "Evento no encontrado.", "EVENT_NOT_FOUND");
    if (!isOwnerOrAdmin(user, event.organizer_id)) {
      return errorResponse(403, "No tienes permisos sobre este evento.", "EVENT_FORBIDDEN");
    }
    if (event.status !== "published") {
      return errorResponse(
        409,
        "Solo un evento publicado se puede cancelar.",
        "INVALID_EVENT_STATE",
      );
    }
    event.status = "cancelled";
    event.updated_at = new Date().toISOString();
    return HttpResponse.json(event);
  }),

  http.patch("/api/v1/events/:id/finish", ({ request, params }) => {
    const user = getAuthUser(request);
    const event = db.events.find((e) => e.id === Number(params.id));
    if (!event) return errorResponse(404, "Evento no encontrado.", "EVENT_NOT_FOUND");
    if (!isOwnerOrAdmin(user, event.organizer_id)) {
      return errorResponse(403, "No tienes permisos sobre este evento.", "EVENT_FORBIDDEN");
    }
    if (event.status !== "published") {
      return errorResponse(
        409,
        "Solo un evento publicado se puede finalizar.",
        "INVALID_EVENT_STATE",
      );
    }
    event.status = "finished";
    event.updated_at = new Date().toISOString();
    return HttpResponse.json(event);
  }),

  http.post("/api/v1/speakers", async ({ request }) => {
    const user = getAuthUser(request);
    if (!user || (user.role !== "organizador" && user.role !== "admin")) {
      return errorResponse(403, "Rol insuficiente.", "INSUFFICIENT_ROLE");
    }
    const body = (await request.json()) as {
      full_name?: string;
      bio?: string | null;
      email?: string;
    };
    const fields: Record<string, string> = {};
    if (!body.full_name) fields.full_name = "El nombre es obligatorio.";
    if (!body.email) fields.email = "El correo es obligatorio.";
    if (Object.keys(fields).length > 0) {
      return errorResponse(422, "Datos inválidos.", "VALIDATION_ERROR", fields);
    }
    const speaker: SpeakerRead = {
      id: nextSpeakerId++,
      full_name: body.full_name!,
      bio: body.bio ?? null,
      email: body.email!,
    };
    db.speakers.push(speaker);
    return HttpResponse.json(speaker, { status: 201 });
  }),

  http.get("/api/v1/speakers", ({ request }) => {
    const user = getAuthUser(request);
    if (!user) return errorResponse(401, "No autenticado.", "INVALID_TOKEN");
    const params = new URL(request.url).searchParams;
    const name = params.get("name");
    let visible = db.speakers;
    if (name) {
      const needle = name.toLowerCase();
      visible = visible.filter((s) => s.full_name.toLowerCase().includes(needle));
    }
    const { page, page_size } = parsePaging(params);
    return HttpResponse.json(paginate(visible, page, page_size));
  }),

  http.get("/api/v1/speakers/:id", ({ request, params }) => {
    const user = getAuthUser(request);
    if (!user) return errorResponse(401, "No autenticado.", "INVALID_TOKEN");
    const speaker = db.speakers.find((s) => s.id === Number(params.id));
    if (!speaker) return errorResponse(404, "Ponente no encontrado.", "SPEAKER_NOT_FOUND");
    return HttpResponse.json(speaker);
  }),

  http.put("/api/v1/speakers/:id", async ({ request, params }) => {
    const user = getAuthUser(request);
    if (!user || (user.role !== "organizador" && user.role !== "admin")) {
      return errorResponse(403, "Rol insuficiente.", "INSUFFICIENT_ROLE");
    }
    const speaker = db.speakers.find((s) => s.id === Number(params.id));
    if (!speaker) return errorResponse(404, "Ponente no encontrado.", "SPEAKER_NOT_FOUND");
    const body = (await request.json()) as Partial<SpeakerRead>;
    Object.assign(speaker, body);
    return HttpResponse.json(speaker);
  }),

  http.delete("/api/v1/speakers/:id", ({ request, params }) => {
    const user = getAuthUser(request);
    if (!user || user.role !== "admin") {
      return errorResponse(403, "Rol insuficiente.", "INSUFFICIENT_ROLE");
    }
    const index = db.speakers.findIndex((s) => s.id === Number(params.id));
    if (index === -1) {
      return errorResponse(404, "Ponente no encontrado.", "SPEAKER_NOT_FOUND");
    }
    const speakerId = db.speakers[index].id;
    if (db.sessions.some((s) => s.speaker_id === speakerId)) {
      return errorResponse(
        409,
        "No se puede eliminar: tiene sesiones asociadas.",
        "SPEAKER_IN_USE",
      );
    }
    db.speakers.splice(index, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  http.post("/api/v1/events/:eventId/sessions", async ({ request, params }) => {
    const event = db.events.find((e) => e.id === Number(params.eventId));
    if (!event) return errorResponse(404, "Evento no encontrado.", "EVENT_NOT_FOUND");
    const user = getAuthUser(request);
    if (!isOwnerOrAdmin(user, event.organizer_id)) {
      return errorResponse(403, "No tienes permisos sobre este evento.", "EVENT_FORBIDDEN");
    }
    const body = (await request.json()) as {
      speaker_id?: number;
      title?: string;
      description?: string | null;
      start_time?: string;
      end_time?: string;
      capacity?: number;
    };
    if (!db.speakers.some((s) => s.id === body.speaker_id)) {
      return errorResponse(422, "El ponente no existe.", "INVALID_SESSION_DATA", {
        speaker_id: "El ponente no existe.",
      });
    }
    if (
      !body.start_time ||
      !body.end_time ||
      body.start_time < event.start_date ||
      body.end_time > event.end_date
    ) {
      return errorResponse(
        422,
        "El horario de la sesión debe estar dentro del rango del evento.",
        "INVALID_SESSION_DATA",
        { start_time: "Debe estar dentro del rango del evento." },
      );
    }
    if (!body.capacity || body.capacity > event.capacity) {
      return errorResponse(
        422,
        "El cupo de la sesión no puede superar el del evento.",
        "INVALID_SESSION_DATA",
        { capacity: "No puede superar el cupo del evento." },
      );
    }
    const hasOverlap = db.sessions.some(
      (s) =>
        s.speaker_id === body.speaker_id &&
        overlaps(body.start_time!, body.end_time!, s.start_time, s.end_time),
    );
    if (hasOverlap) {
      return errorResponse(
        422,
        "El ponente ya tiene una sesión en ese horario.",
        "SESSION_OVERLAP",
      );
    }
    const session: SessionRead = {
      id: nextSessionId++,
      speaker_id: body.speaker_id!,
      event_id: event.id,
      title: body.title ?? "",
      description: body.description ?? null,
      start_time: body.start_time!,
      end_time: body.end_time!,
      capacity: body.capacity!,
    };
    db.sessions.push(session);
    return HttpResponse.json(session, { status: 201 });
  }),

  http.get("/api/v1/events/:eventId/sessions", ({ request, params }) => {
    const authUser = getAuthUser(request);
    const event = db.events.find((e) => e.id === Number(params.eventId));
    if (!event || !isEventVisibleTo(event, authUser)) {
      return errorResponse(404, "Evento no encontrado.", "EVENT_NOT_FOUND");
    }
    const sessions = db.sessions.filter((s) => s.event_id === event.id);
    const { page, page_size } = parsePaging(new URL(request.url).searchParams);
    return HttpResponse.json(paginate(sessions, page, page_size));
  }),

  http.get("/api/v1/events/:eventId/sessions/:id", ({ request, params }) => {
    const authUser = getAuthUser(request);
    const event = db.events.find((e) => e.id === Number(params.eventId));
    if (!event || !isEventVisibleTo(event, authUser)) {
      return errorResponse(404, "Evento no encontrado.", "EVENT_NOT_FOUND");
    }
    const session = db.sessions.find(
      (s) => s.id === Number(params.id) && s.event_id === event.id,
    );
    if (!session) {
      return errorResponse(404, "Sesión no encontrada.", "SESSION_NOT_FOUND");
    }
    return HttpResponse.json(session);
  }),

  http.put("/api/v1/events/:eventId/sessions/:id", async ({ request, params }) => {
    const event = db.events.find((e) => e.id === Number(params.eventId));
    if (!event) return errorResponse(404, "Evento no encontrado.", "EVENT_NOT_FOUND");
    const user = getAuthUser(request);
    if (!isOwnerOrAdmin(user, event.organizer_id)) {
      return errorResponse(403, "No tienes permisos sobre este evento.", "EVENT_FORBIDDEN");
    }
    const session = db.sessions.find(
      (s) => s.id === Number(params.id) && s.event_id === event.id,
    );
    if (!session) {
      return errorResponse(404, "Sesión no encontrada.", "SESSION_NOT_FOUND");
    }
    const body = (await request.json()) as Partial<SessionRead>;
    const nextStart = body.start_time ?? session.start_time;
    const nextEnd = body.end_time ?? session.end_time;
    if (nextStart < event.start_date || nextEnd > event.end_date) {
      return errorResponse(
        422,
        "El horario de la sesión debe estar dentro del rango del evento.",
        "INVALID_SESSION_DATA",
        { start_time: "Debe estar dentro del rango del evento." },
      );
    }
    const speakerId = body.speaker_id ?? session.speaker_id;
    const hasOverlap = db.sessions.some(
      (s) =>
        s.id !== session.id &&
        s.speaker_id === speakerId &&
        overlaps(nextStart, nextEnd, s.start_time, s.end_time),
    );
    if (hasOverlap) {
      return errorResponse(
        422,
        "El ponente ya tiene una sesión en ese horario.",
        "SESSION_OVERLAP",
      );
    }
    Object.assign(session, body);
    return HttpResponse.json(session);
  }),

  http.delete("/api/v1/events/:eventId/sessions/:id", ({ request, params }) => {
    const event = db.events.find((e) => e.id === Number(params.eventId));
    if (!event) return errorResponse(404, "Evento no encontrado.", "EVENT_NOT_FOUND");
    const user = getAuthUser(request);
    if (!isOwnerOrAdmin(user, event.organizer_id)) {
      return errorResponse(403, "No tienes permisos sobre este evento.", "EVENT_FORBIDDEN");
    }
    const index = db.sessions.findIndex(
      (s) => s.id === Number(params.id) && s.event_id === event.id,
    );
    if (index === -1) {
      return errorResponse(404, "Sesión no encontrada.", "SESSION_NOT_FOUND");
    }
    db.sessions.splice(index, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  http.post("/api/v1/events/:eventId/register", ({ request, params }) => {
    const user = getAuthUser(request);
    if (!user) return errorResponse(401, "No autenticado.", "INVALID_TOKEN");
    const event = db.events.find((e) => e.id === Number(params.eventId));
    if (!event) return errorResponse(404, "Evento no encontrado.", "EVENT_NOT_FOUND");
    if (event.status !== "published") {
      return errorResponse(403, "El evento no está publicado.", "EVENT_NOT_PUBLISHED");
    }
    const existing = db.registrations.find(
      (r) => r.event_id === event.id && r.user_id === user.id && r.status === "confirmed",
    );
    if (existing) {
      return errorResponse(409, "Ya estás registrado en este evento.", "ALREADY_REGISTERED");
    }
    const confirmedCount = db.registrations.filter(
      (r) => r.event_id === event.id && r.status === "confirmed",
    ).length;
    if (confirmedCount >= event.capacity) {
      return errorResponse(400, "El evento no tiene cupo disponible.", "EVENT_FULL");
    }
    const registration: RegistrationRead = {
      id: nextRegistrationId++,
      user_id: user.id,
      event_id: event.id,
      status: "confirmed",
      registered_at: new Date().toISOString(),
    };
    db.registrations.push(registration);
    return HttpResponse.json(registration, { status: 201 });
  }),

  http.delete("/api/v1/events/:eventId/register", ({ request, params }) => {
    const user = getAuthUser(request);
    if (!user) return errorResponse(401, "No autenticado.", "INVALID_TOKEN");
    const registration = db.registrations.find(
      (r) =>
        r.event_id === Number(params.eventId) &&
        r.user_id === user.id &&
        r.status === "confirmed",
    );
    if (!registration) {
      return errorResponse(
        404,
        "No se encontró tu registro para este evento.",
        "REGISTRATION_NOT_FOUND",
      );
    }
    registration.status = "cancelled";
    return new HttpResponse(null, { status: 204 });
  }),

  http.get("/api/v1/me/registrations", ({ request }) => {
    const user = getAuthUser(request);
    if (!user) return errorResponse(401, "No autenticado.", "INVALID_TOKEN");
    const mine: RegistrationWithEventRead[] = db.registrations
      .filter((r) => r.user_id === user.id)
      .map((r) => ({
        id: r.id,
        status: r.status,
        registered_at: r.registered_at,
        event: db.events.find((e) => e.id === r.event_id)!,
      }));
    const { page, page_size } = parsePaging(new URL(request.url).searchParams);
    return HttpResponse.json(paginate(mine, page, page_size));
  }),
];
