import { useMemo } from "react";
import { cn } from "@/lib/cn";

interface EventCoverProps {
  eventId: number;
  className?: string;
}

// Paleta fija de degradados — el índice se deriva de event.id, así que el
// mismo evento siempre muestra el mismo degradado (determinístico).
const GRADIENT_PALETTE: ReadonlyArray<readonly [string, string]> = [
  ["#6366f1", "#8b5cf6"],
  ["#06b6d4", "#3b82f6"],
  ["#f59e0b", "#ef4444"],
  ["#10b981", "#059669"],
  ["#ec4899", "#f43f5e"],
  ["#8b5cf6", "#d946ef"],
];

/**
 * Portada decorativa y determinística por evento (ver §0 del plan: el
 * backend no tiene campo de imagen en `Event`, así que no se inventa un
 * endpoint de upload). `vite-imagetools` está instalado en el proyecto, pero
 * generar el set real de placeholders en WebP + srcset es trabajo explícito
 * de Fase 9 — aquí se usa un degradado CSS simple para no adelantar ese
 * alcance. Si en el futuro el backend agrega `Event.cover_image_url`, este
 * componente es el único punto de cambio.
 */
export function EventCover({ eventId, className }: EventCoverProps) {
  const [from, to] = useMemo(
    () => GRADIENT_PALETTE[eventId % GRADIENT_PALETTE.length],
    [eventId],
  );

  return (
    <div
      aria-hidden="true"
      className={cn("h-32 w-full rounded-md", className)}
      style={{ backgroundImage: `linear-gradient(135deg, ${from}, ${to})` }}
    />
  );
}
