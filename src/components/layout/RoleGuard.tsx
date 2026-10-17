import { Outlet } from "react-router-dom";
import type { Role } from "@/features/auth/types";
import { useAuthStore } from "@/features/auth/store";

interface RoleGuardProps {
  roles: Role[];
}

export function RoleGuard({ roles }: RoleGuardProps) {
  const user = useAuthStore((s) => s.user);

  if (!user || !roles.includes(user.role)) {
    return (
      <div role="alert" className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-xl font-semibold text-gray-900">403 — No autorizado</h1>
        <p className="mt-2 text-sm text-gray-600">
          No tienes permisos para ver esta página.
        </p>
      </div>
    );
  }

  return <Outlet />;
}
