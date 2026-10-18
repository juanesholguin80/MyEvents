import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { RoleGuard } from "@/components/layout/RoleGuard";
import { useAuthStore } from "@/features/auth/store";

function LocationProbe() {
  const location = useLocation();
  return <div>Ubicación actual: {location.pathname}</div>;
}

function renderGuarded() {
  return render(
    <MemoryRouter initialEntries={["/admin/users"]}>
      <LocationProbe />
      <Routes>
        <Route element={<RoleGuard roles={["admin"]} />}>
          <Route path="/admin/users" element={<div>Panel de administración</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("RoleGuard", () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    });
  });

  it("renders a 403 page (not a redirect) when the role does not match, URL stays the same", () => {
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

    renderGuarded();

    expect(screen.getByRole("alert")).toHaveTextContent("403 — No autorizado");
    expect(screen.queryByText("Panel de administración")).not.toBeInTheDocument();
    // Caso distinto de "no autenticado": no hay redirect, la URL no cambia.
    expect(screen.getByText("Ubicación actual: /admin/users")).toBeInTheDocument();
  });

  it("also renders the 403 page (not a login redirect) when there is no session at all", () => {
    renderGuarded();

    expect(screen.getByRole("alert")).toHaveTextContent("403 — No autorizado");
    expect(screen.getByText("Ubicación actual: /admin/users")).toBeInTheDocument();
  });

  it("renders the guarded route when the role matches", () => {
    useAuthStore.setState({
      user: {
        id: 1,
        email: "admin@example.com",
        full_name: "Admin Principal",
        role: "admin",
        is_active: true,
      },
      accessToken: "access-1",
      refreshToken: "refresh-1",
      isAuthenticated: true,
    });

    renderGuarded();

    expect(screen.getByText("Panel de administración")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
