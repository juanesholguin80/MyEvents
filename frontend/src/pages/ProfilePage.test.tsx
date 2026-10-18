import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import ProfilePage from "@/pages/ProfilePage";
import { useAuthStore } from "@/features/auth/store";
import { cancelEvent } from "@/features/events/api";
import { registerToEvent } from "@/features/registrations/api";
import { resetDb } from "@/test/msw/handlers";

const ASISTENTE = {
  id: 3,
  email: "asistente@example.com",
  full_name: "Asistente Uno",
  role: "asistente" as const,
  is_active: true,
};

const ORGANIZER = {
  id: 2,
  email: "organizador@example.com",
  full_name: "Organizador Uno",
  role: "organizador" as const,
  is_active: true,
};

function loginAs(user: typeof ASISTENTE | typeof ORGANIZER) {
  useAuthStore.setState({
    user,
    accessToken: `access-${user.id}`,
    refreshToken: `refresh-${user.id}`,
    isAuthenticated: true,
  });
}

function renderProfile() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/profile"]}>
        <ProfilePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("ProfilePage", () => {
  beforeEach(() => {
    resetDb();
  });

  it("muestra los datos de la cuenta (GET /me) y los eventos registrados (GET /me/registrations)", async () => {
    loginAs(ASISTENTE);
    await registerToEvent(1);

    renderProfile();

    expect(await screen.findByText(ASISTENTE.full_name)).toBeInTheDocument();
    expect(screen.getByText(ASISTENTE.email)).toBeInTheDocument();
    expect(screen.getByText("Rol: Asistente")).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: "Conferencia de Tecnología" })).toHaveAttribute(
      "href",
      "/events/1",
    );
  });

  // Test más importante de la Fase 6 (§2.4 del plan): cancelar un evento NO
  // cambia el `status` de los registros ya confirmados a él. El registro de
  // este asistente sigue "confirmed" en el backend, pero el evento quedó
  // "cancelled" — ProfilePage debe mostrar "Cancelado" (derivado de
  // `event.status`), nunca "Confirmado"/el estado crudo de la fila, y debe
  // ocultar el botón de cancelar porque el evento ya no admite esa acción.
  it('muestra "Cancelado" para un evento cancelado por el organizador aunque registration.status siga en "confirmed"', async () => {
    loginAs(ASISTENTE);
    await registerToEvent(1);

    loginAs(ORGANIZER);
    const cancelledEvent = await cancelEvent(1);
    expect(cancelledEvent.status).toBe("cancelled");

    loginAs(ASISTENTE);
    renderProfile();

    const row = (await screen.findByRole("link", { name: "Conferencia de Tecnología" })).closest(
      "li",
    );
    expect(row).not.toBeNull();

    expect(within(row!).getByText("Cancelado")).toBeInTheDocument();
    expect(within(row!).queryByText(/confirmado/i)).not.toBeInTheDocument();
    expect(within(row!).queryByRole("button", { name: /cancelar registro/i })).not.toBeInTheDocument();
  });

  it("permite cancelar el registro de un evento que sigue publicado", async () => {
    loginAs(ASISTENTE);
    await registerToEvent(1);

    renderProfile();

    const row = (await screen.findByRole("link", { name: "Conferencia de Tecnología" })).closest(
      "li",
    );
    expect(within(row!).getByText("Publicado")).toBeInTheDocument();
    expect(
      within(row!).getByRole("button", { name: /cancelar registro/i }),
    ).toBeInTheDocument();
  });

  it("muestra un mensaje cuando el usuario no tiene registros", async () => {
    loginAs(ASISTENTE);

    renderProfile();

    expect(
      await screen.findByText(/todavía no te has registrado a ningún evento/i),
    ).toBeInTheDocument();
  });
});
