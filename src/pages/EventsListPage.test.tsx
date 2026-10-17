import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http as mswHttp, HttpResponse } from "msw";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import type { EventRead } from "@/features/events/types";
import EventsListPage from "@/pages/EventsListPage";
import { resetDb } from "@/test/msw/handlers";
import { server } from "@/test/msw/server";

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<EventsListPage />} />
          <Route path="/events/:id" element={<div>Detalle del evento</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("EventsListPage", () => {
  beforeEach(() => {
    resetDb();
  });

  it("muestra el listado paginado de eventos públicos (sin drafts ajenos)", async () => {
    renderPage();

    await waitFor(() =>
      expect(screen.getByText("Conferencia de Tecnología")).toBeInTheDocument(),
    );
    expect(screen.getByText("Evento Cancelado")).toBeInTheDocument();
    expect(screen.getByText("Evento Finalizado")).toBeInTheDocument();
    // "Taller Privado" es un draft ajeno: un visitante anónimo no debe verlo.
    expect(screen.queryByText("Taller Privado")).not.toBeInTheDocument();
  });

  it("filtra por nombre tras el debounce de 400ms (no antes)", async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() =>
      expect(screen.getByText("Conferencia de Tecnología")).toBeInTheDocument(),
    );

    await user.type(screen.getByLabelText("Nombre"), "Cancelado");

    // Inmediatamente después de escribir, antes del debounce, la lista
    // visible todavía no cambió.
    expect(screen.getByText("Conferencia de Tecnología")).toBeInTheDocument();

    await waitFor(
      () => expect(screen.queryByText("Conferencia de Tecnología")).not.toBeInTheDocument(),
      { timeout: 1000 },
    );
    expect(screen.getByText("Evento Cancelado")).toBeInTheDocument();
  });

  it("muestra un estado vacío cuando el filtro no encuentra resultados", async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() =>
      expect(screen.getByText("Conferencia de Tecnología")).toBeInTheDocument(),
    );

    await user.type(screen.getByLabelText("Nombre"), "NoExisteNingunEvento");

    expect(
      await screen.findByText("No hay eventos con estos filtros.", undefined, {
        timeout: 1000,
      }),
    ).toBeInTheDocument();
  });

  it("pagina al hacer clic en Siguiente", async () => {
    server.use(
      mswHttp.get("/api/v1/events", ({ request }) => {
        const url = new URL(request.url);
        const page = Number(url.searchParams.get("page") ?? "1");
        const item: EventRead = {
          id: page,
          organizer_id: 2,
          status: "published",
          name: `Evento página ${page}`,
          description: null,
          location: "Bogotá, Colombia",
          start_date: "2026-11-01T09:00:00Z",
          end_date: "2026-11-01T18:00:00Z",
          capacity: 10,
          created_at: "2026-09-01T00:00:00Z",
          updated_at: "2026-09-01T00:00:00Z",
        };
        return HttpResponse.json({ items: [item], total: 15, page, page_size: 12 });
      }),
    );

    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Evento página 1");
    expect(screen.getByText("Página 1 de 2")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /siguiente/i }));

    await screen.findByText("Evento página 2");
    expect(screen.getByText("Página 2 de 2")).toBeInTheDocument();
  });
});
