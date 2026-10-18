import { z } from "zod";
import type { EventRead } from "@/features/events/types";

/**
 * Espejo de las reglas que valida el backend al crear/editar una sesión
 * (§2.4 del plan): el horario debe caer dentro de
 * `[event.start_date, event.end_date]` y el cupo no puede superar el cupo
 * del evento. El solapamiento de ponente (422 `SESSION_OVERLAP`) no se
 * puede replicar aquí sin conocer las demás sesiones del ponente, así que
 * ese caso queda para el 422 del servidor (manejado en
 * `SessionFormDialog` vía `normalizeApiError`).
 *
 * Es una función (no un objeto Zod fijo) porque el rango/cupo válidos
 * dependen del evento al que pertenece la sesión, que solo se conoce en
 * tiempo de render (ya cargado por `EventDetailPage`, §2.4 nota de
 * datetime-local).
 */
export function createSessionFormSchema(
  event: Pick<EventRead, "start_date" | "end_date" | "capacity">,
) {
  return z
    .object({
      speaker_id: z
        .number({ invalid_type_error: "Selecciona un ponente" })
        .int()
        .positive("Selecciona un ponente"),
      title: z.string().min(1, "El título es obligatorio"),
      description: z.string().optional(),
      start_time: z.string().min(1, "Requerido"),
      end_time: z.string().min(1, "Requerido"),
      capacity: z.coerce.number().int().positive("Debe ser mayor a 0"),
    })
    .refine((data) => new Date(data.end_time) > new Date(data.start_time), {
      message: "La hora de fin no puede ser menor o igual a la hora de inicio",
      path: ["end_time"],
    })
    .refine((data) => new Date(data.start_time) >= new Date(event.start_date), {
      message: "El inicio debe estar dentro del rango del evento",
      path: ["start_time"],
    })
    .refine((data) => new Date(data.end_time) <= new Date(event.end_date), {
      message: "El fin debe estar dentro del rango del evento",
      path: ["end_time"],
    })
    .refine((data) => data.capacity <= event.capacity, {
      message: "El cupo de la sesión no puede superar el cupo del evento",
      path: ["capacity"],
    });
}

export type SessionFormValues = z.infer<ReturnType<typeof createSessionFormSchema>>;
