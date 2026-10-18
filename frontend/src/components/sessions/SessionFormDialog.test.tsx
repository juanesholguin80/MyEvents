import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http as mswHttp, HttpResponse } from "msw";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import { SessionFormDialog } from "@/components/sessions/SessionFormDialog";
import { Toaster } from "@/components/ui/Toaster";
import { useAuthStore } from "@/features/auth/store";
import type { EventRead } from "@/features/events/types";
import { resetDb } from "@/test/msw/handlers";
import { server } from "@/test/msw/server";

// Mismo evento publicado del seed de MSW (organizer_id: 2), con la sesión 1
// ya existente (ponente "Ana Pérez", 09:30Z–10:30Z).
const EVENT: EventRead = {
  id: 1,
  organizer_id: 2,
  status: "published",
  name: "Conferencia de Tecnología",
  description: "Charlas sobre el estado del arte en IA.",
  location: "Bogotá, Colombia",
  start_date: "2026-11-01T09:00:00Z",
  end_date: "2026-11-01T18:00:00Z",
  capacity: 2,
  created_at: "2026-09-01T00:00:00Z",
  updated_at: "2026-09-01T00:00:00Z",
};

const ORGANIZER_OWNER = {
  id: 2,
  email: "organizador@example.com",
  full_name: "Organizador Uno",
  role: "organizador" as const,
  is_active: true,
};

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

// Mismo helper que usa el componente: convierte un ISO con offset al valor
// local que espera un <input type="datetime-local">, para no depender de
// la zona horaria del entorno donde corren los tests.
function toDatetimeLocal(iso: string): string {
  const date = new Date(iso);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

function renderDialog(onOpenChange = vi.fn()) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const { baseElement } = render(
    <QueryClientProvider client={queryClient}>
      <Toaster />
      <SessionFormDialog mode="create" event={EVENT} open onOpenChange={onOpenChange} />
    </QueryClientProvider>,
  );
  return { onOpenChange, baseElement };
}

async function selectSpeaker(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.click(screen.getByLabelText("Ponente"));
  await user.click(await screen.findByRole("option", { name }));
}

async function fillTimes(startIso: string, endIso: string) {
  fireEvent.change(screen.getByLabelText("Fecha y hora de inicio"), {
    target: { value: toDatetimeLocal(startIso) },
  });
  fireEvent.change(screen.getByLabelText("Fecha y hora de fin"), {
    target: { value: toDatetimeLocal(endIso) },
  });
}

describe("SessionFormDialog", () => {
  beforeEach(() => {
    resetDb();
    useAuthStore.setState({
      user: ORGANIZER_OWNER,
      accessToken: "access-2",
      refreshToken: "refresh-2",
      isAuthenticated: true,
    });
    // Radix Select necesita estos shims en jsdom (no implementa pointer
    // capture ni scrollIntoView).
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    window.HTMLElement.prototype.hasPointerCapture = vi.fn();
    window.HTMLElement.prototype.releasePointerCapture = vi.fn();
  });

  it("crea una sesión feliz dentro del rango del evento", async () => {
    const user = userEvent.setup();
    const { onOpenChange } = renderDialog();

    await user.type(screen.getByLabelText("Título"), "Charla de cierre");
    await selectSpeaker(user, "Ana Pérez");
    // 13:00Z–14:00Z: dentro del rango del evento (09:00Z–18:00Z) y sin
    // solaparse con la sesión 1 (09:30Z–10:30Z).
    await fillTimes("2026-11-01T13:00:00Z", "2026-11-01T14:00:00Z");
    await user.clear(screen.getByLabelText("Cupo"));
    await user.type(screen.getByLabelText("Cupo"), "2");

    await user.click(screen.getByRole("button", { name: /crear sesión/i }));

    expect(await screen.findByText("Sesión creada.")).toBeInTheDocument();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("muestra un mensaje claro cuando el ponente ya tiene una sesión en ese horario (422 SESSION_OVERLAP)", async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.type(screen.getByLabelText("Título"), "Charla simultánea");
    await selectSpeaker(user, "Ana Pérez");
    // 10:00Z–11:00Z se solapa con la sesión 1 del mismo ponente (09:30Z–10:30Z).
    await fillTimes("2026-11-01T10:00:00Z", "2026-11-01T11:00:00Z");
    await user.clear(screen.getByLabelText("Cupo"));
    await user.type(screen.getByLabelText("Cupo"), "1");

    await user.click(screen.getByRole("button", { name: /crear sesión/i }));

    expect(
      await screen.findByText(/el ponente ya tiene una sesión en ese horario/i),
    ).toBeInTheDocument();
  });

  it("muestra el error del servidor cuando el horario queda fuera del rango del evento (422 INVALID_SESSION_DATA)", async () => {
    // El cliente ya restringe start/end con min/max y Zod replica la misma
    // regla (createSessionFormSchema), así que con datos fuera de rango la
    // request nunca saldría — aquí se fuerza la respuesta del servidor con
    // datos por lo demás válidos, mismo patrón que
    // EventFormPage.test.tsx para el 422 de fechas inválidas, para
    // verificar el manejo de este código de error específico de extremo a
    // extremo (toast + mapeo de campo).
    server.use(
      mswHttp.post("/api/v1/events/:eventId/sessions", () =>
        HttpResponse.json(
          {
            detail: "El horario de la sesión debe estar dentro del rango del evento.",
            code: "INVALID_SESSION_DATA",
            fields: { start_time: "Debe estar dentro del rango del evento." },
          },
          { status: 422 },
        ),
      ),
    );

    const user = userEvent.setup();
    renderDialog();

    await user.type(screen.getByLabelText("Título"), "Charla fuera de rango");
    await selectSpeaker(user, "Ana Pérez");
    await fillTimes("2026-11-01T13:00:00Z", "2026-11-01T14:00:00Z");
    await user.clear(screen.getByLabelText("Cupo"));
    await user.type(screen.getByLabelText("Cupo"), "2");

    await user.click(screen.getByRole("button", { name: /crear sesión/i }));

    // El error de campo muestra el mensaje exacto de `fields` (§4.1:
    // applyApiErrorToForm), mientras que el toast usa el mensaje genérico
    // mapeado por código en lib/errors.ts (messageForApiError prioriza el
    // code sobre el detail crudo del servidor).
    expect(
      await screen.findByText("Debe estar dentro del rango del evento."),
    ).toBeInTheDocument();
    expect(
      await screen.findByText(/los datos de la sesión no son válidos/i),
    ).toBeInTheDocument();
  });

  it("has no detectable accessibility violations", async () => {
    // Se verifica sobre baseElement (document.body), no sobre container:
    // el contenido del diálogo de Radix se renderiza en un portal fuera
    // del nodo donde React Testing Library monta el árbol.
    const { baseElement } = renderDialog();
    await screen.findByLabelText("Título");
    expect(await axe(baseElement)).toHaveNoViolations();
  });
});
