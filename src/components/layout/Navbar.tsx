import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { clearSession, useAuthStore } from "@/features/auth/store";

export function Navbar() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const role = useAuthStore((s) => s.user?.role);
  const fullName = useAuthStore((s) => s.user?.full_name);

  return (
    <nav className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
      <Link to="/" className="text-lg font-semibold text-gray-900">
        Mis Eventos
      </Link>
      <div className="flex items-center gap-4">
        {isAuthenticated && (role === "organizador" || role === "admin") ? (
          <Link
            to="/events/new"
            className="text-sm font-medium text-gray-700 hover:text-indigo-600"
          >
            Crear evento
          </Link>
        ) : null}
        {isAuthenticated && role === "admin" ? (
          <Link
            to="/admin/users"
            className="text-sm font-medium text-gray-700 hover:text-indigo-600"
          >
            Admin
          </Link>
        ) : null}
        {isAuthenticated ? (
          <>
            <Link
              to="/profile"
              className="text-sm font-medium text-gray-700 hover:text-indigo-600"
            >
              {fullName}
            </Link>
            <Button variant="secondary" size="sm" onClick={clearSession}>
              Cerrar sesión
            </Button>
          </>
        ) : (
          <>
            <Link
              to="/login"
              className="text-sm font-medium text-gray-700 hover:text-indigo-600"
            >
              Iniciar sesión
            </Link>
            <Link
              to="/register"
              className="text-sm font-medium text-gray-700 hover:text-indigo-600"
            >
              Registrarse
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
