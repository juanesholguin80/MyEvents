import { describe, expect, it } from "vitest";
import { createSessionFormSchema } from "@/features/sessions/schemas";

const EVENT = {
  start_date: "2026-11-01T09:00:00Z",
  end_date: "2026-11-01T18:00:00Z",
  capacity: 10,
};

const validSession = {
  speaker_id: 1,
  title: "Charla de cierre",
  description: "Resumen del evento.",
  start_time: "2026-11-01T13:00:00Z",
  end_time: "2026-11-01T14:00:00Z",
  capacity: 5,
};

describe("createSessionFormSchema", () => {
  const schema = createSessionFormSchema(EVENT);

  it("accepts a session fully inside the event's range and under its capacity", () => {
    expect(schema.safeParse(validSession).success).toBe(true);
  });

  it("accepts a session without a description (optional field)", () => {
    const { description: _description, ...withoutDescription } = validSession;
    expect(schema.safeParse(withoutDescription).success).toBe(true);
  });

  it("rejects a missing speaker_id", () => {
    const result = schema.safeParse({ ...validSession, speaker_id: undefined });
    expect(result.success).toBe(false);
  });

  it("rejects an empty title", () => {
    const result = schema.safeParse({ ...validSession, title: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === "title")).toBe(true);
    }
  });

  it("rejects end_time equal to start_time", () => {
    const result = schema.safeParse({
      ...validSession,
      start_time: "2026-11-01T13:00:00Z",
      end_time: "2026-11-01T13:00:00Z",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === "end_time")).toBe(true);
    }
  });

  it("rejects a start_time before the event's start_date", () => {
    const result = schema.safeParse({
      ...validSession,
      start_time: "2026-11-01T00:00:00Z",
      end_time: "2026-11-01T14:00:00Z",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === "start_time")).toBe(true);
    }
  });

  it("rejects an end_time after the event's end_date", () => {
    const result = schema.safeParse({
      ...validSession,
      start_time: "2026-11-01T17:00:00Z",
      end_time: "2026-11-01T20:00:00Z",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === "end_time")).toBe(true);
    }
  });

  it("rejects a capacity greater than the event's capacity", () => {
    const result = schema.safeParse({ ...validSession, capacity: 11 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === "capacity")).toBe(true);
    }
  });

  it("rejects capacity <= 0", () => {
    const result = schema.safeParse({ ...validSession, capacity: 0 });
    expect(result.success).toBe(false);
  });
});
