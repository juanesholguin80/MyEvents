import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http as mswHttp, HttpResponse } from "msw";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SpeakerFormDialog } from "@/components/speakers/SpeakerFormDialog";
import { Toaster } from "@/components/ui/Toaster";
import { useAuthStore } from "@/features/auth/store";
import type { SpeakerRead } from "@/features/speakers/types";
import { resetDb } from "@/test/msw/handlers";
import { server } from "@/test/msw/server";

const ORGANIZER = {
  id: 2,
  email: "organizador@example.com",
  full_name: "Organizador Uno",
  role: "organizador" as const,
  is_active: true,
};

const EXISTING_SPEAKER: SpeakerRead = {
  id: 1,
  full_name: "Ana Pérez",
  bio: "Experta en inteligencia artificial.",
  email: "ana@example.com",
};

function renderDialog(
  props: Partial<Parameters<typeof SpeakerFormDialog>[0]> & {
    mode: "create" | "edit";
  },
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const onOpenChange = props.onOpenChange ?? vi.fn();
  const onSaved = props.onSaved ?? vi.fn();
  render(
    <QueryClientProvider client={queryClient}>
      <Toaster />
      <SpeakerFormDialog
        mode={props.mode}
        open={props.open ?? true}
        onOpenChange={onOpenChange}
        speaker={props.speaker}
        onSaved={onSaved}
      />
    </QueryClientProvider>,
  );
  return { onOpenChange, onSaved };
}

describe("SpeakerFormDialog", () => {
  beforeEach(() => {
    resetDb();
    useAuthStore.setState({
      user: ORGANIZER,
      accessToken: "access-2",
      refreshToken: "refresh-2",
      isAuthenticated: true,
    });
  });

  it("crea un ponente feliz (modo crear, formulario en blanco)", async () => {
    const user = userEvent.setup();
    const { onOpenChange, onSaved } = renderDialog({ mode: "create" });

    expect(screen.getByLabelText("Nombre completo")).toHaveValue("");
    await user.type(screen.getByLabelText("Nombre completo"), "Carlos Ruiz");
    await user.type(screen.getByLabelText("Correo"), "carlos@example.com");
    await user.type(screen.getByLabelText("Biografía"), "Divulgador científico.");

    await user.click(screen.getByRole("button", { name: /crear ponente/i }));

    expect(await screen.findByText("Ponente creado.")).toBeInTheDocument();
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onSaved).toHaveBeenCalledWith(
      expect.objectContaining({ full_name: "Carlos Ruiz", email: "carlos@example.com" }),
    );
  });

  it("precarga los valores del ponente en modo editar", () => {
    renderDialog({ mode: "edit", speaker: EXISTING_SPEAKER });

    expect(screen.getByLabelText("Nombre completo")).toHaveValue("Ana Pérez");
    expect(screen.getByLabelText("Correo")).toHaveValue("ana@example.com");
    expect(screen.getByLabelText("Biografía")).toHaveValue(
      "Experta en inteligencia artificial.",
    );
    expect(screen.getByRole("button", { name: /guardar cambios/i })).toBeInTheDocument();
  });

  it("actualiza un ponente feliz (modo editar)", async () => {
    const user = userEvent.setup();
    const { onOpenChange } = renderDialog({ mode: "edit", speaker: EXISTING_SPEAKER });

    await user.clear(screen.getByLabelText("Nombre completo"));
    await user.type(screen.getByLabelText("Nombre completo"), "Ana Pérez Gómez");
    await user.click(screen.getByRole("button", { name: /guardar cambios/i }));

    expect(await screen.findByText("Ponente actualizado.")).toBeInTheDocument();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("mapea un 422 con fields al formulario sin cerrar el modal", async () => {
    server.use(
      mswHttp.post("/api/v1/speakers", () =>
        HttpResponse.json(
          {
            detail: "Datos inválidos.",
            code: "VALIDATION_ERROR",
            fields: { email: "Ya existe un ponente con ese correo." },
          },
          { status: 422 },
        ),
      ),
    );
    const user = userEvent.setup();
    const { onOpenChange } = renderDialog({ mode: "create" });

    await user.type(screen.getByLabelText("Nombre completo"), "Carlos Ruiz");
    await user.type(screen.getByLabelText("Correo"), "carlos@example.com");
    await user.click(screen.getByRole("button", { name: /crear ponente/i }));

    expect(
      await screen.findByText("Ya existe un ponente con ese correo."),
    ).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it("envía bio como null cuando queda vacía tras trim", async () => {
    let capturedBody: { bio?: string | null } | undefined;
    server.use(
      mswHttp.post("/api/v1/speakers", async ({ request }) => {
        capturedBody = (await request.json()) as { bio?: string | null };
        return HttpResponse.json(
          { id: 99, full_name: "Carlos Ruiz", bio: null, email: "carlos@example.com" },
          { status: 201 },
        );
      }),
    );
    const user = userEvent.setup();
    renderDialog({ mode: "create" });

    await user.type(screen.getByLabelText("Nombre completo"), "Carlos Ruiz");
    await user.type(screen.getByLabelText("Correo"), "carlos@example.com");
    await user.type(screen.getByLabelText("Biografía"), "   ");
    await user.click(screen.getByRole("button", { name: /crear ponente/i }));

    await screen.findByText("Ponente creado.");
    expect(capturedBody?.bio).toBeNull();
  });
});
