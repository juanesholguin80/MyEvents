import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getUser, listUsers, updateUser } from "@/features/admin/api";
import type { AdminUserUpdateInput } from "@/features/admin/api";
import { adminUserKeys } from "@/features/admin/keys";

export function useAdminUsers(page: number, pageSize: number) {
  return useQuery({
    queryKey: adminUserKeys.list(page, pageSize),
    queryFn: () => listUsers(page, pageSize),
  });
}

export function useAdminUser(id: number) {
  return useQuery({
    queryKey: adminUserKeys.detail(id),
    queryFn: () => getUser(id),
    enabled: Number.isFinite(id),
  });
}

interface UpdateAdminUserVariables {
  id: number;
  input: AdminUserUpdateInput;
}

// §4.1 del plan: PATCH /admin/users/{id} invalida `adminUserKeys.list` en
// `onSuccess`, para que la tabla de AdminUsersPage refleje el nuevo
// rol/estado sin recargar la página.
export function useUpdateAdminUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: UpdateAdminUserVariables) => updateUser(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminUserKeys.lists() });
    },
  });
}
