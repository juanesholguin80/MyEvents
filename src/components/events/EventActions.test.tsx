import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http as mswHttp, HttpResponse } from "msw";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { EventActions } from "@/components/events/EventActions";
import { Toaster } from "@/components/ui/Toaster";
import { useAuthStore } from "@/features/auth/store";
import type { EventRead } from "@/features/events/types";
import { resetDb } from "@/test/msw/handlers";
import { server } from "@/test/msw/server";

const PUBLISHED_EVENT: EventRead = {
  id: 1,
  organizer_id: 2,
  status: "published",
  name: "Evento de prueba",
  description: null,
  location: "Bogotá, Colombia",
  start_date: "2026-11-01T09:00:00Z",
  end_date: "2026-11-01T18:00:00Z",
  capacity: 10,
  created_at: "2026-09-01T00:00:00Z",
  updated_at: "2026-09-01T00:00:00Z",
};

const ORGANIZER_OWNER = {
  id: 2,
  email: "organizador@example.com",
  full_name: "Organizador Uno",
  role: "organizador" as const,
  is_active: true,
};

const UNRELATED_ASISTENTE = {
  id: 3,
  email: "asistente@example.com",
  full_name: "Asistente Uno",
  role: "asistente" as const,
  is_active: true,
};

function renderActions(event: EventRead, { withToaster = false } = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        {withToaster ? <Toaster /> : null}
        <EventActions event={event} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("EventActions", () => {
  beforeEach(() => {
    resetDb();
  });

  it("no renderiza ningún botón de gestión si el usuario no es dueño ni admin", () => {
    useAuthStore.setState({
      user: UNRELATED_ASISTENTE,
      accessToken: "access-3",
      refreshToken: "refresh-3",
      isAuthenticated: true,
    });

    const { container } = renderActions(PUBLISHED_EVENT);

    expect(container).toBeEmptyDOMElement();
  });

  it("no renderiza nada si no hay usuario autenticado", () => {
    useAuthStore.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    });

    const { container } = renderActions(PUBLISHED_EVENT);

    expect(container).toBeEmptyDOMElement();
  });

  it("muestra editar/cancelar/finalizar/borrar para el dueño de un evento publicado", () => {
    useAuthStore.setState({
      user: ORGANIZER_OWNER,
      accessToken: "access-2",
      refreshToken: "refresh-2",
      isAuthenticated: true,
    });

    renderActions(PUBLISHED_EVENT);

    expect(screen.getByRole("link", { name: "Editar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancelar evento" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Finalizar evento" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /borrar/i })).toBeInTheDocument();
  });

  it("oculta editar/borrar para un evento terminal (finished), aunque el usuario sea el dueño", () => {
    useAuthStore.setState({
      user: ORGANIZER_OWNER,
      accessToken: "access-2",
      refreshToken: "refresh-2",
      isAuthenticated: true,
    });

    renderActions({ ...PUBLISHED_EVENT, status: "finished" });

    expect(screen.queryByRole("link", { name: "Editar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /borrar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancelar evento" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Finalizar evento" })).not.toBeInTheDocument();
  });

  it("muestra un toast cuando la transición es inválida (409)", async () => {
    server.use(
      mswHttp.patch("/api/v1/events/:id/cancel", () =>
        HttpResponse.json(
          {
            detail: "El evento no se puede modificar en su estado actual.",
            code: "INVALID_EVENT_STATE",
            fields: null,
          },
          { status: 409 },
        ),
      ),
    );
    useAuthStore.setState({
      user: ORGANIZER_OWNER,
      accessToken: "access-2",
      refreshToken: "refresh-2",
      isAuthenticated: true,
    });

    const user = userEvent.setup();
    renderActions(PUBLISHED_EVENT, { withToaster: true });

    await user.click(screen.getByRole("button", { name: "Cancelar evento" }));
    await user.click(screen.getByRole("button", { name: "Confirmar" }));

    expect(
      await screen.findByText(/el evento no se puede modificar en su estado actual/i),
    ).toBeInTheDocument();
  });
});
