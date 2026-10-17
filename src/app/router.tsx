import { lazy } from "react";
import { createBrowserRouter } from "react-router-dom";
import { RootLayout } from "@/app/RootLayout";

// Cada entrada usa React.lazy: code-splitting real por ruta (bonus "Lazy
// loading de rutas"), con <PageSkeleton /> como fallback compartido desde
// RootLayout.
const EventsListPage = lazy(() => import("@/pages/EventsListPage"));
const EventDetailPage = lazy(() => import("@/pages/EventDetailPage"));
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
      { path: "/login", element: <LoginPage /> },
      { path: "/register", element: <RegisterPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
