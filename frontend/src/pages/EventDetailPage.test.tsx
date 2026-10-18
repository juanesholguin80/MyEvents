import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import EventDetailPage from "@/pages/EventDetailPage";
import { resetDb } from "@/test/msw/handlers";

function renderPage(id: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/events/${id}`]}>
        <Routes>
          <Route path="/events/:id" element={<EventDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("EventDetailPage", () => {
  beforeEach(() => {
    resetDb();
  });

  it("muestra el detalle de un evento público junto con sus sesiones", async () => {
    renderPage("1");

    expect(
      await screen.findByRole("heading", { name: "Conferencia de Tecnología", level: 1 }),
    ).toBeInTheDocument();
    expect(await screen.findByText("Charla de apertura")).toBeInTheDocument();
    expect(screen.getByText("Bogotá, Colombia")).toBeInTheDocument();
    expect(screen.getByText("Cupo: 2")).toBeInTheDocument();
  });

  it("mueve el foco al encabezado tras montar", async () => {
    renderPage("1");

    await screen.findByRole("heading", { name: "Conferencia de Tecnología", level: 1 });
    await waitFor(() => expect(screen.getByRole("heading", { level: 1 })).toHaveFocus());
  });

  it("muestra la página 404 para un evento que no existe", async () => {
    renderPage("999");

    expect(await screen.findByText(/404/)).toBeInTheDocument();
  });

  it("muestra la página 404 para un id inválido en la URL", async () => {
    renderPage("no-es-un-id");

    expect(await screen.findByText(/404/)).toBeInTheDocument();
  });

  it("muestra el CTA de registro de asistentes (EventRegistrationAction) para un visitante anónimo en un evento publicado", async () => {
    renderPage("1");

    expect(
      await screen.findByRole("link", { name: /inicia sesión para registrarte/i }),
    ).toHaveAttribute("href", "/login?redirect=%2Fevents%2F1");
  });
});
