import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http as mswHttp, HttpResponse } from "msw";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminUsersPage from "@/pages/AdminUsersPage";
import { Toaster } from "@/components/ui/Toaster";
import { useAuthStore } from "@/features/auth/store";
import { resetDb } from "@/test/msw/handlers";
import { server } from "@/test/msw/server";

const ADMIN_SELF = {
  id: 1,
  email: "admin@example.com",
  full_name: "Admin Principal",
  role: "admin" as const,
  is_active: true,
};

function loginAsAdmin() {
  useAuthStore.setState({
    user: ADMIN_SELF,
    accessToken: "access-1",
    refreshToken: "refresh-1",
    isAuthenticated: true,
  });
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <Toaster />
      <AdminUsersPage />
    </QueryClientProvider>,
  );
}

describe("AdminUsersPage", () => {
  beforeEach(() => {
    resetDb();
    loginAsAdmin();
    // Radix Select necesita estos shims en jsdom (no implementa pointer
    // capture ni scrollIntoView) — mismo patrón que SessionFormDialog.test.
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    window.HTMLElement.prototype.hasPointerCapture = vi.fn();
    window.HTMLElement.prototype.releasePointerCapture = vi.fn();
  });

  it("muestra el listado paginado de usuarios (Admin)", async () => {
    server.use(
      mswHttp.get("/api/v1/admin/users", ({ request }) => {
        const url = new URL(request.url);
        const page = Number(url.searchParams.get("page") ?? "1");
        const item = {
          id: page,
          email: `usuario${page}@example.com`,
          full_name: `Usuario página ${page}`,
          role: "asistente" as const,
          is_active: true,
        };
        return HttpResponse.json({ items: [item], total: 15, page, page_size: 10 });
      }),
    );

    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Usuario página 1");
    expect(screen.getByText("Página 1 de 2")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /siguiente/i }));

    await screen.findByText("Usuario página 2");
    expect(screen.getByText("Página 2 de 2")).toBeInTheDocument();
  });

  it("cambia el rol de otro usuario (PATCH {role: organizador}) e invalida el listado", async () => {
    const user = userEvent.setup();
    renderPage();

    // "Asistente Uno" (id 3, seed de MSW) parte con rol "asistente".
    await screen.findByText("Asistente Uno");
    const roleSelect = screen.getByLabelText("Rol de Asistente Uno");
    expect(roleSelect).toHaveTextContent("Asistente");

    await user.click(roleSelect);
    await user.click(await screen.findByRole("option", { name: "Organizador" }));

    expect(await screen.findByText("Rol de Asistente Uno actualizado.")).toBeInTheDocument();

    // La tabla refleja "Organizador" solo si `adminUserKeys.lists()` fue
    // invalidado y el listado se volvió a pedir al backend (§4.1 del plan)
    // — si no hubiera invalidación, el Select seguiría mostrando el valor
    // cacheado "Asistente".
    expect(await screen.findByLabelText("Rol de Asistente Uno")).toHaveTextContent(
      "Organizador",
    );
  });

  it("deshabilita los controles de la propia fila del admin y nunca dispara la request al intentar editarse a sí mismo", async () => {
    let patchCalls = 0;
    const onRequestStart = ({ request }: { request: Request }) => {
      if (
        request.method === "PATCH" &&
        /\/api\/v1\/admin\/users\/1$/.test(new URL(request.url).pathname)
      ) {
        patchCalls += 1;
      }
    };
    server.events.on("request:start", onRequestStart);

    try {
      const user = userEvent.setup();
      renderPage();

      // "Admin Principal" (id 1) es el propio admin autenticado en este test.
      const nameCell = await screen.findByText("Admin Principal");
      const selfRow = nameCell.closest("tr");
      expect(selfRow).not.toBeNull();
      const selfRoleSelect = within(selfRow!).getByLabelText("Rol de Admin Principal");
      const selfActiveButton = within(selfRow!).getByRole("button", { name: "Activo" });

      // Deshabilitado desde el primer render (no solo tras un 403): ambos
      // controles de la fila propia ya nacen inhabilitados.
      expect(selfRoleSelect).toBeDisabled();
      expect(selfActiveButton).toBeDisabled();

      // Intentar interactuar con controles deshabilitados no abre el
      // popover del Select ni dispara el handler del botón.
      await user.click(selfRoleSelect);
      expect(screen.queryByRole("option")).not.toBeInTheDocument();
      await user.click(selfActiveButton);

      expect(within(selfRow!).getByLabelText("Rol de Admin Principal")).toHaveTextContent(
        "Administrador",
      );
      expect(within(selfRow!).getByRole("button", { name: "Activo" })).toBeInTheDocument();
      expect(patchCalls).toBe(0);
    } finally {
      server.events.removeListener("request:start", onRequestStart);
    }
  });
});
