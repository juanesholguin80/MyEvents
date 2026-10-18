import { useState } from "react";
import LogIn from "lucide-react/dist/esm/icons/log-in";
import UserPlus from "lucide-react/dist/esm/icons/user-plus";
import UserX from "lucide-react/dist/esm/icons/user-x";
import { Link, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useAuthStore } from "@/features/auth/store";
import type { EventRead } from "@/features/events/types";
import {
  useCancelRegistration,
  useMyRegistrations,
  useRegisterToEvent,
} from "@/features/registrations/hooks";
import { messageForApiError, normalizeApiError } from "@/lib/errors";
import { cn } from "@/lib/cn";

interface EventRegistrationActionProps {
  event: EventRead;
}

// §8 del plan (riesgos e incógnitas): `EventRead` no expone cupo restante
// (no hay `registered_count`/`available_capacity`), así que "sin cupo"
// nunca se anticipa en el cliente — se descubre al intentar registrarse
// (400 `EVENT_FULL`) y se refleja con un toast, no con un cuarto estado de
// botón distinto a "Registrarme".
//
// Para saber si el usuario YA está registrado a este evento puntual, sin
// un endpoint dedicado tipo `GET /events/{id}/my-registration`, se consulta
// `GET /me/registrations` con `page_size = 100` (asumiendo que un asistente
// normal no acumula cientos de registros activos — límite documentado, no
// se pagina manualmente para encontrar una sola fila) y se busca `event.id`
// entre los items con `status: "confirmed"`.
const MY_REGISTRATIONS_CHECK_PAGE_SIZE = 100;

/**
 * Botón de registro de asistentes en `EventDetailPage` (§6 del plan),
 * reemplazando el placeholder de fases previas. Cubre los 4 estados:
 * 1. No autenticado → CTA a `/login?redirect=<ruta actual>`.
 * 2. Autenticado, evento publicado, sin registro previo → "Registrarme".
 * 3. Autenticado, evento publicado, ya registrado → "Cancelar registro"
 *    (con `Modal` de confirmación, mismo patrón que `EventActions`).
 * 4. Evento sin cupo → no es un estado visual distinto, se descubre al
 *    intentar registrarse (ver comentario de `MY_REGISTRATIONS_CHECK_PAGE_SIZE`).
 *
 * Regla crítica de §2.4: si el evento ya no está publicado (p. ej. fue
 * cancelado después de que el usuario se registró), no se ofrece ni
 * "Registrarme" ni "Cancelar registro" — el estado se deriva siempre de
 * `event.status`, nunca de un `registration.status` embebido que pudo
 * quedar desactualizado.
 */
export function EventRegistrationAction({ event }: EventRegistrationActionProps) {
  const location = useLocation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [isConfirmingCancel, setIsConfirmingCancel] = useState(false);

  const isPublished = event.status === "published";

  // Se llama siempre (reglas de hooks), pero solo dispara la request si
  // hay sesión y el evento sigue publicado — igual que `useSpeakers(...,
  // { enabled })` en esta misma página para visitantes anónimos.
  const myRegistrationsQuery = useMyRegistrations(1, MY_REGISTRATIONS_CHECK_PAGE_SIZE, {
    enabled: isAuthenticated && isPublished,
  });
  const registerMutation = useRegisterToEvent(event.id);
  const cancelMutation = useCancelRegistration();

  if (!isAuthenticated) {
    const redirect = encodeURIComponent(`${location.pathname}${location.search}`);
    return (
      <Link
        to={`/login?redirect=${redirect}`}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-md px-3.5 py-2 text-sm font-semibold shadow-sm transition-colors",
          "bg-indigo-600 text-white hover:bg-indigo-500",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600",
        )}
      >
        <LogIn className="h-4 w-4" aria-hidden="true" />
        Inicia sesión para registrarte
      </Link>
    );
  }

  if (!isPublished) {
    return null;
  }

  const activeRegistration = myRegistrationsQuery.data?.items.find(
    (registration) => registration.event.id === event.id && registration.status === "confirmed",
  );

  function handleRegister() {
    registerMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success("Te registraste al evento.");
      },
      onError: (error) => {
        toast.error(messageForApiError(normalizeApiError(error)));
      },
    });
  }

  function handleConfirmCancel() {
    cancelMutation.mutate(event.id, {
      onSuccess: () => {
        toast.success("Tu registro fue cancelado.");
        setIsConfirmingCancel(false);
      },
      onError: (error) => {
        toast.error(messageForApiError(normalizeApiError(error)));
        setIsConfirmingCancel(false);
      },
    });
  }

  if (activeRegistration) {
    return (
      <>
        <Button variant="secondary" size="sm" onClick={() => setIsConfirmingCancel(true)}>
          <UserX className="h-4 w-4" aria-hidden="true" />
          Cancelar registro
        </Button>

        <Modal
          open={isConfirmingCancel}
          onOpenChange={(open) => {
            if (!open) setIsConfirmingCancel(false);
          }}
          title="¿Cancelar tu registro?"
          description="Perderás tu cupo en este evento. Podrás volver a registrarte más tarde mientras haya cupo disponible."
        >
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setIsConfirmingCancel(false)}>
              Volver
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleConfirmCancel}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? "Procesando..." : "Confirmar"}
            </Button>
          </div>
        </Modal>
      </>
    );
  }

  return (
    <Button
      variant="primary"
      size="sm"
      onClick={handleRegister}
      disabled={registerMutation.isPending || myRegistrationsQuery.isLoading}
    >
      <UserPlus className="h-4 w-4" aria-hidden="true" />
      {registerMutation.isPending ? "Registrando..." : "Registrarme"}
    </Button>
  );
}
