import { useState } from "react";
import Trash2 from "lucide-react/dist/esm/icons/trash-2";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useAuthStore } from "@/features/auth/store";
import { cn } from "@/lib/cn";
import {
  useCancelEvent,
  useDeleteEvent,
  useFinishEvent,
  usePublishEvent,
} from "@/features/events/hooks";
import { EVENT_TRANSITIONS } from "@/features/events/types";
import type { EventRead, EventStatus } from "@/features/events/types";
import { isOwnerOrAdmin } from "@/features/events/utils";
import { messageForApiError, normalizeApiError } from "@/lib/errors";

interface EventActionsProps {
  event: EventRead;
}

type PendingAction = "publish" | "cancel" | "finish" | "delete" | null;

interface TransitionButtonConfig {
  target: EventStatus;
  label: string;
  confirmTitle: string;
  confirmDescription: string;
  action: Exclude<PendingAction, null>;
}

// Indexado por el estado destino de la transición (`EVENT_TRANSITIONS`
// devuelve estados destino), con la acción equivalente embebida para poder
// indexar también por acción (`ACTION_CONFIG` abajo) sin repetir los textos.
const TARGET_CONFIG: Record<"published" | "cancelled" | "finished", TransitionButtonConfig> = {
  published: {
    target: "published",
    label: "Publicar",
    confirmTitle: "¿Publicar este evento?",
    confirmDescription: "El evento quedará visible públicamente para cualquier visitante.",
    action: "publish",
  },
  cancelled: {
    target: "cancelled",
    label: "Cancelar evento",
    confirmTitle: "¿Cancelar este evento?",
    confirmDescription:
      "Esta acción es irreversible: el evento quedará cancelado y no podrá publicarse de nuevo.",
    action: "cancel",
  },
  finished: {
    target: "finished",
    label: "Finalizar evento",
    confirmTitle: "¿Finalizar este evento?",
    confirmDescription: "Esta acción es irreversible: el evento quedará marcado como finalizado.",
    action: "finish",
  },
};

const ACTION_CONFIG: Record<"publish" | "cancel" | "finish", TransitionButtonConfig> = {
  publish: TARGET_CONFIG.published,
  cancel: TARGET_CONFIG.cancelled,
  finish: TARGET_CONFIG.finished,
};

/**
 * Botones de gestión de un evento (editar/publicar/cancelar/finalizar/
 * borrar). Se auto-protege con `isOwnerOrAdmin` (no renderiza nada si el
 * usuario actual no es dueño ni admin) para que `EventDetailPage` pueda
 * montarlo incondicionalmente y para que se pueda probar en aislamiento
 * (§6 del plan: test de que no renderiza ningún botón si !isOwnerOrAdmin).
 * Los botones de transición se calculan desde `EVENT_TRANSITIONS`, nunca
 * mostrando los cuatro y dejando que el 409 los filtre.
 */
export function EventActions({ event }: EventActionsProps) {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  const publishMutation = usePublishEvent(event.id);
  const cancelMutation = useCancelEvent(event.id);
  const finishMutation = useFinishEvent(event.id);
  const deleteMutation = useDeleteEvent(event.id);

  if (!isOwnerOrAdmin(user, event)) {
    return null;
  }

  const nextStatuses = EVENT_TRANSITIONS[event.status];
  const isTerminal = nextStatuses.length === 0;

  const transitionButtons = nextStatuses
    .map((target) => (target === "draft" ? null : TARGET_CONFIG[target]))
    .filter((config): config is TransitionButtonConfig => config !== null);

  function mutationFor(action: Exclude<PendingAction, null>) {
    switch (action) {
      case "publish":
        return publishMutation;
      case "cancel":
        return cancelMutation;
      case "finish":
        return finishMutation;
      case "delete":
        return deleteMutation;
    }
  }

  function handleConfirm() {
    if (!pendingAction) return;
    const action = pendingAction;

    if (action === "delete") {
      deleteMutation.mutate(undefined, {
        onSuccess: () => {
          toast.success("Evento eliminado.");
          setPendingAction(null);
          navigate("/");
        },
        onError: (error) => {
          const apiError = normalizeApiError(error);
          toast.error(messageForApiError(apiError));
          setPendingAction(null);
        },
      });
      return;
    }

    const mutation = mutationFor(action);
    mutation.mutate(undefined, {
      onSuccess: () => {
        toast.success("El estado del evento se actualizó.");
        setPendingAction(null);
      },
      onError: (error) => {
        const apiError = normalizeApiError(error);
        toast.error(messageForApiError(apiError));
        setPendingAction(null);
      },
    });
  }

  const activeConfig =
    pendingAction && pendingAction !== "delete" ? ACTION_CONFIG[pendingAction] : null;

  const isConfirming =
    pendingAction !== null &&
    (pendingAction === "delete" ? deleteMutation.isPending : mutationFor(pendingAction).isPending);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {!isTerminal ? (
        <Link
          to={`/events/${event.id}/edit`}
          className={cn(
            "inline-flex items-center justify-center gap-2 rounded-md px-2.5 py-1.5 text-sm font-semibold shadow-sm transition-colors",
            "bg-white text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400",
          )}
        >
          Editar
        </Link>
      ) : null}

      {transitionButtons.map((config) => (
        <Button
          key={config.action}
          variant="secondary"
          size="sm"
          onClick={() => setPendingAction(config.action)}
        >
          {config.label}
        </Button>
      ))}

      {!isTerminal ? (
        <Button
          variant="danger"
          size="sm"
          onClick={() => setPendingAction("delete")}
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          Borrar
        </Button>
      ) : null}

      <Modal
        open={pendingAction !== null}
        onOpenChange={(open) => {
          if (!open) setPendingAction(null);
        }}
        title={
          pendingAction === "delete"
            ? "¿Eliminar este evento?"
            : activeConfig?.confirmTitle ?? ""
        }
        description={
          pendingAction === "delete"
            ? "Esta acción es irreversible: el evento se eliminará permanentemente."
            : activeConfig?.confirmDescription
        }
      >
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={() => setPendingAction(null)}>
            Cancelar
          </Button>
          <Button
            variant={pendingAction === "delete" ? "danger" : "primary"}
            size="sm"
            onClick={handleConfirm}
            disabled={isConfirming}
          >
            {isConfirming ? "Procesando..." : "Confirmar"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
