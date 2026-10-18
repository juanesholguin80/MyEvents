import { describe, expect, it } from "vitest";
import { speakerFormSchema } from "@/features/speakers/schemas";

const validSpeaker = {
  full_name: "Ana Pérez",
  bio: "Experta en inteligencia artificial.",
  email: "ana@example.com",
};

describe("speakerFormSchema", () => {
  it("accepts a fully valid speaker", () => {
    expect(speakerFormSchema.safeParse(validSpeaker).success).toBe(true);
  });

  it("accepts a speaker without a bio (optional field)", () => {
    const { bio: _bio, ...withoutBio } = validSpeaker;
    expect(speakerFormSchema.safeParse(withoutBio).success).toBe(true);
  });

  it("rejects an empty full_name", () => {
    const result = speakerFormSchema.safeParse({ ...validSpeaker, full_name: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === "full_name")).toBe(true);
    }
  });

  it("rejects an empty email", () => {
    const result = speakerFormSchema.safeParse({ ...validSpeaker, email: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === "email")).toBe(true);
    }
  });

  it("rejects an invalid email format", () => {
    const result = speakerFormSchema.safeParse({ ...validSpeaker, email: "not-an-email" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === "email")).toBe(true);
    }
  });
});
