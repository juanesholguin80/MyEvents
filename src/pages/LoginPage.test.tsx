import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http as mswHttp, HttpResponse } from "msw";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { Toaster } from "@/components/ui/Toaster";
import { useAuthStore } from "@/features/auth/store";
import LoginPage from "@/pages/LoginPage";
import { resetDb } from "@/test/msw/handlers";
import { server } from "@/test/msw/server";

function renderLoginPage(initialEntries = ["/login"]) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <Toaster />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<div>Home</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("LoginPage", () => {
  beforeEach(() => {
    resetDb();
    useAuthStore.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    });
  });

  it("logs in successfully and redirects home", async () => {
    const user = userEvent.setup();
    renderLoginPage();

    await user.type(screen.getByLabelText("Correo"), "organizador@example.com");
    await user.type(screen.getByLabelText("Contraseña"), "OrgPass123");
    await user.click(screen.getByRole("button", { name: /ingresar/i }));

    await waitFor(() => expect(screen.getByText("Home")).toBeInTheDocument());
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().user?.email).toBe("organizador@example.com");
  });

  it("shows an error toast with invalid credentials and keeps the user logged out", async () => {
    const user = userEvent.setup();
    renderLoginPage();

    await user.type(screen.getByLabelText("Correo"), "organizador@example.com");
    await user.type(screen.getByLabelText("Contraseña"), "WrongPass");
    await user.click(screen.getByRole("button", { name: /ingresar/i }));

    await waitFor(() =>
      expect(screen.getByText(/correo o contraseña incorrectos/i)).toBeInTheDocument(),
    );
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it("leaves no orphaned accessToken in the store when GET /me fails right after login", async () => {
    server.use(
      mswHttp.get("/api/v1/me", () => HttpResponse.json({ detail: "boom" }, { status: 500 })),
    );
    const user = userEvent.setup();
    renderLoginPage();

    await user.type(screen.getByLabelText("Correo"), "organizador@example.com");
    await user.type(screen.getByLabelText("Contraseña"), "OrgPass123");
    await user.click(screen.getByRole("button", { name: /ingresar/i }));

    await waitFor(() => expect(screen.getByText(/error inesperado/i)).toBeInTheDocument());
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
  });
});
