import { AxiosError } from "axios";
import type { AxiosResponse } from "axios";
import { describe, expect, it } from "vitest";
import { normalizeApiError } from "@/lib/errors";

function makeAxiosError(status: number, data: unknown): AxiosError {
  const error = new AxiosError("Request failed");
  error.response = {
    data,
    status,
    statusText: "",
    headers: {},
    config: {} as AxiosResponse["config"],
  } as AxiosResponse;
  return error;
}

describe("normalizeApiError", () => {
  it("maps a 422 response with field errors to an ApiError", () => {
    const error = makeAxiosError(422, {
      detail: "Validation error",
      code: "VALIDATION_ERROR",
      fields: { end_date: "La fecha fin no puede ser menor a la fecha de inicio" },
    });

    const result = normalizeApiError(error);

    expect(result).toEqual({
      detail: "Validation error",
      code: "VALIDATION_ERROR",
      fields: { end_date: "La fecha fin no puede ser menor a la fecha de inicio" },
    });
  });

  it("defaults fields to null when the backend omits it", () => {
    const error = makeAxiosError(409, {
      detail: "Ya estás registrado",
      code: "ALREADY_REGISTERED",
    });

    expect(normalizeApiError(error).fields).toBeNull();
  });

  it("falls back to a generic error for non-API errors", () => {
    expect(normalizeApiError(new Error("network down")).code).toBe("UNKNOWN_ERROR");
  });
});
