import CircleCheckBig from "lucide-react/dist/esm/icons/circle-check-big";
import CircleX from "lucide-react/dist/esm/icons/circle-x";
import FlagTriangleRight from "lucide-react/dist/esm/icons/flag-triangle-right";
import PencilLine from "lucide-react/dist/esm/icons/pencil-line";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import type { EventStatus } from "@/features/events/types";

interface EventStatusBadgeProps {
  status: EventStatus;
  className?: string;
}

interface StatusConfig {
  label: string;
  icon: LucideIcon;
  className: string;
}

// Color + texto/ícono siempre juntos: nunca solo color, para no depender de
// distinción cromática (requisito explícito del plan).
const STATUS_CONFIG: Record<EventStatus, StatusConfig> = {
  draft: {
    label: "Borrador",
    icon: PencilLine,
    className: "bg-gray-100 text-gray-700",
  },
  published: {
    label: "Publicado",
    icon: CircleCheckBig,
    className: "bg-green-100 text-green-700",
  },
  cancelled: {
    label: "Cancelado",
    icon: CircleX,
    className: "bg-red-100 text-red-700",
  },
  finished: {
    label: "Finalizado",
    icon: FlagTriangleRight,
    className: "bg-blue-100 text-blue-700",
  },
};

export function EventStatusBadge({ status, className }: EventStatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        config.className,
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {config.label}
    </span>
  );
}
