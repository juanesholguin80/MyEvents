import Clock from "lucide-react/dist/esm/icons/clock";
import Pencil from "lucide-react/dist/esm/icons/pencil";
import Trash2 from "lucide-react/dist/esm/icons/trash-2";
import { useMemo } from "react";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import type { SessionRead } from "@/features/sessions/types";
import type { SpeakerRead } from "@/features/speakers/types";

interface SessionListProps {
  sessions: SessionRead[];
  speakers: SpeakerRead[];
  isLoading: boolean;
  isError: boolean;
  canManage: boolean;
  onEdit?: (session: SessionRead) => void;
  onDelete?: (session: SessionRead) => void;
}

const timeFormatter = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "medium",
  timeStyle: "short",
});

/**
 * Lista de sesiones usada dentro de `EventDetailPage` (Fase 3: solo
 * lectura; Fase 5: añade resolución de ponente + gestión). Puramente
 * presentacional: recibe `sessions` y `speakers` ya resueltos (no llama a
 * `useSessionsByEvent`/`useSpeakers` por sí mismo — es la página la que
 * decide cargar, §1 del plan).
 *
 * §5: el nombre del ponente de cada sesión se resuelve con un `Map`
 * memoizado construido una sola vez por cambio de `speakers`, nunca con
 * `.find()` por sesión dentro del `.map()` de render (evitaría un costo
 * O(n·m) en listas grandes de sesiones/ponentes).
 */
export function SessionList({
  sessions,
  speakers,
  isLoading,
  isError,
  canManage,
  onEdit,
  onDelete,
}: SessionListProps) {
  const speakerById = useMemo(
    () => new Map(speakers.map((speaker) => [speaker.id, speaker])),
    [speakers],
  );

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
      {sessions.map((session) => {
        const speaker = speakerById.get(session.speaker_id);
        return (
          <li
            key={session.id}
            className="flex flex-col gap-1 rounded-md border border-gray-200 p-3"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium text-gray-900">{session.title}</p>
              {canManage ? (
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="Editar sesión"
                    onClick={() => onEdit?.(session)}
                  >
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="Borrar sesión"
                    onClick={() => onDelete?.(session)}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              ) : null}
            </div>
            <p className="text-sm text-gray-600">
              Ponente: {speaker ? speaker.full_name : "Desconocido"}
            </p>
            <p className="flex items-center gap-1.5 text-sm text-gray-600">
              <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
              {timeFormatter.format(new Date(session.start_time))} —{" "}
              {timeFormatter.format(new Date(session.end_time))}
            </p>
            {session.description ? (
              <p className="text-sm text-gray-600">{session.description}</p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
