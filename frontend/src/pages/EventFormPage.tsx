import { useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { EventForm } from "@/components/events/EventForm";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuthStore } from "@/features/auth/store";
import type { EventCreateInput } from "@/features/events/api";
import { useCreateEvent, useEvent, useUpdateEvent } from "@/features/events/hooks";
import { EVENT_TRANSITIONS } from "@/features/events/types";
import { isOwnerOrAdmin } from "@/features/events/utils";
import { messageForApiError, normalizeApiError } from "@/lib/errors";
import NotFoundPage from "@/pages/NotFoundPage";
import type { ApiError } from "@/types/api";

/**
 * Crear Y editar eventos con el mismo componente (§3 del plan): el modo se
 * resuelve por la presencia de `:id` en la URL, no por una prop de ruta.
 */
export default function EventFormPage() {
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [serverError, setServerError] = useState<ApiError | null>(null);

  const isEditMode = params.id !== undefined;
  const eventId = Number(params.id);
  const isValidId = isEditMode ? Number.isFinite(eventId) : false;

  // useEvent se llama siempre (reglas de hooks), pero solo queda habilitada
  // en modo editar con un id válido: en modo crear nunca dispara la query.
  const eventQuery = useEvent(isEditMode && isValidId ? eventId : NaN);
  const createMutation = useCreateEvent();
  const updateMutation = useUpdateEvent(eventId);

  if (isEditMode && !isValidId) {
    return <NotFoundPage />;
  }

  if (isEditMode && eventQuery.isLoading) {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-8">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isEditMode && eventQuery.isError) {
    return <NotFoundPage />;
  }

  const event = isEditMode ? eventQuery.data : undefined;

  // Defensa en profundidad (además del RoleGuard de ruta, que solo valida
  // rol): si el evento ya es terminal (sin transiciones salientes) o el
  // usuario no es dueño/admin, se redirige al detalle en vez de mostrar el
  // formulario.
  if (isEditMode && event) {
    const isTerminal = EVENT_TRANSITIONS[event.status].length === 0;
    if (isTerminal || !isOwnerOrAdmin(user, event)) {
      return <Navigate to={`/events/${event.id}`} replace />;
    }
  }

  function handleSubmit(values: EventCreateInput) {
    setServerError(null);

    if (isEditMode && event) {
      updateMutation.mutate(values, {
        onSuccess: (updated) => {
          toast.success("Evento actualizado.");
          navigate(`/events/${updated.id}`);
        },
        onError: (error) => {
          const apiError = normalizeApiError(error);
          setServerError(apiError);
          toast.error(messageForApiError(apiError));
        },
      });
      return;
    }

    createMutation.mutate(values, {
      onSuccess: (created) => {
        toast.success("Evento creado como borrador.");
        navigate(`/events/${created.id}`);
      },
      onError: (error) => {
        const apiError = normalizeApiError(error);
        setServerError(apiError);
        toast.error(messageForApiError(apiError));
      },
    });
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-8">
      <h1 className="text-2xl font-semibold text-gray-900">
        {isEditMode ? "Editar evento" : "Crear evento"}
      </h1>
      <EventForm
        mode={isEditMode ? "edit" : "create"}
        defaultValues={event}
        onSubmit={handleSubmit}
        isSubmitting={isEditMode ? updateMutation.isPending : createMutation.isPending}
        serverError={serverError}
      />
    </div>
  );
}
