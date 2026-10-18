import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { useAuthStore } from "@/features/auth/store";

function LoginProbe() {
  const location = useLocation();
  return <div>Pantalla de login ({location.pathname}{location.search})</div>;
}

function renderProtected(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/profile" element={<div>Perfil privado</div>} />
        </Route>
        <Route path="/login" element={<LoginProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ProtectedRoute", () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    });
  });

  it("redirects to /login?redirect=<ruta> when there is no session", () => {
    renderProtected("/profile");

    expect(
      screen.getByText("Pantalla de login (/login?redirect=%2Fprofile)"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Perfil privado")).not.toBeInTheDocument();
  });

  it("renders the protected route when authenticated, without any redirect", () => {
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

    renderProtected("/profile");

    expect(screen.getByText("Perfil privado")).toBeInTheDocument();
    expect(screen.queryByText(/pantalla de login/i)).not.toBeInTheDocument();
  });
});
