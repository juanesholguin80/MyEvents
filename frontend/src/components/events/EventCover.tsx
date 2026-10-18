import { useMemo } from "react";
import cover1Fallback from "@/assets/covers/cover-1.svg?w=640&format=webp";
import cover1Srcset from "@/assets/covers/cover-1.svg?w=320;640;960&format=webp&as=srcset";
import cover2Fallback from "@/assets/covers/cover-2.svg?w=640&format=webp";
import cover2Srcset from "@/assets/covers/cover-2.svg?w=320;640;960&format=webp&as=srcset";
import cover3Fallback from "@/assets/covers/cover-3.svg?w=640&format=webp";
import cover3Srcset from "@/assets/covers/cover-3.svg?w=320;640;960&format=webp&as=srcset";
import { cn } from "@/lib/cn";

interface EventCoverProps {
  eventId: number;
  className?: string;
}

interface CoverVariant {
  srcset: string;
  fallback: string;
}

// Las 3 portadas (ver §0 del plan: el backend no tiene campo de imagen en
// `Event`, así que no se inventa un endpoint de upload) se generan en build
// time por `vite-imagetools` a partir de los SVG decorativos de
// src/assets/covers/*.svg -> WebP + 3 anchos (320w/640w/960w). El índice se
// deriva de `event.id`, así que el mismo evento siempre muestra la misma
// portada (determinístico).
const COVER_VARIANTS: readonly CoverVariant[] = [
  { srcset: cover1Srcset, fallback: cover1Fallback },
  { srcset: cover2Srcset, fallback: cover2Fallback },
  { srcset: cover3Srcset, fallback: cover3Fallback },
];

/**
 * Portada decorativa y puramente presentacional (sin fetch). Usa
 * `<picture>`/`srcset` + `loading="lazy"`/`decoding="async"` para no
 * bloquear el render ni descargar más bytes de los que el viewport
 * necesita. Si en el futuro el backend agrega `Event.cover_image_url`, este
 * componente es el único punto de cambio.
 */
export function EventCover({ eventId, className }: EventCoverProps) {
  const variant = useMemo(
    () => COVER_VARIANTS[eventId % COVER_VARIANTS.length],
    [eventId],
  );

  return (
    <picture>
      <source
        type="image/webp"
        srcSet={variant.srcset}
        sizes="(min-width: 1024px) 320px, 100vw"
      />
      <img
        src={variant.fallback}
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
        className={cn("h-32 w-full rounded-md object-cover", className)}
      />
    </picture>
  );
}
