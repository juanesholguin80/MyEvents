import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { EventStatusBadge } from "@/components/events/EventStatusBadge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Pagination } from "@/components/ui/Pagination";
import { Skeleton } from "@/components/ui/Skeleton";
import { useCurrentUser } from "@/features/auth/hooks";
import type { Role } from "@/features/auth/types";
import { useCancelRegistration, useMyRegistrations } from "@/features/registrations/hooks";
import type { RegistrationWithEventRead } from "@/features/registrations/types";
import { getDisplayStatus } from "@/features/registrations/utils";
import { messageForApiError, normalizeApiError } from "@/lib/errors";

const PAGE_SIZE = 10;

const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrador",
  organizador: "Organizador",
  asistente: "Asistente",
};

const dateFormatter = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "medium",
  timeStyle: "short",
});

export default function ProfilePage() {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [page, setPage] = useState(1);
  const [cancelingRegistration, setCancelingRegistration] =
    useState<RegistrationWithEventRead | null>(null);

  const meQuery = useCurrentUser();
  const registrationsQuery = useMyRegistrations(page, PAGE_SIZE);
  const cancelMutation = useCancelRegistration();

  const registrations = registrationsQuery.data?.items ?? [];
  const hasRegistrations = registrations.length > 0;

  function handleConfirmCancel() {
    if (!cancelingRegistration) return;
    cancelMutation.mutate(cancelingRegistration.event.id, {
      onSuccess: () => {
        toast.success("Tu registro fue cancelado.");
        setCancelingRegistration(null);
      },
      onError: (error) => {
        toast.error(messageForApiError(normalizeApiError(error)));
        setCancelingRegistration(null);
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
        Mi perfil
      </h1>

      {meQuery.isLoading ? <Skeleton className="h-20 w-full" /> : null}

      {meQuery.data ? (
        <section className="flex flex-col gap-1 rounded-md border border-gray-200 p-4">
          <p className="text-base font-semibold text-gray-900">{meQuery.data.full_name}</p>
          <p className="text-sm text-gray-600">{meQuery.data.email}</p>
          <p className="text-sm text-gray-600">Rol: {ROLE_LABELS[meQuery.data.role]}</p>
        </section>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-gray-900">Mis eventos registrados</h2>

        {registrationsQuery.isLoading ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : null}

        {registrationsQuery.isError ? (
          <p role="alert" className="text-sm text-red-600">
            No se pudieron cargar tus registros. Intenta de nuevo.
          </p>
        ) : null}

        {!registrationsQuery.isLoading && !registrationsQuery.isError && !hasRegistrations ? (
          <p className="text-sm text-gray-600">Todavía no te has registrado a ningún evento.</p>
        ) : null}

        {hasRegistrations ? (
          <>
            <ul className="flex flex-col gap-2">
              {registrations.map((registration) => {
                // Regla crítica de §2.4 del plan: el estado mostrado se
                // deriva SIEMPRE del `event.status` embebido, nunca de
                // `registration.status` (que puede seguir "confirmed" sobre
                // un evento ya cancelado/finalizado — getDisplayStatus es la
                // única implementación de esta regla).
                const displayStatus = getDisplayStatus(registration);
                const canCancel = displayStatus === "published";

                return (
                  <li
                    key={registration.id}
                    className="flex flex-col gap-2 rounded-md border border-gray-200 p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex flex-col gap-1">
                      <Link
                        to={`/events/${registration.event.id}`}
                        className="font-medium text-gray-900 hover:text-indigo-600"
                      >
                        {registration.event.name}
                      </Link>
                      <p className="text-xs text-gray-500">
                        Registrado el{" "}
                        {dateFormatter.format(new Date(registration.registered_at))}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <EventStatusBadge status={displayStatus} />
                      {canCancel ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setCancelingRegistration(registration)}
                        >
                          Cancelar registro
                        </Button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
            <Pagination
              page={registrationsQuery.data!.page}
              pageSize={registrationsQuery.data!.page_size}
              total={registrationsQuery.data!.total}
              onPageChange={setPage}
            />
          </>
        ) : null}
      </section>

      <Modal
        open={cancelingRegistration !== null}
        onOpenChange={(open) => {
          if (!open) setCancelingRegistration(null);
        }}
        title="¿Cancelar tu registro?"
        description="Perderás tu cupo en este evento. Podrás volver a registrarte más tarde mientras haya cupo disponible."
      >
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={() => setCancelingRegistration(null)}>
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
    </div>
  );
}
