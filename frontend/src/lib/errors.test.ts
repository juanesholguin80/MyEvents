import { AxiosError } from "axios";
import type { AxiosResponse } from "axios";
import { describe, expect, it, vi } from "vitest";
import type { UseFormSetError } from "react-hook-form";
import {
  applyApiErrorToForm,
  errorMessages,
  messageForApiError,
  normalizeApiError,
} from "@/lib/errors";
import type { ApiError } from "@/types/api";

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

  it("falls back to a generic error when the response body does not look like an ApiError", () => {
    const error = makeAxiosError(500, { message: "boom" });
    expect(normalizeApiError(error).code).toBe("UNKNOWN_ERROR");
  });
});

describe("messageForApiError", () => {
  // Cubre TODOS los códigos reales del catálogo (§2.4/Fase 1 del plan),
  // no solo uno — cada code debe resolver a su mensaje mapeado, nunca al
  // `detail` crudo del servidor.
  const knownCodes = Object.keys(errorMessages);

  it.each(knownCodes)("maps code %s to its catalog message, not the raw detail", (code) => {
    const apiError: ApiError = { detail: "mensaje crudo del servidor", code, fields: null };
    expect(messageForApiError(apiError)).toBe(errorMessages[code]);
    expect(messageForApiError(apiError)).not.toBe(apiError.detail);
  });

  it("falls back to the raw detail for an unknown code", () => {
    const apiError: ApiError = {
      detail: "Un detalle que el backend inventó hoy.",
      code: "SOME_FUTURE_CODE",
      fields: null,
    };
    expect(messageForApiError(apiError)).toBe(apiError.detail);
  });
});

describe("applyApiErrorToForm", () => {
  it("maps each field in ApiError.fields to a form error via setError", () => {
    const setError = vi.fn() as UseFormSetError<{ name: string; capacity: string }>;
    const apiError: ApiError = {
      detail: "Datos inválidos.",
      code: "VALIDATION_ERROR",
      fields: { name: "El nombre es obligatorio.", capacity: "Debe ser mayor a 0." },
    };

    applyApiErrorToForm(setError, apiError);

    expect(setError).toHaveBeenCalledWith("name", {
      type: "server",
      message: "El nombre es obligatorio.",
    });
    expect(setError).toHaveBeenCalledWith("capacity", {
      type: "server",
      message: "Debe ser mayor a 0.",
    });
    expect(setError).toHaveBeenCalledTimes(2);
  });

  it("does nothing when fields is null", () => {
    const setError = vi.fn() as UseFormSetError<{ name: string }>;
    const apiError: ApiError = { detail: "Ya estás registrado", code: "ALREADY_REGISTERED", fields: null };

    applyApiErrorToForm(setError, apiError);

    expect(setError).not.toHaveBeenCalled();
  });
});
