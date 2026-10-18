import { AxiosError } from "axios";
import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import type { ApiError } from "@/types/api";

export const errorMessages: Record<string, string> = {
  EMAIL_ALREADY_EXISTS: "Ya existe una cuenta registrada con ese correo.",
  INVALID_CREDENTIALS: "Correo o contraseña incorrectos.",
  INVALID_TOKEN: "Tu sesión expiró. Inicia sesión de nuevo.",
  INSUFFICIENT_ROLE: "No tienes permisos para realizar esta acción.",
  EVENT_NOT_FOUND: "El evento no existe.",
  EVENT_FORBIDDEN: "No tienes permisos sobre este evento.",
  INVALID_EVENT_STATE: "El evento no se puede modificar en su estado actual.",
  INVALID_EVENT_DATA: "Los datos del evento no son válidos.",
  EVENT_NOT_PUBLISHED: "El evento no está publicado.",
  ALREADY_REGISTERED: "Ya estás registrado en este evento.",
  EVENT_FULL: "El evento no tiene cupo disponible.",
  REGISTRATION_NOT_FOUND: "No se encontró tu registro para este evento.",
  SESSION_NOT_FOUND: "La sesión no existe.",
  INVALID_SESSION_DATA: "Los datos de la sesión no son válidos.",
  SESSION_OVERLAP: "El ponente ya tiene una sesión en ese horario.",
  SPEAKER_NOT_FOUND: "El ponente no existe.",
  SPEAKER_IN_USE: "No se puede eliminar: el ponente tiene sesiones asociadas.",
  USER_NOT_FOUND: "El usuario no existe.",
  CANNOT_MODIFY_SELF: "No puedes modificar tu propia cuenta de administrador.",
  VALIDATION_ERROR: "Hay errores de validación en el formulario.",
};

const FALLBACK_ERROR: ApiError = {
  detail: "Ocurrió un error inesperado. Intenta de nuevo.",
  code: "UNKNOWN_ERROR",
  fields: null,
};

function isApiErrorShape(value: unknown): value is ApiError {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Record<string, unknown>).detail === "string" &&
    typeof (value as Record<string, unknown>).code === "string"
  );
}

export function normalizeApiError(error: unknown): ApiError {
  if (error instanceof AxiosError && isApiErrorShape(error.response?.data)) {
    const data = error.response.data;
    return {
      detail: data.detail,
      code: data.code,
      fields: data.fields ?? null,
    };
  }
  return FALLBACK_ERROR;
}

export function messageForApiError(error: ApiError): string {
  return errorMessages[error.code] ?? error.detail;
}

export function applyApiErrorToForm<T extends FieldValues>(
  setError: UseFormSetError<T>,
  apiError: ApiError,
) {
  if (!apiError.fields) return;
  for (const [field, message] of Object.entries(apiError.fields)) {
    setError(field as Path<T>, { type: "server", message });
  }
}
