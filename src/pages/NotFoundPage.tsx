import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold text-gray-900">404 — No encontrado</h1>
      <p className="text-sm text-gray-600">
        El contenido que buscas no existe o no está disponible.
      </p>
      <Link to="/" className="text-sm font-medium text-indigo-600 hover:underline">
        Volver al inicio
      </Link>
    </div>
  );
}
