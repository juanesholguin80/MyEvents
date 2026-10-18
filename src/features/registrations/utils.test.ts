import { describe, expect, it } from "vitest";
import type { RegistrationWithEventRead } from "@/features/registrations/types";
import { getDisplayStatus } from "@/features/registrations/utils";

const BASE_EVENT = {
  id: 1,
  organizer_id: 2,
  name: "Evento de prueba",
  description: null,
  location: "Bogotá, Colombia",
  start_date: "2026-11-01T09:00:00Z",
  end_date: "2026-11-01T18:00:00Z",
  capacity: 2,
  created_at: "2026-09-01T00:00:00Z",
  updated_at: "2026-09-01T00:00:00Z",
};

// §2.4 del plan, regla crítica: el estado mostrado se deriva de
// `registration.event.status`, nunca de `registration.status` — este es el
// único punto de la app donde se decide esa regla.
describe("getDisplayStatus", () => {
  it("devuelve el status del evento embebido aunque registration.status siga 'confirmed'", () => {
    const registration: RegistrationWithEventRead = {
      id: 1,
      status: "confirmed",
      registered_at: "2026-09-05T00:00:00Z",
      event: { ...BASE_EVENT, status: "cancelled" },
    };

    expect(getDisplayStatus(registration)).toBe("cancelled");
  });

  it("devuelve 'published' cuando el evento sigue publicado y el registro está confirmado", () => {
    const registration: RegistrationWithEventRead = {
      id: 2,
      status: "confirmed",
      registered_at: "2026-09-05T00:00:00Z",
      event: { ...BASE_EVENT, status: "published" },
    };

    expect(getDisplayStatus(registration)).toBe("published");
  });
});
