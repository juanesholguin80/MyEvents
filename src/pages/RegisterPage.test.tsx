import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { axe } from "vitest-axe";
import { Toaster } from "@/components/ui/Toaster";
import RegisterPage from "@/pages/RegisterPage";
import { resetDb } from "@/test/msw/handlers";

function renderRegisterPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/register"]}>
        <Toaster />
        <Routes>
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/login" element={<div>Login</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("RegisterPage", () => {
  beforeEach(() => {
    resetDb();
  });

  it("shows a duplicate email error and does not navigate away", async () => {
    const user = userEvent.setup();
    renderRegisterPage();

    await user.type(screen.getByLabelText("Nombre completo"), "Nuevo Usuario");
    await user.type(screen.getByLabelText("Correo"), "organizador@example.com");
    await user.type(screen.getByLabelText("Contraseña"), "AlgoSeguro123");
    await user.click(screen.getByRole("button", { name: /crear cuenta/i }));

    await waitFor(() =>
      expect(screen.getByText(/ya existe una cuenta/i)).toBeInTheDocument(),
    );
    expect(screen.queryByText("Login")).not.toBeInTheDocument();
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = renderRegisterPage();
    expect(await axe(container)).toHaveNoViolations();
  });
});
