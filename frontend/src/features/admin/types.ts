import type { Role } from "@/features/auth/types";

/**
 * `UserRead`/`Role` ya están definidos en `features/auth/types.ts` (§2.3 y
 * §2.2 del plan) — no se duplican aquí. Lo único específico de este feature
 * es la lista de opciones del `<Select>` de rol en `AdminUsersPage`, con los
 * 3 valores en español exactos de `Role` (mismo principio que
 * `EVENT_TRANSITIONS` en `features/events/types.ts`: una tabla estática
 * única en vez de reimplementarla en cada componente que necesite las
 * opciones de rol).
 */
export const ROLE_OPTIONS: Array<{ value: Role; label: string }> = [
  { value: "admin", label: "Administrador" },
  { value: "organizador", label: "Organizador" },
  { value: "asistente", label: "Asistente" },
];
