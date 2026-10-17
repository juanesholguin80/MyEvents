import { z } from "zod";

// Espejo de `EventCreate.model_validator` (§4.3 del plan): `end_date` debe
// ser estrictamente posterior a `start_date`, y `capacity` es un entero
// positivo (`Field(gt=0)` en el backend). Los campos de fecha aquí son los
// valores crudos de un input `datetime-local` (string local, sin offset);
// la conversión a ISO con offset ocurre en `EventForm` justo antes de
// enviar, no en este schema.
export const eventFormSchema = z
  .object({
    name: z.string().min(1, "El nombre es obligatorio"),
    description: z.string().optional(),
    location: z.string().min(1, "La ubicación es obligatoria"),
    start_date: z.string().min(1, "Requerido"),
    end_date: z.string().min(1, "Requerido"),
    capacity: z.coerce.number().int().positive("Debe ser mayor a 0"),
  })
  .refine((data) => new Date(data.end_date) > new Date(data.start_date), {
    message: "La fecha fin no puede ser menor o igual a la fecha de inicio",
    path: ["end_date"],
  });

export type EventFormValues = z.infer<typeof eventFormSchema>;
