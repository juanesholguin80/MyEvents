import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAdminUsers, useUpdateAdminUser } from "@/features/admin/hooks";
import { ROLE_OPTIONS } from "@/features/admin/types";
import { useAuthStore } from "@/features/auth/store";
import type { Role, UserRead } from "@/features/auth/types";
import { messageForApiError, normalizeApiError } from "@/lib/errors";

const PAGE_SIZE = 10;

export default function AdminUsersPage() {
  const [page, setPage] = useState(1);
  // Selector granular (rerender-derived-state): solo el id del admin
  // autenticado, no el objeto `user` completo.
  const currentUserId = useAuthStore((s) => s.user?.id);

  const usersQuery = useAdminUsers(page, PAGE_SIZE);
  const updateMutation = useUpdateAdminUser();

  const users = usersQuery.data?.items ?? [];
  const hasUsers = users.length > 0;

  // §2.4 del plan: el admin autenticado no puede editarse a sí mismo. La UI
  // deshabilita los controles de la propia fila directamente en el render
  // (no solo reacciona al 403 CANNOT_MODIFY_SELF) — con el control
  // deshabilitado, ni el <Select> ni el <Button> disparan su handler, así
  // que la mutación nunca se invoca para esta fila.
  function isSelfRow(user: UserRead): boolean {
    return user.id === currentUserId;
  }

  function isRowPending(user: UserRead): boolean {
    return updateMutation.isPending && updateMutation.variables?.id === user.id;
  }

  function handleRoleChange(user: UserRead, role: Role) {
    if (isSelfRow(user) || role === user.role) return;
    updateMutation.mutate(
      { id: user.id, input: { role } },
      {
        onSuccess: () => toast.success(`Rol de ${user.full_name} actualizado.`),
        onError: (error) => toast.error(messageForApiError(normalizeApiError(error))),
      },
    );
  }

  function handleToggleActive(user: UserRead) {
    if (isSelfRow(user)) return;
    const nextActive = !user.is_active;
    updateMutation.mutate(
      { id: user.id, input: { is_active: nextActive } },
      {
        onSuccess: () =>
          toast.success(
            `${user.full_name} ahora está ${nextActive ? "activo" : "inactivo"}.`,
          ),
        onError: (error) => toast.error(messageForApiError(normalizeApiError(error))),
      },
    );
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8">
      <h1 className="text-2xl font-semibold text-gray-900">Administración de usuarios</h1>

      {usersQuery.isLoading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : null}

      {usersQuery.isError ? (
        <p role="alert" className="text-sm text-red-600">
          No se pudieron cargar los usuarios. Intenta de nuevo.
        </p>
      ) : null}

      {!usersQuery.isLoading && !usersQuery.isError && !hasUsers ? (
        <p className="text-sm text-gray-600">No hay usuarios registrados.</p>
      ) : null}

      {hasUsers ? (
        <>
          {/* Fase 9 (pasada de responsividad): la tabla de 4 columnas no
             cabe en un viewport móvil — en vez de recortarla o forzarla a
             achicarse, se permite scroll horizontal contenido dentro de
             este wrapper (el resto de la página no se desborda). */}
          <div className="overflow-x-auto">
            <table className="w-full table-auto border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500">
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Nombre
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Correo
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Rol
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const selfRow = isSelfRow(user);
                  const rowDisabled = selfRow || isRowPending(user);

                  return (
                    <tr key={user.id} className="border-b border-gray-100">
                      <td className="py-2 pr-4 text-gray-900">
                        {user.full_name}
                        {selfRow ? (
                          <span className="ml-2 rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-600">
                            Tú
                          </span>
                        ) : null}
                      </td>
                      <td className="py-2 pr-4 text-gray-600">{user.email}</td>
                      <td className="py-2 pr-4">
                        <Select
                          value={user.role}
                          onValueChange={(value) => handleRoleChange(user, value as Role)}
                          options={ROLE_OPTIONS}
                          disabled={rowDisabled}
                          aria-label={`Rol de ${user.full_name}`}
                        />
                      </td>
                      <td className="py-2 pr-4">
                        <Button
                          variant={user.is_active ? "secondary" : "danger"}
                          size="sm"
                          disabled={rowDisabled}
                          onClick={() => handleToggleActive(user)}
                        >
                          {user.is_active ? "Activo" : "Inactivo"}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination
            page={usersQuery.data!.page}
            pageSize={usersQuery.data!.page_size}
            total={usersQuery.data!.total}
            onPageChange={setPage}
          />
        </>
      ) : null}
    </div>
  );
}
