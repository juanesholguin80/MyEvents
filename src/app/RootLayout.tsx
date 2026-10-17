import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { PageSkeleton } from "@/components/layout/PageSkeleton";

/**
 * Layout raíz del router: Navbar (construido en Fase 2, sin usar hasta
 * ahora porque no existía router.tsx) + un único Suspense boundary
 * compartido por todas las rutas hijas con lazy loading.
 */
export function RootLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Suspense fallback={<PageSkeleton />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}
