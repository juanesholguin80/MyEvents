import { describe, expect, it } from "vitest";
import { EVENT_TRANSITIONS } from "@/features/events/types";
import type { EventStatus } from "@/features/events/types";

// Tabla-espejo de `ALLOWED_TRANSITIONS` en
// `backend/app/services/event_service.py` (§2.4 del plan). Un cambio
// accidental aquí rompería qué botones de transición se muestran en
// EventActions, así que se verifica como tabla exhaustiva de los 4 estados
// en vez de un par de asserts sueltos.
const EXPECTED_TRANSITIONS: Record<EventStatus, EventStatus[]> = {
  draft: ["published"],
  published: ["cancelled", "finished"],
  cancelled: [],
  finished: [],
};

describe("EVENT_TRANSITIONS", () => {
  it.each(Object.entries(EXPECTED_TRANSITIONS) as [EventStatus, EventStatus[]][])(
    "exposes exactly %s -> %j",
    (status, expected) => {
      expect(EVENT_TRANSITIONS[status]).toEqual(expected);
    },
  );

  it("marks cancelled and finished as terminal (no outgoing transitions)", () => {
    expect(EVENT_TRANSITIONS.cancelled).toHaveLength(0);
    expect(EVENT_TRANSITIONS.finished).toHaveLength(0);
  });

  it("covers exactly the 4 known statuses, no more, no less", () => {
    expect(Object.keys(EVENT_TRANSITIONS).sort()).toEqual(
      ["cancelled", "draft", "finished", "published"].sort(),
    );
  });
});
