import { lazy } from "react";
import { createBrowserRouter } from "react-router-dom";
import { RootLayout } from "@/app/RootLayout";
import { RoleGuard } from "@/components/layout/RoleGuard";

// Cada entrada usa React.lazy: code-splitting real por ruta (bonus "Lazy
// loading de rutas"), con <PageSkeleton /> como fallback compartido desde
// RootLayout.
const EventsListPage = lazy(() => import("@/pages/EventsListPage"));
const EventDetailPage = lazy(() => import("@/pages/EventDetailPage"));
// EventFormPage resuelve crear/editar por sí mismo (ver EventFormPage.tsx);
// /events/new y /events/:id/edit comparten el mismo chunk perezoso.
const EventFormPage = lazy(() => import("@/pages/EventFormPage"));
// LoginPage/RegisterPage ya existían desde Fase 2 pero nunca se conectaron
// a un router real; se conectan ahora junto con la infraestructura de rutas.
const LoginPage = lazy(() => import("@/pages/LoginPage"));
const RegisterPage = lazy(() => import("@/pages/RegisterPage"));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"));

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: "/", element: <EventsListPage /> },
      { path: "/events/:id", element: <EventDetailPage /> },
      {
        // RoleGuard ya hace el check de autenticación + rol (§3 del plan).
        // El check fino de "dueño del evento concreto" para /events/:id/edit
        // vive dentro de EventFormPage, que ya tiene los datos del evento
        // cargados (defensa en profundidad, no se puede resolver aquí sin
        // duplicar la query).
        element: <RoleGuard roles={["organizador", "admin"]} />,
        children: [
          { path: "/events/new", element: <EventFormPage /> },
          { path: "/events/:id/edit", element: <EventFormPage /> },
        ],
      },
      { path: "/login", element: <LoginPage /> },
      { path: "/register", element: <RegisterPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
