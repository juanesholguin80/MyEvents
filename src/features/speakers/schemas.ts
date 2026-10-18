import { z } from "zod";

// Espejo de `SpeakerCreate` (app/schemas/speaker.py, §2.4 del plan):
// `full_name` y `email` obligatorios, `bio` opcional. `SpeakerUpdate`
// comparte el mismo shape de campos (todos editables), por eso un solo
// schema sirve para crear y editar — a diferencia de eventos, el backend
// no tiene un `model_validator` cruzado entre campos para ponentes.
export const speakerFormSchema = z.object({
  full_name: z.string().min(1, "El nombre es obligatorio"),
  bio: z.string().optional(),
  email: z.string().min(1, "El correo es obligatorio").email("Correo inválido"),
});

export type SpeakerFormValues = z.infer<typeof speakerFormSchema>;
