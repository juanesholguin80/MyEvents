import { describe, expect, it } from "vitest";
import { eventFormSchema } from "@/features/events/schemas";

const validEvent = {
  name: "Conferencia de Tecnología",
  description: "Charlas sobre IA.",
  location: "Bogotá, Colombia",
  start_date: "2026-11-01T09:00",
  end_date: "2026-11-01T18:00",
  capacity: 10,
};

describe("eventFormSchema", () => {
  it("accepts a fully valid event", () => {
    expect(eventFormSchema.safeParse(validEvent).success).toBe(true);
  });

  it("accepts an event without a description (optional field)", () => {
    const { description: _description, ...withoutDescription } = validEvent;
    expect(eventFormSchema.safeParse(withoutDescription).success).toBe(true);
  });

  it("rejects an empty name", () => {
    const result = eventFormSchema.safeParse({ ...validEvent, name: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === "name")).toBe(true);
    }
  });

  it("rejects an empty location", () => {
    const result = eventFormSchema.safeParse({ ...validEvent, location: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === "location")).toBe(true);
    }
  });

  it("rejects capacity <= 0 (espejo de Field(gt=0) del backend)", () => {
    const result = eventFormSchema.safeParse({ ...validEvent, capacity: 0 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === "capacity")).toBe(true);
    }
  });

  it("rejects a non-integer capacity", () => {
    const result = eventFormSchema.safeParse({ ...validEvent, capacity: 1.5 });
    expect(result.success).toBe(false);
  });

  it("rejects end_date equal to start_date (espejo de EventCreate.model_validator)", () => {
    const result = eventFormSchema.safeParse({
      ...validEvent,
      start_date: "2026-11-01T09:00",
      end_date: "2026-11-01T09:00",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === "end_date")).toBe(true);
    }
  });

  it("rejects end_date earlier than start_date", () => {
    const result = eventFormSchema.safeParse({
      ...validEvent,
      start_date: "2026-11-01T18:00",
      end_date: "2026-11-01T09:00",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a missing start_date", () => {
    const result = eventFormSchema.safeParse({ ...validEvent, start_date: "" });
    expect(result.success).toBe(false);
  });
});
