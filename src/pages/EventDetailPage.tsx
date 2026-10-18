import { useEffect, useRef, useState } from "react";
import { AxiosError } from "axios";
import Calendar from "lucide-react/dist/esm/icons/calendar";
import MapPin from "lucide-react/dist/esm/icons/map-pin";
import Plus from "lucide-react/dist/esm/icons/plus";
import Users from "lucide-react/dist/esm/icons/users";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { EventActions } from "@/components/events/EventActions";
import { EventStatusBadge } from "@/components/events/EventStatusBadge";
import { SessionFormDialog } from "@/components/sessions/SessionFormDialog";
import { SessionList } from "@/components/sessions/SessionList";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuthStore } from "@/features/auth/store";
import { useEvent } from "@/features/events/hooks";
import { isOwnerOrAdmin } from "@/features/events/utils";
import { useDeleteSession, useSessionsByEvent } from "@/features/sessions/hooks";
import type { SessionRead } from "@/features/sessions/types";
import { useSpeakers } from "@/features/speakers/hooks";
import { messageForApiError, normalizeApiError } from "@/lib/errors";
import NotFoundPage from "@/pages/NotFoundPage";

const dateFormatter = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "medium",
  timeStyle: "short",
});

function isNotFoundError(error: unknown): boolean {
  return error instanceof AxiosError && error.response?.status === 404;
}

export default function EventDetailPage() {
  const params = useParams<{ id: string }>();
  const eventId = Number(params.id);
  const isValidId = Number.isFinite(eventId);

  const headingRef = useRef<HTMLHeadingElement>(null);

  // React Router no gestiona foco en navegación de cliente: lo movemos
  // manualmente al <h1> tras montar.
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // Queries hermanas desde el primer render: ninguna depende de la otra
  // (sessionsQuery solo necesita el id de la URL, no el event ya resuelto).
  const eventQuery = useEvent(eventId);
  const sessionsQuery = useSessionsByEvent(eventId);
  // GET /speakers exige autenticación (§2.4), a diferencia de GET /events —
  // se omite por completo para un visitante anónimo en vez de dejar que
  // falle con 401. Sin ponentes cargados, SessionList simplemente muestra
  // "Desconocido" como degradación aceptable.
  const speakersQuery = useSpeakers({ page_size: 100 }, { enabled: isAuthenticated });

  const [isCreateSessionOpen, setIsCreateSessionOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<SessionRead | null>(null);
  const [deletingSession, setDeletingSession] = useState<SessionRead | null>(null);
  const deleteSessionMutation = useDeleteSession(eventId);

  const isNotFound = !isValidId || isNotFoundError(eventQuery.error);

  if (isNotFound) {
    return <NotFoundPage />;
  }

  const event = eventQuery.data;
  // La sesión no tiene dueño propio: hereda el del evento padre (§6 del
  // plan). Reutiliza la única implementación de la regla, no la reimplementa.
  const canManageSessions = Boolean(event) && isOwnerOrAdmin(user, event!);

  function handleConfirmDeleteSession() {
    if (!deletingSession) return;
    deleteSessionMutation.mutate(deletingSession.id, {
      onSuccess: () => {
        toast.success("Sesión eliminada.");
        setDeletingSession(null);
      },
      onError: (error) => {
        const apiError = normalizeApiError(error);
        toast.error(messageForApiError(apiError));
        setDeletingSession(null);
      },
    });
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8">
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="text-2xl font-semibold text-gray-900 outline-none"
      >
        {eventQuery.data ? eventQuery.data.name : "Detalle del evento"}
      </h1>

      {eventQuery.isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ) : null}

      {eventQuery.isError && !isNotFound ? (
        <p role="alert" className="text-sm text-red-600">
          No se pudo cargar el evento. Intenta de nuevo.
        </p>
      ) : null}

      {eventQuery.data ? (
        <section className="flex flex-col gap-3">
          <EventStatusBadge status={eventQuery.data.status} />
          {eventQuery.data.description ? (
            <p className="text-sm text-gray-700">{eventQuery.data.description}</p>
          ) : null}
          <p className="flex items-center gap-1.5 text-sm text-gray-600">
            <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
            {eventQuery.data.location}
          </p>
          <p className="flex items-center gap-1.5 text-sm text-gray-600">
            <Calendar className="h-4 w-4 shrink-0" aria-hidden="true" />
            {dateFormatter.format(new Date(eventQuery.data.start_date))} —{" "}
            {dateFormatter.format(new Date(eventQuery.data.end_date))}
          </p>
          <p className="flex items-center gap-1.5 text-sm text-gray-600">
            <Users className="h-4 w-4 shrink-0" aria-hidden="true" />
            Cupo: {eventQuery.data.capacity}
          </p>
          {/* Botones de gestión (editar/publicar/cancelar/finalizar/borrar):
             EventActions se auto-protege con isOwnerOrAdmin, así que se
             monta incondicionalmente. El registro de asistentes llega en
             Fase 6 — se deja el placeholder tal como en Fase 3. */}
          <EventActions event={eventQuery.data} />
          <p className="text-sm italic text-gray-500">
            El registro de asistentes a este evento estará disponible próximamente.
          </p>
        </section>
      ) : null}

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-gray-900">Sesiones</h2>
          {canManageSessions ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsCreateSessionOpen(true)}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Agregar sesión
            </Button>
          ) : null}
        </div>
        <SessionList
          sessions={sessionsQuery.data?.items ?? []}
          speakers={speakersQuery.data?.items ?? []}
          isLoading={sessionsQuery.isLoading}
          isError={sessionsQuery.isError}
          canManage={canManageSessions}
          onEdit={(session) => setEditingSession(session)}
          onDelete={(session) => setDeletingSession(session)}
        />
      </section>

      {event ? (
        <>
          <SessionFormDialog
            mode="create"
            event={event}
            open={isCreateSessionOpen}
            onOpenChange={setIsCreateSessionOpen}
          />
          <SessionFormDialog
            mode="edit"
            event={event}
            session={editingSession ?? undefined}
            open={editingSession !== null}
            onOpenChange={(open) => {
              if (!open) setEditingSession(null);
            }}
          />
        </>
      ) : null}

      <Modal
        open={deletingSession !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingSession(null);
        }}
        title="¿Eliminar esta sesión?"
        description="Esta acción es irreversible: la sesión se eliminará permanentemente."
      >
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={() => setDeletingSession(null)}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={handleConfirmDeleteSession}
            disabled={deleteSessionMutation.isPending}
          >
            {deleteSessionMutation.isPending ? "Procesando..." : "Confirmar"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
