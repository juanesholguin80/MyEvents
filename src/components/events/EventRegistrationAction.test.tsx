import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http as mswHttp, HttpResponse } from "msw";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { EventRegistrationAction } from "@/components/events/EventRegistrationAction";
import { Toaster } from "@/components/ui/Toaster";
import { useAuthStore } from "@/features/auth/store";
import { registerToEvent } from "@/features/registrations/api";
import type { EventRead } from "@/features/events/types";
import { resetDb } from "@/test/msw/handlers";
import { server } from "@/test/msw/server";

// Espejo del evento 1 del seed de MSW (publicado, cupo 2) y del evento 3
// (cancelado) — se reutilizan los ids reales para que las mutaciones contra
// los handlers de `register`/`cancel` encuentren el evento correspondiente.
const PUBLISHED_EVENT: EventRead = {
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
};

const CANCELLED_EVENT: EventRead = {
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
};

const ASISTENTE = {
  id: 3,
  email: "asistente@example.com",
  full_name: "Asistente Uno",
  role: "asistente" as const,
  is_active: true,
};

function renderAction(event: EventRead, { withToaster = true } = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/events/${event.id}`]}>
        {withToaster ? <Toaster /> : null}
        <EventRegistrationAction event={event} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("EventRegistrationAction", () => {
  beforeEach(() => {
    resetDb();
    useAuthStore.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    });
  });

  it("muestra un CTA a /login con redirect si no hay sesión", () => {
    renderAction(PUBLISHED_EVENT);

    const cta = screen.getByRole("link", { name: /inicia sesión para registrarte/i });
    expect(cta).toHaveAttribute("href", "/login?redirect=%2Fevents%2F1");
  });

  it("no muestra ningún botón si el evento no está publicado (estado inconsistente: registro confirmado sobre un evento ya cancelado)", () => {
    useAuthStore.setState({
      user: ASISTENTE,
      accessToken: "access-3",
      refreshToken: "refresh-3",
      isAuthenticated: true,
    });
    // Aunque el usuario tuviera un registro "confirmed" para este evento
    // (llegada por URL directa después de que el organizador lo canceló),
    // la regla crítica de §2.4 exige derivar el estado de `event.status`:
    // ni "Registrarme" ni "Cancelar registro" deben aparecer.
    server.use(
      mswHttp.get("/api/v1/me/registrations", () =>
        HttpResponse.json({
          items: [
            {
              id: 99,
              status: "confirmed",
              registered_at: "2026-07-05T00:00:00Z",
              event: CANCELLED_EVENT,
            },
          ],
          total: 1,
          page: 1,
          page_size: 100,
        }),
      ),
    );

    const { container } = renderAction(CANCELLED_EVENT, { withToaster: false });

    expect(container).toBeEmptyDOMElement();
  });

  it("registro feliz: muestra Registrarme, lo registra y pasa a Cancelar registro", async () => {
    useAuthStore.setState({
      user: ASISTENTE,
      accessToken: "access-3",
      refreshToken: "refresh-3",
      isAuthenticated: true,
    });

    const user = userEvent.setup();
    renderAction(PUBLISHED_EVENT);

    const registerButton = await screen.findByRole("button", { name: /registrarme/i });
    await user.click(registerButton);

    expect(await screen.findByText(/te registraste al evento/i)).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /cancelar registro/i })).toBeInTheDocument();
  });

  it("evento sin cupo: muestra el toast de EVENT_FULL (400) en vez de un estado de botón distinto", async () => {
    useAuthStore.setState({
      user: ASISTENTE,
      accessToken: "access-3",
      refreshToken: "refresh-3",
      isAuthenticated: true,
    });
    server.use(
      mswHttp.post("/api/v1/events/:eventId/register", () =>
        HttpResponse.json(
          { detail: "El evento no tiene cupo disponible.", code: "EVENT_FULL", fields: null },
          { status: 400 },
        ),
      ),
    );

    const user = userEvent.setup();
    renderAction(PUBLISHED_EVENT);

    const registerButton = await screen.findByRole("button", { name: /registrarme/i });
    await user.click(registerButton);

    expect(
      await screen.findByText(/el evento no tiene cupo disponible/i),
    ).toBeInTheDocument();
    // Sigue mostrando "Registrarme": EVENT_FULL no es un cuarto estado de
    // botón, solo un toast (decisión documentada en §8 del plan).
    expect(screen.getByRole("button", { name: /registrarme/i })).toBeInTheDocument();
  });

  it("cancelar registro: con un registro existente muestra Cancelar registro y lo cancela tras confirmar en el Modal", async () => {
    useAuthStore.setState({
      user: ASISTENTE,
      accessToken: "access-3",
      refreshToken: "refresh-3",
      isAuthenticated: true,
    });
    // Seed de un registro confirmado real contra los handlers de MSW (no un
    // mock manual del GET): así la lógica de "¿ya estoy registrado?" se
    // ejercita de punta a punta.
    await registerToEvent(PUBLISHED_EVENT.id);

    const user = userEvent.setup();
    renderAction(PUBLISHED_EVENT);

    const cancelButton = await screen.findByRole("button", { name: /cancelar registro/i });
    await user.click(cancelButton);

    const confirmButton = await screen.findByRole("button", { name: "Confirmar" });
    await user.click(confirmButton);

    expect(await screen.findByText(/tu registro fue cancelado/i)).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /registrarme/i })).toBeInTheDocument();
  });
});
