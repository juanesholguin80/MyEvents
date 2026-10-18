import type { EventStatus } from "@/features/events/types";
import type { RegistrationWithEventRead } from "@/features/registrations/types";

/**
 * Única implementación de la regla crítica de §2.4 del plan: cancelar un
 * evento NO cambia el `status` de los `Registration` ya confirmados a él,
 * así que `registration.status` puede seguir en "confirmed" con el evento
 * ya cancelado/finalizado. Cualquier pantalla que lea
 * `RegistrationWithEventRead` (hoy `ProfilePage`, a futuro cualquier otra)
 * debe mostrar siempre el resultado de este helper — leer `event.status`
 * embebido — y nunca `registration.status` directamente.
 */
export function getDisplayStatus(registration: RegistrationWithEventRead): EventStatus {
  return registration.event.status;
}
