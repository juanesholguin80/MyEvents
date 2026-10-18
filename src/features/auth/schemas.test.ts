import { describe, expect, it } from "vitest";
import { loginSchema, registerSchema } from "@/features/auth/schemas";

describe("loginSchema", () => {
  it("accepts a valid email and a non-empty password", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
      password: "anything",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid email", () => {
    const result = loginSchema.safeParse({ email: "not-an-email", password: "x" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["email"]);
    }
  });

  it("rejects an empty password", () => {
    const result = loginSchema.safeParse({ email: "user@example.com", password: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["password"]);
    }
  });

  it("does not enforce a minimum password length (backend has no such rule for login)", () => {
    const result = loginSchema.safeParse({ email: "user@example.com", password: "a" });
    expect(result.success).toBe(true);
  });
});

describe("registerSchema", () => {
  it("accepts a valid email, 8+ char password, and non-empty name", () => {
    const result = registerSchema.safeParse({
      email: "user@example.com",
      password: "AlgoSeguro123",
      full_name: "Usuario Nuevo",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a password shorter than 8 characters (UX-only client rule, §2.4)", () => {
    const result = registerSchema.safeParse({
      email: "user@example.com",
      password: "short1",
      full_name: "Usuario Nuevo",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["password"]);
    }
  });

  it("rejects an empty full_name", () => {
    const result = registerSchema.safeParse({
      email: "user@example.com",
      password: "AlgoSeguro123",
      full_name: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["full_name"]);
    }
  });

  it("rejects an invalid email", () => {
    const result = registerSchema.safeParse({
      email: "invalid",
      password: "AlgoSeguro123",
      full_name: "Usuario Nuevo",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["email"]);
    }
  });
});
