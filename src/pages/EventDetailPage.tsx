import { useEffect, useRef } from "react";
import { AxiosError } from "axios";
import Calendar from "lucide-react/dist/esm/icons/calendar";
import MapPin from "lucide-react/dist/esm/icons/map-pin";
import Users from "lucide-react/dist/esm/icons/users";
import { useParams } from "react-router-dom";
import { EventStatusBadge } from "@/components/events/EventStatusBadge";
import { SessionList } from "@/components/sessions/SessionList";
import { Skeleton } from "@/components/ui/Skeleton";
import { useEvent } from "@/features/events/hooks";
import { useSessionsByEvent } from "@/features/sessions/hooks";
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

  // Queries hermanas desde el primer render: ninguna depende de la otra
  // (sessionsQuery solo necesita el id de la URL, no el event ya resuelto).
  const eventQuery = useEvent(eventId);
  const sessionsQuery = useSessionsByEvent(eventId);

  const isNotFound = !isValidId || isNotFoundError(eventQuery.error);

  if (isNotFound) {
    return <NotFoundPage />;
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
          {/* Registro de asistentes y botones de gestión (editar/publicar/
             cancelar/finalizar) llegan en Fase 4/6 — placeholder visual only. */}
          <p className="text-sm italic text-gray-500">
            El registro de asistentes y la gestión de este evento estarán disponibles
            próximamente.
          </p>
        </section>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-gray-900">Sesiones</h2>
        <SessionList
          sessions={sessionsQuery.data?.items ?? []}
          isLoading={sessionsQuery.isLoading}
          isError={sessionsQuery.isError}
        />
      </section>
    </div>
  );
}
