import { http } from "@/lib/http";
import type { Role, UserRead } from "@/features/auth/types";
import type { Paginated } from "@/types/api";

// §2.4 del plan: GET /admin/users es Admin-only, paginado con page/page_size.
export async function listUsers(page: number, pageSize: number): Promise<Paginated<UserRead>> {
  const { data } = await http.get<Paginated<UserRead>>("/admin/users", {
    params: { page, page_size: pageSize },
  });
  return data;
}

export async function getUser(id: number): Promise<UserRead> {
  const { data } = await http.get<UserRead>(`/admin/users/${id}`);
  return data;
}

// Espejo del body de PATCH /admin/users/{id}: ambos campos opcionales.
export interface AdminUserUpdateInput {
  role?: Role;
  is_active?: boolean;
}

// §2.4: 403 CANNOT_MODIFY_SELF si el admin autenticado intenta editarse a sí
// mismo. La UI evita disparar esta request desde el principio (controles
// deshabilitados en AdminUsersPage) en vez de confiar solo en este 403.
export async function updateUser(id: number, input: AdminUserUpdateInput): Promise<UserRead> {
  const { data } = await http.patch<UserRead>(`/admin/users/${id}`, input);
  return data;
}
