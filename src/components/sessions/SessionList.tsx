import Clock from "lucide-react/dist/esm/icons/clock";
import { Skeleton } from "@/components/ui/Skeleton";
import type { SessionRead } from "@/features/sessions/types";

interface SessionListProps {
  sessions: SessionRead[];
  isLoading: boolean;
  isError: boolean;
}

const timeFormatter = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "medium",
  timeStyle: "short",
});

/**
 * Lista de solo lectura para Fase 3 (usada dentro de EventDetailPage).
 * Puramente presentacional: recibe los datos ya resueltos, no llama a
 * useSessionsByEvent directamente. Fase 5 la expandirá con gestión
 * (editar/borrar) y paginación propia.
 */
export function SessionList({ sessions, isLoading, isError }: SessionListProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <p role="alert" className="text-sm text-red-600">
        No se pudieron cargar las sesiones. Intenta de nuevo.
      </p>
    );
  }

  if (sessions.length === 0) {
    return <p className="text-sm text-gray-600">Este evento aún no tiene sesiones.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {sessions.map((session) => (
        <li
          key={session.id}
          className="flex flex-col gap-1 rounded-md border border-gray-200 p-3"
        >
          <p className="font-medium text-gray-900">{session.title}</p>
          <p className="flex items-center gap-1.5 text-sm text-gray-600">
            <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
            {timeFormatter.format(new Date(session.start_time))} —{" "}
            {timeFormatter.format(new Date(session.end_time))}
          </p>
          {session.description ? (
            <p className="text-sm text-gray-600">{session.description}</p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
