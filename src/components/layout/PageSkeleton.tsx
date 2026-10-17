import { Skeleton } from "@/components/ui/Skeleton";

/** Fallback de Suspense para las rutas con lazy loading (router.tsx). */
export function PageSkeleton() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8"
    >
      <span className="sr-only">Cargando página</span>
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}
