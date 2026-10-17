import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Correo inválido"),
  password: z.string().min(1, "La contraseña es obligatoria"),
});
export type LoginFormValues = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  email: z.string().email("Correo inválido"),
  password: z.string().min(8, "Debe tener al menos 8 caracteres"),
  full_name: z.string().min(1, "El nombre es obligatorio"),
});
export type RegisterFormValues = z.infer<typeof registerSchema>;
