import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http as mswHttp, HttpResponse } from "msw";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { axe } from "vitest-axe";
import { Toaster } from "@/components/ui/Toaster";
import { useAuthStore } from "@/features/auth/store";
import EventFormPage from "@/pages/EventFormPage";
import { resetDb } from "@/test/msw/handlers";
import { server } from "@/test/msw/server";

const ORGANIZER = {
  id: 2,
  email: "organizador@example.com",
  full_name: "Organizador Uno",
  role: "organizador" as const,
  is_active: true,
};

function renderEventFormPage(initialEntries: string[]) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <Toaster />
        <Routes>
          <Route path="/events/new" element={<EventFormPage />} />
          <Route path="/events/:id/edit" element={<EventFormPage />} />
          <Route path="/events/:id" element={<div>Detalle del evento</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

async function fillValidEventForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Nombre"), "Evento nuevo");
  await user.type(screen.getByLabelText("Ubicación"), "Quito, Ecuador");
  fireEvent.change(screen.getByLabelText("Fecha y hora de inicio"), {
    target: { value: "2026-12-10T09:00" },
  });
  fireEvent.change(screen.getByLabelText("Fecha y hora de fin"), {
    target: { value: "2026-12-10T12:00" },
  });
  await user.clear(screen.getByLabelText("Cupo"));
  await user.type(screen.getByLabelText("Cupo"), "10");
}

describe("EventFormPage — modo crear", () => {
  beforeEach(() => {
    resetDb();
    useAuthStore.setState({
      user: ORGANIZER,
      accessToken: "access-2",
      refreshToken: "refresh-2",
      isAuthenticated: true,
    });
  });

  it("crea un evento feliz y redirige al detalle", async () => {
    const user = userEvent.setup();
    renderEventFormPage(["/events/new"]);

    await fillValidEventForm(user);
    await user.click(screen.getByRole("button", { name: /crear evento/i }));

    expect(await screen.findByText("Detalle del evento")).toBeInTheDocument();
  });

  it("mapea un 422 con fields al formulario (fechas inválidas)", async () => {
    server.use(
      mswHttp.post("/api/v1/events", () =>
        HttpResponse.json(
          {
            detail: "Datos inválidos.",
            code: "VALIDATION_ERROR",
            fields: {
              end_date: "La fecha fin no puede ser menor o igual a la fecha de inicio.",
            },
          },
          { status: 422 },
        ),
      ),
    );

    const user = userEvent.setup();
    renderEventFormPage(["/events/new"]);

    await fillValidEventForm(user);
    await user.click(screen.getByRole("button", { name: /crear evento/i }));

    expect(
      await screen.findByText(
        "La fecha fin no puede ser menor o igual a la fecha de inicio.",
      ),
    ).toBeInTheDocument();
    // No navegó: el formulario de creación sigue en pantalla.
    expect(screen.queryByText("Detalle del evento")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /crear evento/i })).toBeInTheDocument();
  });

  it("has no detectable accessibility violations in create mode", async () => {
    const { container } = renderEventFormPage(["/events/new"]);
    await screen.findByRole("button", { name: /crear evento/i });
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("EventFormPage — modo editar, defensa en profundidad", () => {
  beforeEach(() => {
    resetDb();
  });

  it("redirige al detalle si el evento ya es terminal (cancelled)", async () => {
    useAuthStore.setState({
      user: ORGANIZER,
      accessToken: "access-2",
      refreshToken: "refresh-2",
      isAuthenticated: true,
    });

    // El evento con id 3 del seed está "cancelled" (terminal).
    renderEventFormPage(["/events/3/edit"]);

    await waitFor(() => expect(screen.getByText("Detalle del evento")).toBeInTheDocument());
  });

  it("redirige al detalle si el usuario autenticado no es dueño ni admin", async () => {
    useAuthStore.setState({
      user: {
        id: 3,
        email: "asistente@example.com",
        full_name: "Asistente Uno",
        role: "asistente",
        is_active: true,
      },
      accessToken: "access-3",
      refreshToken: "refresh-3",
      isAuthenticated: true,
    });

    // El evento con id 1 pertenece al organizador (id 2), no al asistente.
    renderEventFormPage(["/events/1/edit"]);

    await waitFor(() => expect(screen.getByText("Detalle del evento")).toBeInTheDocument());
  });
});
